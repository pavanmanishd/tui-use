import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, loadConfig } from "../../../src/daemon/config.js";

function file(content: string) {
  const path = join(mkdtempSync(join(tmpdir(), "cfg-")), "config.json");
  writeFileSync(path, content);
  return path;
}

describe("loadConfig", () => {
  it("returns defaults when the file is missing", () => {
    expect(loadConfig(join(tmpdir(), "missing-tui-use.json"))).toEqual({
      maxSessions: 8,
      idleTimeoutMinutes: 30,
      scrollbackLines: 10000,
      recordings: true,
      recordingRetentionDays: 7,
      deny: [],
    });
    expect(DEFAULT_CONFIG.maxSessions).toBe(8);
  });

  it("merges given keys over defaults", () => {
    const config = loadConfig(file('{"maxSessions": 2, "deny": ["^rm -rf /"]}'));
    expect(config).toMatchObject({ maxSessions: 2, deny: ["^rm -rf /"], recordings: true });
  });

  it("rejects unknown keys and names them with the path", () => {
    const path = file('{"maxSesions": 4}');
    expect(() => loadConfig(path)).toThrow(`invalid config ${path}: unknown key maxSesions`);
  });

  it("rejects bad types", () => {
    expect(() => loadConfig(file('{"recordings": "yes"}'))).toThrow(/recordings:/);
  });

  it("rejects bad deny patterns", () => {
    expect(() => loadConfig(file('{"deny": ["("]}'))).toThrow(
      /deny.0: not a valid regular expression/,
    );
  });

  it("rejects invalid JSON", () => {
    expect(() => loadConfig(file("{"))).toThrow(/invalid config/);
  });
});
