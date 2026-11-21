import { REDACTED } from "../session/secrets.js";
import type { Emulator } from "./emulator.js";

export type Styles = "marks" | "none";

export interface RenderOptions {
  styles: Styles;
  cursor: boolean;
  secretRanges?: (text: string) => Array<[number, number]>;
}

export interface Screen {
  rows: string[];
  cursorRow: number;
  cursorCol: number;
}

interface Token {
  text: string;
  x: number;
  marked: boolean;
}

function effectiveBackground(cell: {
  isInverse(): number;
  getBgColorMode(): number;
  getBgColor(): number;
  getFgColorMode(): number;
  getFgColor(): number;
}): string {
  return cell.isInverse()
    ? `fg:${cell.getFgColorMode()}:${cell.getFgColor()}`
    : `bg:${cell.getBgColorMode()}:${cell.getBgColor()}`;
}

interface Row {
  tokens: Token[];
  backgrounds: string[];
  wrapped: boolean;
}

function rowTokens(emu: Emulator, y: number): Row {
  const buffer = emu.term.buffer.active;
  const line = buffer.getLine(buffer.baseY + y);
  const tokens: Token[] = [];
  const backgrounds: string[] = [];
  if (!line) return { tokens, backgrounds, wrapped: false };
  const cell = buffer.getNullCell();
  for (let x = 0; x < emu.cols; x++) {
    line.getCell(x, cell);
    if (cell.getWidth() === 0) continue;
    tokens.push({ text: cell.getChars() || " ", x, marked: false });
    backgrounds.push(effectiveBackground(cell));
  }
  return { tokens, backgrounds, wrapped: line.isWrapped };
}

function redactRows(rows: Row[], secretRanges: (text: string) => Array<[number, number]>): void {
  let start = 0;
  while (start < rows.length) {
    let end = start + 1;
    while (end < rows.length && rows[end]?.wrapped) end++;
    const tokens = rows.slice(start, end).flatMap((r) => r.tokens);
    const offsets: number[] = [];
    let text = "";
    for (const t of tokens) {
      offsets.push(text.length);
      text += t.text;
    }
    for (const [from, to] of secretRanges(text)) {
      let first = true;
      tokens.forEach((t, i) => {
        const at = offsets[i] as number;
        if (at + t.text.length <= from || at >= to) return;
        t.text = first ? REDACTED : "";
        first = false;
      });
    }
    start = end;
  }
}

function majority(counts: Map<string, number>): string | undefined {
  let best: string | undefined;
  let bestCount = -1;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return best;
}

function escapeMarks(text: string): string {
  return text.replace(/[«»]/g, (c) => `\\${c}`);
}

export function renderScreen(emu: Emulator, options: RenderOptions): Screen {
  const buffer = emu.term.buffer.active;
  const cursorRow = buffer.cursorY;
  const cursorCol = Math.min(buffer.cursorX, emu.cols - 1);
  const showCursor = options.cursor && emu.cursorVisible && buffer.cursorX < emu.cols;
  const marks = options.styles === "marks";

  const perRow = Array.from({ length: emu.rows }, (_, y) => rowTokens(emu, y));
  if (options.secretRanges) redactRows(perRow, options.secretRanges);
  let baseline: string | undefined;
  if (marks) {
    const counts = new Map<string, number>();
    for (const { backgrounds } of perRow) {
      for (const bg of backgrounds) counts.set(bg, (counts.get(bg) ?? 0) + 1);
    }
    baseline = majority(counts);
  }

  const rows = perRow.map(({ tokens, backgrounds }, y) => {
    if (marks) {
      tokens.forEach((t, i) => {
        t.marked = backgrounds[i] !== baseline;
      });
    }
    const cursorIndex = showCursor && y === cursorRow ? cursorTokenIndex(tokens, cursorCol) : -1;
    return joinTokens(tokens, cursorIndex, marks);
  });
  return { rows, cursorRow: cursorRow + 1, cursorCol: cursorCol + 1 };
}

function cursorTokenIndex(tokens: Token[], col: number): number {
  for (let i = tokens.length - 1; i >= 0; i--) {
    if ((tokens[i] as Token).x <= col) return i;
  }
  return -1;
}

const blank = (t: Token) => t.text.trim() === "";

function joinTokens(tokens: Token[], cursorIndex: number, marks: boolean): string {
  let last = tokens.length - 1;
  while (last > cursorIndex) {
    const t = tokens[last] as Token;
    if (!blank(t) || t.marked) break;
    last--;
  }
  let lastMarkedText = last;
  while (lastMarkedText > cursorIndex && blank(tokens[lastMarkedText] as Token)) {
    lastMarkedText--;
  }

  let out = "";
  let open = false;
  for (let i = 0; i <= last; i++) {
    const t = tokens[i] as Token;
    if (marks && t.marked !== open) {
      out += open ? "»" : "«";
      open = t.marked;
    }
    if (open && i > lastMarkedText && i !== cursorIndex) continue;
    const text = marks && t.text !== REDACTED ? escapeMarks(t.text) : t.text;
    out += i === cursorIndex ? `[${text || " "}]` : text;
  }
  if (open) out += "»";
  if (out === "«»") out = "« »";
  return out;
}

export interface HeaderInfo {
  id: string;
  name?: string;
  command: string;
  cols: number;
  rows: number;
  cursorRow: number;
  cursorCol: number;
  altScreen: boolean;
  exitCode: number | null;
  idleMs: number;
  humanAttached: boolean;
}

export function renderHeader(h: HeaderInfo): string {
  const parts = [
    `session ${h.id}${h.name ? ` (${h.name})` : ""}`,
    h.command,
    `${h.cols}x${h.rows}`,
    `cursor ${h.cursorRow}:${h.cursorCol}`,
    h.altScreen ? "alt" : "normal",
    h.exitCode === null ? "running" : `exited ${h.exitCode}`,
    `idle ${h.idleMs}ms`,
  ];
  if (h.humanAttached) parts.push("human attached (rw)");
  return parts.join(" · ");
}

export function numberRow(n: number, total: number, text: string): string {
  return `${String(n).padStart(String(total).length)}│${text}`;
}

export function renderFull(header: string, rows: string[]): string {
  let end = rows.length;
  while (end > 0 && rows[end - 1] === "") end--;
  const lines = [header, "───"];
  for (let i = 0; i < end; i++) lines.push(numberRow(i + 1, rows.length, rows[i] as string));
  const empty = rows.length - end;
  if (empty > 0) lines.push(`…(${empty} empty line${empty === 1 ? "" : "s"})`);
  return lines.join("\n");
}
