import { describe, expect, it } from "vitest";
import {
  formatLines,
  readRange,
  search,
  trimTrailingBlank,
} from "../../../src/session/scrollback.js";

const lines = Array.from(
  { length: 200 },
  (_, i) => `line ${i + 1}${i + 1 === 120 || i + 1 === 121 ? " error" : ""}`,
);

describe("readRange", () => {
  it("reads negative ranges from the end", () => {
    const out = readRange(lines, -3, -1);
    expect(out.map((l) => l.n)).toEqual([198, 199, 200]);
  });

  it("clamps to the buffer", () => {
    expect(readRange(lines, -500, 2).map((l) => l.n)).toEqual([1, 2]);
    expect(readRange(lines, 5, 3)).toEqual([]);
  });
});

describe("search", () => {
  it("merges overlapping context into one block", () => {
    const blocks = search(lines, "error");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.map((l) => l.n)).toEqual([118, 119, 120, 121, 122, 123]);
  });

  it("keeps distant matches in separate blocks", () => {
    const blocks = search(lines, "line 1");
    expect(blocks.length).toBeGreaterThan(1);
    expect(blocks[0]?.[0]?.n).toBe(1);
  });

  it("returns nothing when there is no match", () => {
    expect(search(lines, "nope")).toEqual([]);
  });
});

describe("helpers", () => {
  it("trims trailing blank lines", () => {
    expect(trimTrailingBlank(["a", "", "b", "", ""])).toEqual(["a", "", "b"]);
  });

  it("formats numbered lines padded to the total width", () => {
    expect(formatLines([{ n: 7, text: "x" }], 120)).toBe("  7│x");
  });
});
