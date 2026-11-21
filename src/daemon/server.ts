import { chmodSync, closeSync, openSync, readFileSync, rmSync, writeSync } from "node:fs";
import { createConnection, createServer, type Server, type Socket } from "node:net";
import { dirname, join } from "node:path";
import { pruneRecordings } from "../recorder/prune.js";
import { SessionManager } from "../session/manager.js";
import type { Owner, Session } from "../session/session.js";
import { VERSION } from "../version.js";
import type { Config } from "./config.js";
import { ensurePrivateDir } from "./paths.js";
import {
  type AttachResult,
  ErrorCode,
  encodeMessage,
  type HelloResult,
  LineReader,
  type Method,
  methods,
  parseParams,
  RpcError,
  type RpcRequest,
  type ScreenResult,
} from "./protocol.js";

export interface DaemonOptions {
  socketPath: string;
  config: Config;
  recordingsDir: string | null;
  idleExitMs: number;
  log?: (message: string) => void;
  onExit?: () => void;
}

export interface Daemon {
  manager: SessionManager;
  close(): Promise<void>;
}

const SWEEP_MS = 30_000;

class Connection {
  kind?: Owner["kind"];
  attachedTo?: { session: Session; detach: () => void };

  constructor(
    readonly id: string,
    readonly socket: Socket,
  ) {}

  get owner(): Owner {
    return { id: this.id, kind: this.kind ?? "cli" };
  }

  get viewer(): string {
    return this.kind === "mcp" ? this.id : "cli";
  }

  send(message: unknown): void {
    if (!this.socket.destroyed) this.socket.write(encodeMessage(message));
  }
}

function isAlive(path: string): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = createConnection(path);
    probe.once("connect", () => {
      probe.destroy();
      resolve(true);
    });
    probe.once("error", () => resolve(false));
  });
}

function listen(server: Server, path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (err: Error) => {
      server.off("listening", onListening);
      reject(err);
    };
    const onListening = () => {
      server.off("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(path);
  });
}

export class DaemonAlreadyRunning extends Error {}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === "EPERM";
  }
}

function acquireLock(path: string): () => void {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const fd = openSync(path, "wx", 0o600);
      writeSync(fd, String(process.pid));
      closeSync(fd);
      return () => rmSync(path, { force: true });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
      const holder = Number(readFileSync(path, "utf8"));
      if (holder && processAlive(holder)) {
        throw new DaemonAlreadyRunning(`a daemon (pid ${holder}) already owns ${dirname(path)}`);
      }
      rmSync(path, { force: true });
    }
  }
  throw new DaemonAlreadyRunning(`could not take the daemon lock ${path}`);
}

