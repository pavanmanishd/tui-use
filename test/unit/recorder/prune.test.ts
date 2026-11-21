import { existsSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { pruneRecordings } from "../../../src/recorder/prune.js";

describe("pruneRecordings", () => {
  it("deletes recordings older than the retention window", () => {
    const dir = mkdtempSync(join(tmpdir(), "prune-"));
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const file = (name: string, ageDays: number) => {
      const path = join(dir, name);
      writeFileSync(path, "");
      const t = (now - ageDays * day) / 1000;
      utimesSync(path, t, t);
      return path;
    };
    const old = file("old.cast", 8);
    const fresh = file("fresh.cast", 6);
    const other = file("notes.txt", 30);
    expect(pruneRecordings(dir, 7, now)).toEqual([old]);
    expect(existsSync(old)).toBe(false);
    expect(existsSync(fresh)).toBe(true);
    expect(existsSync(other)).toBe(true);
  });

  it("ignores a missing directory", () => {
    expect(pruneRecordings(join(tmpdir(), "does-not-exist-tui-use"), 7)).toEqual([]);
  });
});
