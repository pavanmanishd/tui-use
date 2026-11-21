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
  weak?: boolean;
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

export interface Row {
  tokens: Token[];
  backgrounds: string[];
  wrapped: boolean;
}

export function rowTokens(emu: Emulator, y: number): Row {
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

export function redactRows(
  rows: Row[],
  secretRanges: (text: string) => Array<[number, number]>,
): void {
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
  return text.replace(/[«»‹›]/g, (c) => `\\${c}`);
}

export const CM_P16 = 0x1000000;
export const CM_P256 = 0x2000000;
export const CM_RGB = 0x3000000;
const ANSI16 = [
  0x000000, 0xcd0000, 0x00cd00, 0xcdcd00, 0x0000ee, 0xcd00cd, 0x00cdcd, 0xe5e5e5, 0x7f7f7f,
  0xff0000, 0x00ff00, 0xffff00, 0x5c5cff, 0xff00ff, 0x00ffff, 0xffffff,
];

export function paletteRgb(index: number): number {
  if (index < 16) return ANSI16[index] as number;
  if (index < 232) {
    const steps = [0, 95, 135, 175, 215, 255];
    const i = index - 16;
    return (
      ((steps[Math.floor(i / 36)] as number) << 16) |
      ((steps[Math.floor(i / 6) % 6] as number) << 8) |
      (steps[i % 6] as number)
    );
  }
  const gray = 8 + (index - 232) * 10;
  return (gray << 16) | (gray << 8) | gray;
}

function luminance(key: string): number {
  const [kind, modeText, colorText] = key.split(":");
  const mode = Number(modeText);
  let rgb: number;
  if (mode === CM_P16 || mode === CM_P256) rgb = paletteRgb(Number(colorText));
  else if (mode === CM_RGB) rgb = Number(colorText);
  else return kind === "fg" ? 0.9 : 0;
  const channel = (shift: number) => ((rgb >> shift) & 0xff) / 255;
  return 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);
}

function weakenFainterHighlights(tokens: Token[], backgrounds: string[], baseline: string): void {
  const keys = new Set(backgrounds.filter((_, i) => (tokens[i] as Token).marked));
  if (keys.size < 2) return;
  const base = luminance(baseline);
  const contrast = new Map([...keys].map((k) => [k, Math.abs(luminance(k) - base)]));
  const strongest = Math.max(...contrast.values());
  tokens.forEach((t, i) => {
    if (t.marked) t.weak = (contrast.get(backgrounds[i] as string) as number) < strongest;
  });
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
      weakenFainterHighlights(tokens, backgrounds, baseline as string);
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
  if (marks && tokens.some((t) => !blank(t))) unmarkGutter(tokens);

  const CLOSE = { strong: "»", weak: "›" } as const;
  const OPEN = { strong: "«", weak: "‹" } as const;
  let out = "";
  let open: "strong" | "weak" | null = null;
  for (let i = 0; i <= last; i++) {
    const t = tokens[i] as Token;
    const style = marks && t.marked ? (t.weak ? "weak" : "strong") : null;
    if (style !== open) {
      if (open) out += CLOSE[open];
      if (style) out += OPEN[style];
      open = style;
    }
    if (open && i > lastMarkedText && i !== cursorIndex) continue;
    const text = marks && t.text !== REDACTED ? escapeMarks(t.text) : t.text;
    out += i === cursorIndex ? `[${text || " "}]` : text;
  }
  if (open) out += CLOSE[open];
  if (out === "«»") out = "« »";
  if (out === "‹›") out = "‹ ›";
  return out;
}

function unmarkGutter(tokens: Token[]): void {
  let end = 0;
  while (end < tokens.length && (tokens[end] as Token).marked) end++;
  const gutter = tokens.slice(0, end);
  if (gutter.every(blank)) {
    for (const t of gutter) t.marked = false;
  }
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

const MIN_REPEAT = 3;

export function numberRows(indices: number[], rows: string[]): string[] {
  const total = rows.length;
  const lines: string[] = [];
  let k = 0;
  while (k < indices.length) {
    const i = indices[k] as number;
    let j = k;
    while (
      j + 1 < indices.length &&
      indices[j + 1] === (indices[j] as number) + 1 &&
      rows[indices[j + 1] as number] === rows[i]
    ) {
      j++;
    }
    lines.push(numberRow(i + 1, total, rows[i] as string));
    if (j - k + 1 >= MIN_REPEAT) {
      lines.push(`…(rows ${i + 2}-${(indices[j] as number) + 1} same as row ${i + 1})`);
      k = j + 1;
    } else {
      k++;
    }
  }
  return lines;
}

export function renderFull(header: string, rows: string[]): string {
  let end = rows.length;
  while (end > 0 && rows[end - 1] === "") end--;
  const indices = Array.from({ length: end }, (_, i) => i);
  const lines = [header, "───", ...numberRows(indices, rows)];
  const empty = rows.length - end;
  if (empty > 0) lines.push(`…(${empty} empty line${empty === 1 ? "" : "s"})`);
  return lines.join("\n");
}
