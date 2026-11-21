import { deflateSync } from "node:zlib";
import { REDACTED } from "../session/secrets.js";
import type { Emulator } from "./emulator.js";
import { GLYPHS } from "./font.js";
import { CM_P16, CM_P256, CM_RGB, paletteRgb, redactRows, rowTokens } from "./render.js";

const CELL_W = 8;
const CELL_H = 16;
const DEFAULT_FG = 0xd4d4d4;
const DEFAULT_BG = 0x1e1e1e;

const glyphCache = new Map<number, Uint8Array | null>();

function glyph(codepoint: number): Uint8Array | null {
  let g = glyphCache.get(codepoint);
  if (g === undefined) {
    const data = GLYPHS[codepoint];
    g = data ? new Uint8Array(Buffer.from(data, "base64")) : null;
    glyphCache.set(codepoint, g);
  }
  return g;
}

function color(mode: number, value: number, fallback: number, bold: boolean): number {
  if (mode === CM_P16 || mode === CM_P256) return paletteRgb(bold && value < 8 ? value + 8 : value);
  if (mode === CM_RGB) return value;
  return fallback;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(data: Buffer): number {
  let c = 0xffffffff;
  for (const byte of data) c = (CRC_TABLE[(c ^ byte) & 0xff] as number) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

export function encodePng(width: number, height: number, rgb: Uint8Array): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    rgb.subarray(y * width * 3, (y + 1) * width * 3).forEach((v, i) => {
      raw[y * (width * 3 + 1) + 1 + i] = v;
    });
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export interface ScreenshotOptions {
  cursor: boolean;
  secretRanges?: (text: string) => Array<[number, number]>;
}

export function renderPng(emu: Emulator, options: ScreenshotOptions): Buffer {
  const { cols, rows } = emu;
  const width = cols * CELL_W;
  const height = rows * CELL_H;
  const pixels = new Uint8Array(width * height * 3);
  const buffer = emu.term.buffer.active;
  const cell = buffer.getNullCell();
  const perRow = Array.from({ length: rows }, (_, y) => rowTokens(emu, y));
  if (options.secretRanges) redactRows(perRow, options.secretRanges);

  const paint = (px: number, py: number, w: number, h: number, rgb: number) => {
    for (let y = py; y < py + h; y++) {
      for (let x = px; x < px + w; x++) {
        const o = (y * width + x) * 3;
        pixels[o] = (rgb >> 16) & 0xff;
        pixels[o + 1] = (rgb >> 8) & 0xff;
        pixels[o + 2] = rgb & 0xff;
      }
    }
  };
  const draw = (ch: string, px: number, py: number, w: number, fg: number) => {
    const cp = ch.codePointAt(0) ?? 32;
    if (cp === 32) return;
    const g = glyph(cp);
    if (!g) {
      paint(px + 1, py + 3, w - 2, 1, fg);
      paint(px + 1, py + 12, w - 2, 1, fg);
      paint(px + 1, py + 3, 1, 10, fg);
      paint(px + w - 2, py + 3, 1, 10, fg);
      return;
    }
    g.forEach((bits, gy) => {
      for (let gx = 0; gx < CELL_W; gx++)
        if (bits & (0x80 >> gx)) paint(px + gx, py + gy, 1, 1, fg);
    });
  };

  paint(0, 0, width, height, DEFAULT_BG);
  const showCursor = options.cursor && emu.cursorVisible && buffer.cursorX < cols;
  perRow.forEach(({ tokens }, y) => {
    const line = buffer.getLine(buffer.baseY + y);
    if (!line) return;
    for (const token of tokens) {
      line.getCell(token.x, cell);
      const bold = Boolean(cell.isBold());
      let fg = color(cell.getFgColorMode(), cell.getFgColor(), DEFAULT_FG, bold);
      let bg = color(cell.getBgColorMode(), cell.getBgColor(), DEFAULT_BG, false);
      if (cell.isInverse()) [fg, bg] = [bg, fg];
      if (showCursor && y === buffer.cursorY && token.x === buffer.cursorX) [fg, bg] = [bg, fg];
      const w = Math.max(1, cell.getWidth()) * CELL_W;
      paint(token.x * CELL_W, y * CELL_H, w, CELL_H, bg);
      const redacted = token.text === "" || token.text === REDACTED;
      draw(redacted ? "*" : ([...token.text][0] ?? " "), token.x * CELL_W, y * CELL_H, w, fg);
    }
  });
  return encodePng(width, height, pixels);
}
