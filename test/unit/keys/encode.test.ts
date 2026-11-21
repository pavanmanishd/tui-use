import { describe, expect, it } from "vitest";
import { encodeKey, encodePaste, encodeText } from "../../../src/keys/encode.js";
import { parseKey } from "../../../src/keys/grammar.js";

const normal = { applicationCursorKeys: false };
const app = { applicationCursorKeys: true };
const enc = (name: string, modes = normal) => encodeKey(parseKey(name), modes);

describe("encodeKey", () => {
  it.each([
    ["enter", "\r"],
    ["tab", "\t"],
    ["shift+tab", "\x1b[Z"],
    ["esc", "\x1b"],
    ["backspace", "\x7f"],
    ["ctrl+backspace", "\x08"],
    ["space", " "],
    ["ctrl+space", "\x00"],
    ["delete", "\x1b[3~"],
    ["pageup", "\x1b[5~"],
    ["pagedown", "\x1b[6~"],
    ["up", "\x1b[A"],
    ["down", "\x1b[B"],
    ["right", "\x1b[C"],
    ["left", "\x1b[D"],
    ["home", "\x1b[H"],
    ["end", "\x1b[F"],
    ["ctrl+up", "\x1b[1;5A"],
    ["shift+right", "\x1b[1;2C"],
    ["alt+left", "\x1b[1;3D"],
    ["ctrl+delete", "\x1b[3;5~"],
    ["f1", "\x1bOP"],
    ["f4", "\x1bOS"],
    ["shift+f1", "\x1b[1;2P"],
    ["f5", "\x1b[15~"],
    ["f12", "\x1b[24~"],
    ["ctrl+f5", "\x1b[15;5~"],
    ["ctrl+c", "\x03"],
    ["ctrl+a", "\x01"],
    ["ctrl+z", "\x1a"],
    ["ctrl+[", "\x1b"],
    ["ctrl+]", "\x1d"],
    ["alt+x", "\x1bx"],
    ["alt+enter", "\x1b\r"],
    ["shift+a", "A"],
    ["q", "q"],
  ])("%s", (name, bytes) => {
    expect(enc(name)).toBe(bytes);
  });

  it("uses SS3 cursor keys in application cursor mode", () => {
    expect(enc("up", app)).toBe("\x1bOA");
    expect(enc("home", app)).toBe("\x1bOH");
    expect(enc("ctrl+up", app)).toBe("\x1b[1;5A");
  });

  it("rejects ctrl on characters with no control code", () => {
    expect(() => enc("ctrl+1")).toThrow(/no control code/);
  });
});

describe("encodeText", () => {
  it("turns newlines into carriage returns", () => {
    expect(encodeText("ls -la\n")).toBe("ls -la\r");
    expect(encodeText("a\r\nb")).toBe("a\rb");
  });
});

describe("encodePaste", () => {
  it("wraps in bracketed paste when enabled", () => {
    expect(encodePaste("a\nb", true)).toBe("\x1b[200~a\rb\x1b[201~");
  });

  it("strips an embedded paste terminator", () => {
    expect(encodePaste("x\x1b[201~y", true)).toBe("\x1b[200~xy\x1b[201~");
  });

  it("types the text when bracketed paste is off", () => {
    expect(encodePaste("a\nb", false)).toBe("a\rb");
  });
});
