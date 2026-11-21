import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { replay } from "../../../src/recorder/replay.js";

function cast() {
  const path = join(mkdtempSync(join(tmpdir(), "replay-")), "a.cast");
  const lines = [
    { version: 2, width: 80, height: 24 },
    [1, "o", "a"],
    [1.5, "r", "100x30"],
    [3, "o", "b"],
  ];
  writeFileSync(path, `${lines.map((l) => JSON.stringify(l)).join("\n")}\n`);
  return path;
}

describe("replay", () => {
  it.each([
    [1, [1000, 500, 1500]],
    [2, [500, 250, 750]],
  ])("waits original timing scaled by speed %d", async (speed, delays) => {
    const waits: number[] = [];
    let out = "";
    await replay(cast(), {
      speed,
      write: (d) => {
        out += d;
      },
      wait: async (ms) => {
        waits.push(ms);
      },
    });
    expect(out).toBe("ab");
    expect(waits).toEqual(delays);
  });

  it("rejects files that are not asciinema v2", async () => {
    const path = join(mkdtempSync(join(tmpdir(), "replay-")), "bad.cast");
    writeFileSync(path, '{"version":1}\n');
    await expect(replay(path, { speed: 1, write: () => {} })).rejects.toThrow(
      /not an asciinema v2/,
    );
  });
});
