import { describe, expect, it } from "vitest";
import { renderHeader } from "../../../src/terminal/render.js";

const base = {
  id: "s1",
  command: "vim notes.md",
  cols: 120,
  rows: 40,
  cursorRow: 5,
  cursorCol: 12,
  altScreen: true,
  exitCode: null,
  idleMs: 340,
  humanAttached: false,
};

describe("renderHeader", () => {
  it("formats a running session", () => {
    expect(renderHeader(base)).toBe(
      "session s1 · vim notes.md · 120x40 · cursor 5:12 · alt · running · idle 340ms",
    );
  });

  it("includes name, exit code and attach note", () => {
    expect(
      renderHeader({ ...base, name: "ed", altScreen: false, exitCode: 3, humanAttached: true }),
    ).toBe(
      "session s1 (ed) · vim notes.md · 120x40 · cursor 5:12 · normal · exited 3 · idle 340ms · human attached (rw)",
    );
  });
});
