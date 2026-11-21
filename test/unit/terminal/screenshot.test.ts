import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { Emulator } from "../../../src/terminal/emulator.js";
import { encodePng, renderPng } from "../../../src/terminal/screenshot.js";

function parse(png: Buffer) {
  expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  let offset = 8;
  const idat: Buffer[] = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString("ascii");
    if (type === "IDAT") idat.push(png.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const pixel = (x: number, y: number) => {
    const o = y * (width * 3 + 1) + 1 + x * 3;
    return (raw[o]! << 16) | (raw[o + 1]! << 8) | raw[o + 2]!;
  };
  return { width, height, pixel, raw };
}

describe("encodePng", () => {
  it("writes a valid RGB PNG", () => {
    const rgb = new Uint8Array([255, 0, 0, 0, 255, 0]);
    const { width, height, pixel } = parse(encodePng(2, 1, rgb));
    expect([width, height]).toEqual([2, 1]);
    expect(pixel(0, 0)).toBe(0xff0000);
    expect(pixel(1, 0)).toBe(0x00ff00);
  });
});

describe("renderPng", () => {
  it("draws 8x16 cells with their background colours", async () => {
    const emu = new Emulator(10, 2, 10);
    await emu.write("\x1b[44m  \x1b[0mA");
    const { width, height, pixel } = parse(renderPng(emu, { cursor: false }));
    expect([width, height]).toEqual([80, 32]);
    expect(pixel(4, 8)).toBe(0x0000ee);
    expect(pixel(79, 31)).toBe(0x1e1e1e);
  });

  it("draws glyph pixels in the foreground colour", async () => {
    const emu = new Emulator(2, 1, 10);
    await emu.write("\x1b[38;2;255;0;0m█");
    const { pixel } = parse(renderPng(emu, { cursor: false }));
    expect(pixel(3, 8)).toBe(0xff0000);
  });

  it("renders a secret the same as asterisks", async () => {
    const shot = async (text: string, secret?: string) => {
      const emu = new Emulator(12, 1, 10);
      await emu.write(text);
      return renderPng(emu, {
        cursor: false,
        secretRanges: secret
          ? (t) =>
              t.includes(secret) ? [[t.indexOf(secret), t.indexOf(secret) + secret.length]] : []
          : undefined,
      });
    };
    expect((await shot("pw hunter2", "hunter2")).equals(await shot("pw *******"))).toBe(true);
  });
});
