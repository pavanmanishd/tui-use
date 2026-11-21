import type { Emulator } from "./emulator.js";

export type Styles = "marks" | "none";

export interface RenderOptions {
  styles: Styles;
  cursor: boolean;
  redact?: (text: string) => string;
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

function rowTokens(emu: Emulator, y: number): { tokens: Token[]; backgrounds: string[] } {
  const buffer = emu.term.buffer.active;
  const line = buffer.getLine(buffer.baseY + y);
  const tokens: Token[] = [];
  const backgrounds: string[] = [];
  if (!line) return { tokens, backgrounds };
  const cell = buffer.getNullCell();
  for (let x = 0; x < emu.cols; x++) {
    line.getCell(x, cell);
    if (cell.getWidth() === 0) continue;
    tokens.push({ text: cell.getChars() || " ", x, marked: false });
    backgrounds.push(effectiveBackground(cell));
  }
  return { tokens, backgrounds };
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
  const cursorCol = buffer.cursorX;
  const showCursor = options.cursor && emu.cursorVisible && cursorCol < emu.cols;
  const marks = options.styles === "marks";

  const perRow = Array.from({ length: emu.rows }, (_, y) => rowTokens(emu, y));
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
    return joinTokens(tokens, cursorIndex, marks, options.redact);
  });
  return { rows, cursorRow: cursorRow + 1, cursorCol: cursorCol + 1 };
}

function cursorTokenIndex(tokens: Token[], col: number): number {
  for (let i = tokens.length - 1; i >= 0; i--) {
    if ((tokens[i] as Token).x <= col) return i;
  }
  return -1;
}

function joinTokens(
  tokens: Token[],
  cursorIndex: number,
  marks: boolean,
  redact?: (text: string) => string,
): string {
  let last = tokens.length - 1;
  while (last > cursorIndex) {
    const t = tokens[last] as Token;
    if (t.text !== " " || t.marked) break;
    last--;
  }
  let lastMarkedText = last;
  while (lastMarkedText > cursorIndex && (tokens[lastMarkedText] as Token).text === " ") {
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
    const text = marks ? escapeMarks(t.text) : t.text;
    out += i === cursorIndex ? `[${text}]` : text;
  }
  if (open) out += "»";
  if (out === "«»") out = "« »";
  return redact ? redact(out) : out;
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
