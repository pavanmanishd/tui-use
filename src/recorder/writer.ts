import { closeSync, mkdirSync, openSync, writeSync } from "node:fs";
import { dirname } from "node:path";
import type { StreamRedactor } from "../session/secrets.js";

export interface RecordingHeader {
  cols: number;
  rows: number;
  command: string;
  term: string;
  shell: string;
}

export class Recorder {
  private fd: number | null;
  private readonly start = Date.now();

  constructor(
    readonly path: string,
    header: RecordingHeader,
    private readonly redactor: StreamRedactor,
  ) {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.fd = openSync(path, "w", 0o600);
    this.line({
      version: 2,
      width: header.cols,
      height: header.rows,
      timestamp: Math.floor(this.start / 1000),
      title: header.command,
      env: { TERM: header.term, SHELL: header.shell },
    });
  }

  output(data: string): void {
    const safe = this.redactor.push(data);
    if (safe) this.event("o", safe);
  }

  resize(cols: number, rows: number): void {
    this.event("r", `${cols}x${rows}`);
  }

  close(): void {
    if (this.fd === null) return;
    const rest = this.redactor.flush();
    if (rest) this.event("o", rest);
    closeSync(this.fd);
    this.fd = null;
  }

  private event(type: "o" | "r", data: string): void {
    const t = Math.round(Date.now() - this.start) / 1000;
    this.line([t, type, data]);
  }

  private line(value: unknown): void {
    if (this.fd !== null) writeSync(this.fd, `${JSON.stringify(value)}\n`);
  }
}

export function recordingName(id: string, at: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}`;
  const time = `${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}`;
  return `${date}-${time}-${id}.cast`;
}
