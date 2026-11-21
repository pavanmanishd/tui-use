import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { encodeKey, encodePaste, encodeText } from "../keys/encode.js";
import { parseKey } from "../keys/grammar.js";
import { type Pty, spawnPty } from "../pty/spawn.js";
import { Recorder } from "../recorder/writer.js";
import { type Frame, renderDiff } from "../terminal/diff.js";
import { Emulator } from "../terminal/emulator.js";
import { renderFull, renderHeader, renderScreen, type Styles } from "../terminal/render.js";
import {
  formatLines,
  type NumberedLine,
  readRange,
  search as searchLines,
  trimTrailingBlank,
} from "./scrollback.js";
import { Redactor } from "./secrets.js";
import { settle } from "./settle.js";
import { type Condition, firedCondition, normalizeWait, type WaitSpec } from "./wait.js";

export type OwnerKind = "mcp" | "cli";

export interface Owner {
  id: string;
  kind: OwnerKind;
}

export type InputItem = { text: string } | { key: string } | { paste: string } | { secret: string };

export type SnapshotMode = "full" | "diff";

export interface SessionOptions {
  id: string;
  name?: string;
  command: string;
  cwd: string;
  env: Record<string, string>;
  cols: number;
  rows: number;
  scrollback: number;
  recordingPath?: string;
  owner: Owner;
}

export interface WaitOutcome {
  settled?: boolean;
  fired?: Condition;
  timed_out: boolean;
}

export interface SessionInfo {
  id: string;
  name?: string;
  command: string;
  cwd: string;
  cols: number;
  rows: number;
  state: "running" | "exited";
  exit_code: number | null;
  idle_ms: number;
  created_at: string;
  owner: OwnerKind;
}

export const KILL_GRACE_MS = 2000;

export class Session extends EventEmitter {
  readonly id: string;
  readonly name?: string;
  readonly command: string;
  readonly cwd: string;
  readonly owner: Owner;
  readonly createdAt = new Date();
  readonly redactor = new Redactor();
  readonly recordingPath?: string;

  exitCode: number | null = null;
  exitedAt: number | null = null;
  lastOutputAt = Date.now();
  lastInputAt = Date.now();
  attached = 0;
  hasOutput = false;

  private readonly emulator: Emulator;
  private readonly pty: Pty;
  private readonly recorder?: Recorder;
  private lastFrame?: Frame;
  private readonly exitPromise: Promise<void>;

  constructor(options: SessionOptions) {
    super();
    this.setMaxListeners(0);
    this.id = options.id;
    this.name = options.name;
    this.command = options.command;
    this.cwd = options.cwd;
    this.owner = options.owner;
    this.emulator = new Emulator(options.cols, options.rows, options.scrollback);
    this.pty = spawnPty(options);
    if (options.recordingPath) {
      this.recordingPath = options.recordingPath;
      this.recorder = new Recorder(
        options.recordingPath,
        {
          cols: options.cols,
          rows: options.rows,
          command: options.command,
          term: "xterm-256color",
          shell: options.env.SHELL || "/bin/sh",
        },
        this.redactor.stream(),
      );
    }

    this.pty.onData((data) => {
      this.lastOutputAt = Date.now();
      this.hasOutput = true;
      this.recorder?.output(data);
      this.emit("data", data);
      void this.emulator.write(data).then(() => this.emit("parsed"));
    });

    this.exitPromise = new Promise((resolve) => {
      this.pty.onExit(({ exitCode, signal }) => {
        setTimeout(async () => {
          await this.emulator.drained();
          this.exitCode = signal ? 128 + signal : exitCode;
          this.exitedAt = Date.now();
          this.recorder?.close();
          this.emit("exit", this.exitCode);
          resolve();
        }, 30);
      });
    });
  }

  get running(): boolean {
    return this.exitCode === null;
  }

  get cols(): number {
    return this.emulator.cols;
  }

  get rows(): number {
    return this.emulator.rows;
  }

  get pid(): number {
    return this.pty.pid;
  }

  info(): SessionInfo {
    return {
      id: this.id,
      name: this.name,
      command: this.command,
      cwd: this.cwd,
      cols: this.cols,
      rows: this.rows,
      state: this.running ? "running" : "exited",
      exit_code: this.exitCode,
      idle_ms: Date.now() - this.lastOutputAt,
      created_at: this.createdAt.toISOString(),
      owner: this.owner.kind,
    };
  }

  encode(items: InputItem[]): string {
    let out = "";
    for (const item of items) {
      if ("key" in item) {
        out += encodeKey(parseKey(item.key), {
          applicationCursorKeys: this.emulator.applicationCursorKeys,
        });
      } else if ("text" in item) {
        out += encodeText(item.text);
      } else if ("paste" in item) {
        out += encodePaste(item.paste, this.emulator.bracketedPaste);
      } else {
        out += item.secret;
      }
    }
    return out;
  }

  send(items: InputItem[]): void {
    this.assertRunning();
    const data = this.encode(items);
    for (const item of items) if ("secret" in item) this.redactor.add(item.secret);
    this.writeRaw(data);
  }

