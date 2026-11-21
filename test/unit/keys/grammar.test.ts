import { describe, expect, it } from "vitest";
import { isKeyName, parseKey } from "../../../src/keys/grammar.js";

describe("parseKey", () => {
  it.each([
    ["enter", { base: "enter", ctrl: false, alt: false, shift: false }],
    ["ENTER", { base: "enter", ctrl: false, alt: false, shift: false }],
    ["ctrl+c", { base: "c", ctrl: true, alt: false, shift: false }],
    ["Ctrl+C", { base: "c", ctrl: true, alt: false, shift: false }],
    ["alt+x", { base: "x", ctrl: false, alt: true, shift: false }],
    ["shift+tab", { base: "tab", ctrl: false, alt: false, shift: true }],
    ["ctrl+alt+delete", { base: "delete", ctrl: true, alt: true, shift: false }],
    ["f12", { base: "f12", ctrl: false, alt: false, shift: false }],
    ["A", { base: "A", ctrl: false, alt: false, shift: false }],
    ["+", { base: "+", ctrl: false, alt: false, shift: false }],
    ["ctrl++", { base: "+", ctrl: true, alt: false, shift: false }],
    ["é", { base: "é", ctrl: false, alt: false, shift: false }],
  ])("parses %s", (name, expected) => {
    expect(parseKey(name)).toEqual(expected);
  });

  it.each(["", "ctrl+enterr", "f13", "hyper+a", "ctrl+ctrl+a", "return", " ", "ctrl+"])(
    "rejects %j",
    (name) => {
      expect(() => parseKey(name)).toThrow(/unknown key/);
    },
  );

  it("names the bad key in the error", () => {
    expect(() => parseKey("ctrl+enterr")).toThrow('unknown key "ctrl+enterr"');
  });

  it("reports key names", () => {
    expect(isKeyName("esc")).toBe(true);
    expect(isKeyName(":wq")).toBe(false);
  });
});
