import { describe, expect, it } from "vitest";
import { encodeMessage, LineReader, parseParams } from "../../../src/daemon/protocol.js";

describe("LineReader", () => {
  it("reassembles lines split across chunks and skips blanks", () => {
    const lines: string[] = [];
    const reader = new LineReader();
    reader.push('{"a":', (l) => lines.push(l));
    reader.push('1}\n\n{"b":2}\n{"c"', (l) => lines.push(l));
    expect(lines).toEqual(['{"a":1}', '{"b":2}']);
  });

  it("encodes one message per line", () => {
    expect(encodeMessage({ a: 1 })).toBe('{"a":1}\n');
  });
});

describe("parseParams", () => {
  it("fills defaults", () => {
    expect(parseParams("snapshot", { session: "s1" })).toEqual({
      session: "s1",
      mode: "full",
      styles: "marks",
    });
    expect(parseParams("send", { session: "s1", input: [] }).mode).toBe("diff");
  });

  it("rejects unknown fields and bad input items", () => {
    expect(() => parseParams("snapshot", { session: "s1", bogus: 1 })).toThrow(
      /invalid snapshot params/,
    );
    expect(() => parseParams("send", { session: "s1", input: [{ text: "a", key: "b" }] })).toThrow(
      /input.0/,
    );
  });

  it("requires exactly one of session or all for kill", () => {
    expect(() => parseParams("kill", {})).toThrow(/pass either session or all/);
    expect(() => parseParams("kill", { session: "s1", all: true })).toThrow(
      /pass either session or all/,
    );
    expect(parseParams("kill", { all: true })).toEqual({ all: true });
  });

  it("rejects both lines and search for scrollback", () => {
    expect(() => parseParams("scrollback", { session: "s1", lines: [1, 2], search: "x" })).toThrow(
      /pass either lines or search/,
    );
  });

  it("bounds terminal sizes", () => {
    expect(() => parseParams("resize", { session: "s1", cols: 5, rows: 40 })).toThrow(/cols/);
  });
});