  writeRaw(data: string): void {
    this.assertRunning();
    this.lastInputAt = Date.now();
    if (data) this.pty.write(data);
  }

  async snapshot(mode: SnapshotMode, styles: Styles): Promise<string> {
    await this.emulator.drained();
    const screen = renderScreen(this.emulator, {
      styles,
      cursor: true,
      redact: (t) => this.redactor.redact(t),
    });
    const header = renderHeader({
      id: this.id,
      name: this.name,
      command: this.command,
      cols: this.cols,
      rows: this.rows,
      cursorRow: screen.cursorRow,
      cursorCol: screen.cursorCol,
      altScreen: this.emulator.altScreen,
      exitCode: this.exitCode,
      idleMs: Date.now() - this.lastOutputAt,
      humanAttached: this.attached > 0,
    });
    const frame = { cols: this.cols, rows: screen.rows };
    const text =
      mode === "diff" ? renderDiff(header, frame, this.lastFrame) : renderFull(header, frame.rows);
    this.lastFrame = frame;
    return text;
  }

  async screenText(): Promise<string> {
    await this.emulator.drained();
    const screen = renderScreen(this.emulator, {
      styles: "none",
      cursor: false,
      redact: (t) => this.redactor.redact(t),
    });
    return screen.rows.join("\n");
  }

  async wait(spec: WaitSpec | undefined): Promise<WaitOutcome> {
    const wait = normalizeWait(spec);
    if (wait.settle) {
      const settled = await settle({
        idleMs: wait.settleIdleMs,
        timeoutMs: wait.timeoutMs,
        lastActivity: () => Math.max(this.lastOutputAt, this.lastInputAt),
        screenHash: async () =>
          createHash("sha1")
            .update(await this.screenText())
            .digest("hex"),
        exited: () => !this.running,
        started: () => this.hasOutput,
      });
      return { settled, timed_out: !settled };
    }

    return new Promise<WaitOutcome>((resolve) => {
      let done = false;
      const timers: NodeJS.Timeout[] = [];
      const finish = (outcome: WaitOutcome) => {
        if (done) return;
        done = true;
        for (const t of timers) clearTimeout(t);
        this.off("parsed", check);
        this.off("exit", check);
        resolve(outcome);
      };
      const check = async () => {
        const screen = await this.screenText();
        const fired = firedCondition(wait, {
          screen,
          exited: !this.running,
          outputIdleMs: Date.now() - this.lastOutputAt,
        });
        if (fired) finish({ fired, timed_out: false });
        else if (wait.idleMs !== undefined) scheduleIdleCheck();
      };
      const scheduleIdleCheck = () => {
        const idleMs = wait.idleMs as number;
        const due = Math.max(1, this.lastOutputAt + idleMs - Date.now());
        timers.push(setTimeout(check, due));
      };
      this.on("parsed", check);
      this.on("exit", check);
      timers.push(setTimeout(() => finish({ timed_out: true }), wait.timeoutMs));
      void check();
    });
  }

  async scrollbackLines(): Promise<string[]> {
    await this.emulator.drained();
    const buffer = this.emulator.term.buffer.normal;
    const lines: string[] = [];
    for (let i = 0; i < buffer.length; i++) {
      lines.push(this.redactor.redact(buffer.getLine(i)?.translateToString(true) ?? ""));
    }
    return trimTrailingBlank(lines);
  }

  async scrollback(query: { lines?: [number, number]; search?: string }): Promise<string> {
    const lines = await this.scrollbackLines();
    const total = lines.length;
    const header = `session ${this.id} · scrollback · ${total} lines`;
    if (query.search !== undefined) {
      const blocks = searchLines(lines, query.search);
      if (blocks.length === 0)
        return `${header}\n───\n(no matches for ${JSON.stringify(query.search)})`;
      return `${header}\n───\n${blocks.map((b) => formatLines(b, total)).join("\n--\n")}`;
    }
    const [from, to] = query.lines ?? [-40, -1];
    const range: NumberedLine[] = readRange(lines, from, to);
    if (range.length === 0) return `${header}\n───\n(no lines in range ${from}..${to})`;
    return `${header}\n───\n${formatLines(range, total)}`;
  }

  resize(cols: number, rows: number): void {
    this.emulator.resize(cols, rows);
    if (this.running) this.pty.resize(cols, rows);
    this.recorder?.resize(cols, rows);
  }

  serialize(): string {
    return this.emulator.serialize();
  }

  async kill(signal: NodeJS.Signals = "SIGTERM"): Promise<void> {
    if (!this.running) return;
    this.signal(signal);
    const grace = setTimeout(() => {
      if (this.running) this.signal("SIGKILL");
    }, KILL_GRACE_MS);
    await this.exitPromise;
    clearTimeout(grace);
  }

  private signal(signal: NodeJS.Signals): void {
    try {
      process.kill(-this.pty.pid, signal);
    } catch {
      this.pty.kill(signal);
    }
  }

  exited(): Promise<void> {
    return this.exitPromise;
  }

  dispose(): void {
    this.emulator.dispose();
  }

  private assertRunning(): void {
    if (!this.running) {
      throw new Error(`session ${this.id} has exited (code ${this.exitCode}); start a new one`);
    }
  }
}
