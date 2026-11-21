import { EventEmitter } from "node:events";
import { createConnection, type Socket } from "node:net";
import { resolve as resolvePath } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { VERSION } from "../version.js";
import { spawnDaemon } from "./autostart.js";
import { socketPath as defaultSocketPath, logPath } from "./paths.js";
import {
  encodeMessage,
  type HelloResult,
  LineReader,
  type Method,
  type Params,
  type RpcResponse,
} from "./protocol.js";

export interface ConnectOptions {
  kind: "mcp" | "cli";
  socketPath?: string;
  autostart?: boolean;
  strictVersion?: boolean;
}

export class DaemonError extends Error {
  constructor(
    message: string,
    readonly code: number,
  ) {
    super(message);
  }
}

const CONNECT_TIMEOUT_MS = 3000;

function open(path: string): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = createConnection(path);
    socket.once("connect", () => {
      socket.off("error", reject);
      resolve(socket);
    });
    socket.once("error", reject);
  });
}

async function openWithRetry(path: string, autostart: boolean): Promise<Socket> {
  try {
    return await open(path);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (!autostart || (code !== "ENOENT" && code !== "ECONNREFUSED")) throw err;
  }
  spawnDaemon(path);
  const deadline = Date.now() + CONNECT_TIMEOUT_MS;
  let last: unknown;
  while (Date.now() < deadline) {
    await sleep(50);
    try {
      return await open(path);
    } catch (err) {
      last = err;
    }
  }
  throw new Error(
    `could not start the tui-use daemon (${(last as Error)?.message ?? "timeout"}); see ${logPath({ ...process.env, TUI_USE_SOCKET: path })}`,
  );
}

export class DaemonClient extends EventEmitter {
  private nextId = 1;
  private readonly pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();

  private constructor(private readonly socket: Socket) {
    super();
    socket.setEncoding("utf8");
    const reader = new LineReader();
    socket.on("data", (chunk: string) => reader.push(chunk, (line) => this.onLine(line)));
    socket.on("close", () => {
      for (const { reject } of this.pending.values()) {
        reject(new Error("the tui-use daemon closed the connection"));
      }
      this.pending.clear();
      this.emit("close");
    });
    socket.on("error", () => {});
  }

  static async connect(options: ConnectOptions): Promise<DaemonClient> {
    const path = options.socketPath ?? defaultSocketPath();
    const autostart = options.autostart ?? true;
    let client = new DaemonClient(await openWithRetry(path, autostart));
    let hello = await client.request<HelloResult>("hello", {
      version: VERSION,
      kind: options.kind,
    });
    if (hello.version === VERSION || options.strictVersion === false) return client;

    if (hello.sessions > 0) {
      client.close();
      throw new Error(
        `the running tui-use daemon is version ${hello.version} with ${hello.sessions} running sessions, but this client is ${VERSION}. Finish those sessions or run "tui-use kill --all", then retry.`,
      );
    }
    const closed = new Promise((r) => client.once("close", r));
    await client.request("shutdown", {});
    await closed;
    client = new DaemonClient(await openWithRetry(path, autostart));
    hello = await client.request<HelloResult>("hello", { version: VERSION, kind: options.kind });
    if (hello.version !== VERSION) {
      client.close();
      throw new Error(`daemon restarted but reports version ${hello.version}, expected ${VERSION}`);
    }
    return client;
  }

  request<T>(method: Method, params: Params<Method>): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.socket.write(encodeMessage({ jsonrpc: "2.0", id, method, params }));
    });
  }

  notify(method: Method, params: Params<Method>): void {
    this.socket.write(encodeMessage({ jsonrpc: "2.0", method, params }));
  }

  close(): void {
    this.socket.end();
  }

  private onLine(line: string): void {
    let message: RpcResponse & { method?: string; params?: unknown };
    try {
      message = JSON.parse(line);
    } catch {
      return;
    }
    if (message.method) {
      this.emit("notification", message.method, message.params);
      return;
    }
    const waiter = this.pending.get(message.id as number);
    if (!waiter) return;
    this.pending.delete(message.id as number);
    if (message.error) waiter.reject(new DaemonError(message.error.message, message.error.code));
    else waiter.resolve(message.result);
  }
}

export function startRequestEnv(extra: Record<string, string> = {}): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v;
  return { ...env, ...extra };
}

export function resolveCwd(cwd: string | undefined): string {
  return cwd ? resolvePath(process.cwd(), cwd) : process.cwd();
}

export function resolveSecret(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`secret_env ${name} is not set in the environment of this tui-use process`);
  }
  return value;
}