export async function startDaemon(options: DaemonOptions): Promise<Daemon> {
  const log = options.log ?? (() => {});
  ensurePrivateDir(dirname(options.socketPath));
  const releaseLock = acquireLock(join(dirname(options.socketPath), "daemon.lock"));
  if (options.recordingsDir && options.config.recordings) {
    for (const path of pruneRecordings(
      options.recordingsDir,
      options.config.recordingRetentionDays,
    )) {
      log(`pruned ${path}`);
    }
  }

  const manager = new SessionManager(options.config, options.recordingsDir);
  const connections = new Set<Connection>();
  let nextConnection = 1;
  let idleSince = Date.now();
  let closing = false;

  const server = createServer((socket) => {
    const conn = new Connection(`c${nextConnection++}`, socket);
    connections.add(conn);
    socket.setEncoding("utf8");
    const reader = new LineReader();
    socket.on("data", (chunk: string) => reader.push(chunk, (line) => void handleLine(conn, line)));
    socket.on("error", () => {});
    socket.on("close", () => {
      connections.delete(conn);
      conn.attachedTo?.detach();
      if (conn.kind === "mcp") {
        manager.forgetViewer(conn.viewer);
        manager.ownerClosed(conn.id).catch((err) => log(`cleanup failed: ${err}`));
      }
      if (connections.size === 0) idleSince = Date.now();
    });
  });

  async function handleLine(conn: Connection, line: string): Promise<void> {
    let request: RpcRequest;
    try {
      request = JSON.parse(line);
    } catch {
      conn.send({
        jsonrpc: "2.0",
        id: null,
        error: { code: ErrorCode.parse, message: "parse error" },
      });
      return;
    }
    if (
      typeof request !== "object" ||
      request === null ||
      Array.isArray(request) ||
      !(
        request.id === undefined ||
        typeof request.id === "string" ||
        typeof request.id === "number"
      )
    ) {
      conn.send({
        jsonrpc: "2.0",
        id: null,
        error: { code: ErrorCode.invalidRequest, message: "invalid request" },
      });
      return;
    }
    const id = request.id ?? null;
    try {
      if (closing) throw new Error("the tui-use daemon is shutting down; retry");
      if (typeof request.method !== "string" || !Object.hasOwn(methods, request.method)) {
        throw new RpcError(ErrorCode.methodNotFound, `unknown method ${String(request.method)}`);
      }
      const method = request.method as Method;
      if (method !== "hello" && conn.kind === undefined) {
        throw new RpcError(ErrorCode.invalidRequest, "send hello first");
      }
      const result = await dispatch(conn, method, request.params);
      if (id !== null) conn.send({ jsonrpc: "2.0", id, result });
    } catch (err) {
      const code = err instanceof RpcError ? err.code : ErrorCode.app;
      if (!(err instanceof RpcError)) log(`${request.method} failed: ${(err as Error).stack}`);
      if (id !== null) {
        conn.send({ jsonrpc: "2.0", id, error: { code, message: (err as Error).message } });
      }
    }
  }

  async function screen(
    viewer: string,
    session: Session,
    mode: "full" | "diff",
    styles: "marks" | "none",
    extra: Partial<ScreenResult> = {},
  ): Promise<ScreenResult> {
    const text = await session.snapshot(mode, styles, viewer);
    return {
      session: session.id,
      text,
      state: session.running ? "running" : "exited",
      exit_code: session.exitCode,
      ...extra,
    };
  }

  function controlled(conn: Connection, ref: string): Session {
    const session = manager.get(ref);
    manager.assertControl(session, conn.owner);
    return session;
  }

  async function dispatch(conn: Connection, method: Method, raw: unknown): Promise<unknown> {
    switch (method) {
      case "hello": {
        const p = parseParams("hello", raw);
        if (conn.kind !== undefined) throw new Error("hello was already sent on this connection");
        conn.kind = p.kind;
        return { version: VERSION, sessions: manager.runningCount } satisfies HelloResult;
      }
      case "start": {
        const p = parseParams("start", raw);
        const session = manager.start(p, conn.owner);
        const outcome = await session.wait(p.wait);
        return screen(conn.viewer, session, "full", "marks", outcome);
      }
      case "send": {
        const p = parseParams("send", raw);
        const session = controlled(conn, p.session);
        const before = session.outputChunks;
        session.send(p.input);
        const outcome = await session.wait(p.wait, before);
        return screen(conn.viewer, session, p.mode, p.styles, outcome);
      }
      case "snapshot": {
        const p = parseParams("snapshot", raw);
        return screen(conn.viewer, manager.get(p.session), p.mode, p.styles);
      }
      case "wait": {
        const p = parseParams("wait", raw);
        const session = manager.get(p.session);
        const outcome = await session.wait(p.wait);
        return screen(conn.viewer, session, p.mode, p.styles, outcome);
      }
      case "scrollback": {
        const p = parseParams("scrollback", raw);
        const session = manager.get(p.session);
        return { session: session.id, text: await session.scrollback(p) };
      }
      case "list":
        parseParams("list", raw);
        return { sessions: manager.list() };
      case "kill": {
        const p = parseParams("kill", raw);
        if (p.all) {
          if (conn.owner.kind !== "cli") {
            throw new Error("kill --all is only available from the tui-use CLI");
          }
          const ids = manager.list().map((s) => s.id);
          await manager.killAll();
          return { killed: ids };
        }
        const session = controlled(conn, p.session as string);
        await manager.kill(session, p.signal as NodeJS.Signals | undefined);
        return { killed: [session.id], exit_code: session.exitCode };
      }
      case "resize": {
        const p = parseParams("resize", raw);
        const session = controlled(conn, p.session);
        session.resize(p.cols, p.rows);
        await session.wait({ idle_ms: 100, timeout_ms: 1000 });
        return screen(conn.viewer, session, "full", "marks");
      }
      case "recording": {
        const p = parseParams("recording", raw);
        const session = manager.get(p.session);
        if (!session.recordingPath) {
          throw new Error('recordings are off; set "recordings": true in the tui-use config');
        }
        return { session: session.id, path: session.recordingPath };
      }
      case "attach": {
        const p = parseParams("attach", raw);
        if (conn.kind !== "cli") throw new Error("attach is only available from the tui-use CLI");
        return attach(conn, manager.get(p.session));
      }
      case "input": {
        const p = parseParams("input", raw);
        if (!conn.attachedTo) throw new Error("not attached to a session");
        conn.attachedTo.session.writeRaw(p.data);
        return { ok: true };
      }
      case "shutdown": {
        parseParams("shutdown", raw);
        if (manager.runningCount > 0) {
          throw new Error(`daemon has ${manager.runningCount} running sessions; kill them first`);
        }
        setImmediate(() => void close());
        return { ok: true };
      }
    }
  }

  function attach(conn: Connection, session: Session): AttachResult {
    if (conn.attachedTo) throw new Error("already attached");
    const onData = (data: string) =>
      conn.send({ jsonrpc: "2.0", method: "output", params: { data } });
    const onExit = (code: number) => {
      conn.send({ jsonrpc: "2.0", method: "exit", params: { code } });
    };
    session.on("output", onData);
    session.once("exit", onExit);
    session.attached++;
    conn.attachedTo = {
      session,
      detach: () => {
        session.off("output", onData);
        session.off("exit", onExit);
        session.attached--;
        conn.attachedTo = undefined;
      },
    };
    return {
      session: session.id,
      cols: session.cols,
      rows: session.rows,
      screen: session.serialize(),
      exit_code: session.exitCode,
    };
  }

  try {
    await listen(server, options.socketPath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "EADDRINUSE") {
      releaseLock();
      throw err;
    }
    if (await isAlive(options.socketPath)) {
      releaseLock();
      throw new DaemonAlreadyRunning(`a daemon is already listening on ${options.socketPath}`);
    }
    rmSync(options.socketPath, { force: true });
    await listen(server, options.socketPath);
  }
  chmodSync(options.socketPath, 0o600);
  log(`tui-use daemon ${VERSION} listening on ${options.socketPath}`);

  const sweep = setInterval(
    () => {
      manager.sweepIdle().catch((err) => log(`idle sweep failed: ${err}`));
      const quiet = manager.runningCount === 0 && connections.size === 0;
      if (!quiet) idleSince = Date.now();
      else if (Date.now() - idleSince >= options.idleExitMs) void close();
    },
    Math.min(SWEEP_MS, options.idleExitMs),
  );

  async function close(): Promise<void> {
    if (closing) return;
    closing = true;
    clearInterval(sweep);
    const stopped = new Promise<void>((resolve) => server.close(() => resolve()));
    await manager.killAll();
    for (const conn of connections) conn.socket.destroy();
    await stopped;
    rmSync(options.socketPath, { force: true });
    releaseLock();
    log("tui-use daemon stopped");
    options.onExit?.();
  }

  return { manager, close };
}
