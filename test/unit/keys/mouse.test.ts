import { describe, expect, it } from "vitest";
import { encodeMouse, type MouseInput, type MouseModes } from "../../../src/keys/mouse.js";

const sgr = { tracking: true, sgr: true, releases: true };
const legacy = { tracking: true, sgr: false, releases: true };
const screen = { cols: 200, rows: 100 };
const encode = (input: MouseInput, modes: MouseModes) => encodeMouse(input, modes, screen);

describe("encodeMouse", () => {
  it("encodes an SGR click as press and release", () => {
    expect(encode({ action: "click", row: 5, col: 12 }, sgr)).toBe("\x1b[<0;12;5M\x1b[<0;12;5m");
  });

  it("encodes right clicks, double clicks and scrolls", () => {
    expect(encode({ action: "right_click", row: 1, col: 1 }, sgr)).toBe("\x1b[<2;1;1M\x1b[<2;1;1m");
    expect(encode({ action: "double_click", row: 2, col: 3 }, sgr)).toBe(
      "\x1b[<0;3;2M\x1b[<0;3;2m\x1b[<0;3;2M\x1b[<0;3;2m",
    );
    expect(encode({ action: "scroll_down", row: 4, col: 4 }, sgr)).toBe("\x1b[<65;4;4M");
  });

  it("uses the legacy encoding when SGR is off", () => {
    expect(encode({ action: "click", row: 5, col: 12 }, legacy)).toBe("\x1b[M ,%\x1b[M#,%");
  });

  it("keeps legacy reports to single bytes", () => {
    const report = encode({ action: "click", row: 95, col: 95 }, legacy);
    expect(Buffer.from(report).length).toBe(report.length);
    expect(() => encode({ action: "click", row: 5, col: 96 }, legacy)).toThrow(/at most 95/);
  });

  it("sends presses only in X10 mode", () => {
    expect(
      encode({ action: "click", row: 5, col: 12 }, { tracking: true, sgr: false, releases: false }),
    ).toBe("\x1b[M ,%");
  });

  it("refuses when the program has not turned on mouse input", () => {
    expect(() =>
      encode({ action: "click", row: 1, col: 1 }, { tracking: false, sgr: false, releases: true }),
    ).toThrow(/has not turned on mouse input/);
  });

  it("refuses positions outside the screen", () => {
    expect(() => encode({ action: "click", row: 101, col: 1 }, sgr)).toThrow(/outside the 200x100/);
  });
});
