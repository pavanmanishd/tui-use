import { describe, expect, it } from "vitest";
import { encodeMouse } from "../../../src/keys/mouse.js";

const sgr = { tracking: true, sgr: true };
const legacy = { tracking: true, sgr: false };

describe("encodeMouse", () => {
  it("encodes an SGR click as press and release", () => {
    expect(encodeMouse({ action: "click", row: 5, col: 12 }, sgr)).toBe(
      "\x1b[<0;12;5M\x1b[<0;12;5m",
    );
  });

  it("encodes right clicks, double clicks and scrolls", () => {
    expect(encodeMouse({ action: "right_click", row: 1, col: 1 }, sgr)).toBe(
      "\x1b[<2;1;1M\x1b[<2;1;1m",
    );
    expect(encodeMouse({ action: "double_click", row: 2, col: 3 }, sgr)).toBe(
      "\x1b[<0;3;2M\x1b[<0;3;2m\x1b[<0;3;2M\x1b[<0;3;2m",
    );
    expect(encodeMouse({ action: "scroll_down", row: 4, col: 4 }, sgr)).toBe("\x1b[<65;4;4M");
  });

  it("uses the legacy encoding when SGR is off", () => {
    expect(encodeMouse({ action: "click", row: 5, col: 12 }, legacy)).toBe("\x1b[M ,%\x1b[M#,%");
  });

  it("refuses when the program has not turned on mouse input", () => {
    expect(() =>
      encodeMouse({ action: "click", row: 1, col: 1 }, { tracking: false, sgr: false }),
    ).toThrow(/has not turned on mouse input/);
  });

  it("refuses coordinates the legacy encoding cannot carry", () => {
    expect(() => encodeMouse({ action: "click", row: 300, col: 1 }, legacy)).toThrow(/at most 223/);
  });
});
