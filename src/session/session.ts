import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";
import { setTimeout as sleep } from "node:timers/promises";
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
// node-pty can report exit before the last output chunk is delivered.
const EXIT_SETTLE_MS = 30;

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
  outputChunks = 0;

  private readonly emulator: Emulator;
  private readonly pty: Pty;
  private readonly recorder?: Recorder;
  private readonly frames = new Map<string, Frame>();
  private readonly exitPromise: Promise<void>;

  constructor(options: SessionOptions) {
    super();
    this.setMaxListeners(100);
    this.id = options.id;
    this.name = options.name;
    this.command = options.command;
    this.cwd = options.cwd;
    this.owner = options.owner;
    this.emulator = new Emulator(options.cols, options.rows, options.scrollback);
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
    try {
      this.pty = spawnPty(options);
    } catch (err) {
      this.recorder?.close();
      throw err;
    }

    this.pty.onData((data) => {
      this.lastOutputAt = Date.now();
      this.hasOutput = true;
      this.outputChunks++;
      this.recorder?.output(data);
      void this.emulator.write(data).then(() => {
        this.emit("output", data);
        this.emit("parsed");
      });
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
        }, EXIT_SETTLE_MS);
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

  private encode(items: InputItem[]): string {
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

  async snapshot(mode: SnapshotMode, styles: Styles, viewer = "default"): Promise<string> {
    await this.emulator.drained();
    const screen = renderScreen(this.emulator, {
      styles,
      cursor: true,
      secretRanges: (t) => this.redactor.ranges(t),
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
      mode === "diff"
        ? renderDiff(header, frame, this.frames.get(viewer))
        : renderFull(header, frame.rows);
    this.frames.set(viewer, frame);
    return text;
  }

  async screenText(): Promise<string> {
    await this.emulator.drained();
    const screen = renderScreen(this.emulator, {
      styles: "none",
      cursor: false,
      secretRanges: (t) => this.redactor.ranges(t),
    });
    return screen.rows.join("\n");
  }

  async wait(spec: WaitSpec | undefined, afterChunk?: number): Promise<WaitOutcome> {
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
      let idleTimer: NodeJS.Timeout | undefined;
      const finish = (outcome: WaitOutcome) => {
        if (done) return;
        done = true;
        clearTimeout(deadline);
        clearTimeout(idleTimer);
        this.off("parsed", check);
        this.off("exit", check);
        resolve(outcome);
      };
      const check = async () => {
        if (done) return;
        try {
          const screen = await this.screenText();
          if (done) return;
          const reacted =
            afterChunk === undefined || this.outputChunks > afterChunk || !this.running;
          const fired = reacted
            ? firedCondition(wait, {
                screen,
                exited: !this.running,
                outputIdleMs: Date.now() - Math.max(this.lastOutputAt, this.lastInputAt),
              })
            : null;
          if (fired) finish({ fired, timed_out: false });
          else if (wait.idleMs !== undefined) {
            clearTimeout(idleTimer);
            const due = Math.max(1, this.lastOutputAt + wait.idleMs - Date.now());
            idleTimer = setTimeout(check, due);
          }
        } catch {
          finish({ timed_out: true });
        }
      };
      const deadline = setTimeout(() => finish({ timed_out: true }), wait.timeoutMs);
      this.on("parsed", check);
      this.on("exit", check);
      void check();
    });
  }

  async scrollbackLines(): Promise<string[]> {
    await this.emulator.drained();
    const buffer = this.emulator.term.buffer.normal;
    const lines: string[] = [];
    for (let i = 0; i < buffer.length; i++) {
      const line = buffer.getLine(i);
      if (!line) continue;
      const continues = buffer.getLine(i + 1)?.isWrapped ?? false;
      const text = line.translateToString(!continues);
      if (line.isWrapped && lines.length > 0) lines[lines.length - 1] += text;
      else lines.push(text);
    }
    return trimTrailingBlank(lines.map((l) => this.redactor.redact(l)));
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

  forgetViewer(viewer: string): void {
    this.frames.delete(viewer);
  }

  serialize(): string {
    return this.emulator.serialize();
  }

  async kill(signal: NodeJS.Signals = "SIGTERM"): Promise<void> {
    if (!this.running) return;
    this.signalGroup(signal);
    const deadline = Date.now() + KILL_GRACE_MS;
    while (Date.now() < deadline && (this.running || this.groupAlive())) await sleep(50);
    if (this.running || this.groupAlive()) this.signalGroup("SIGKILL");
    await this.exitPromise;
  }

  private groupAlive(): boolean {
    try {
      process.kill(-this.pty.pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  private signalGroup(signal: NodeJS.Signals): void {
    try {
      process.kill(-this.pty.pid, signal);
    } catch {}
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
