import { describe, expect, it } from "vitest";
import { Emulator } from "../../../src/terminal/emulator.js";

describe("Emulator", () => {
  it("resolves write after parsing", async () => {
    const emu = new Emulator(10, 3, 10);
    await emu.write("hello");
    expect(emu.term.buffer.active.getLine(0)?.translateToString(true)).toBe("hello");
  });

  it("tracks cursor visibility", async () => {
    const emu = new Emulator(10, 3, 10);
    expect(emu.cursorVisible).toBe(true);
    await emu.write("\x1b[?25l");
    expect(emu.cursorVisible).toBe(false);
    await emu.write("\x1b[?1049;25h");
    expect(emu.cursorVisible).toBe(true);
    await emu.write("\x1b[?25l\x1bc");
    expect(emu.cursorVisible).toBe(true);
  });

  it("reports alternate screen and modes", async () => {
    const emu = new Emulator(10, 3, 10);
    expect(emu.altScreen).toBe(false);
    await emu.write("\x1b[?1049h\x1b[?1h\x1b[?2004h");
    expect(emu.altScreen).toBe(true);
    expect(emu.applicationCursorKeys).toBe(true);
    expect(emu.bracketedPaste).toBe(true);
  });

  it("resizes", () => {
    const emu = new Emulator(10, 3, 10);
    emu.resize(30, 8);
    expect([emu.cols, emu.rows]).toEqual([30, 8]);
  });

  it("serializes the screen", async () => {
    const emu = new Emulator(10, 3, 10);
    await emu.write("\x1b[7mhi\x1b[0m");
    expect(emu.serialize()).toContain("hi");
  });
});
