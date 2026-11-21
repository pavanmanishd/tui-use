import { describe, expect, it } from "vitest";
import { renderDiff } from "../../../src/terminal/diff.js";

const rows = (n: number, f: (i: number) => string) => Array.from({ length: n }, (_, i) => f(i));

describe("renderDiff", () => {
  const prev = { cols: 80, rows: rows(10, (i) => `line ${i}`) };

  it("returns a full snapshot without a previous frame", () => {
    expect(renderDiff("H", prev, undefined)).toContain(" 1│line 0");
  });

  it("lists only changed rows", () => {
    const cur = { cols: 80, rows: prev.rows.map((r, i) => (i === 3 ? "new" : r)) };
    expect(renderDiff("H", cur, prev)).toBe("H\n───\n 4│new\n(1 of 10 rows changed)");
  });

  it("reports no changes", () => {
    expect(renderDiff("H", prev, prev)).toBe("H\n───\n(no changes)");
  });

  it("falls back to full when more than half changed", () => {
    const cur = { cols: 80, rows: rows(10, (i) => (i < 6 ? "x" : `line ${i}`)) };
    expect(renderDiff("H", cur, prev)).toContain(" 7│line 6");
  });

  it("keeps a diff at exactly half changed", () => {
    const cur = { cols: 80, rows: rows(10, (i) => (i < 5 ? "x" : `line ${i}`)) };
    expect(renderDiff("H", cur, prev)).toContain("(5 of 10 rows changed)");
  });

  it("falls back to full after a resize", () => {
    expect(renderDiff("H", { cols: 100, rows: prev.rows }, prev)).toContain(" 1│line 0");
  });
});

describe("renderDiff repeated rows", () => {
  it("collapses identical consecutive changed rows", () => {
    const prev = { cols: 80, rows: Array.from({ length: 10 }, (_, i) => `old ${i}`) };
    const cur = { cols: 80, rows: prev.rows.map((r, i) => (i >= 2 && i <= 5 ? "~" : r)) };
    expect(renderDiff("H", cur, prev)).toBe(
      "H\n───\n 3│~\n…(rows 4-6 same as row 3)\n(4 of 10 rows changed)",
    );
  });
});
