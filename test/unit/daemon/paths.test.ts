import { mkdtempSync, statSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  configPath,
  ensurePrivateDir,
  logPath,
  recordingsDir,
  socketPath,
} from "../../../src/daemon/paths.js";

describe("paths", () => {
  it("prefers TUI_USE_SOCKET, then XDG_RUNTIME_DIR, then tmpdir", () => {
    expect(socketPath({ TUI_USE_SOCKET: "/x/s.sock" })).toBe("/x/s.sock");
    expect(socketPath({ XDG_RUNTIME_DIR: "/run/user/1" })).toBe("/run/user/1/tui-use/d.sock");
    expect(socketPath({})).toBe(join(tmpdir(), `tui-use-${process.getuid?.()}`, "d.sock"));
  });

  it("keeps the log next to the socket", () => {
    expect(logPath({ TUI_USE_SOCKET: "/x/s.sock" })).toBe("/x/daemon.log");
  });

  it("uses XDG config and data dirs", () => {
    expect(configPath({ XDG_CONFIG_HOME: "/c" })).toBe("/c/tui-use/config.json");
    expect(recordingsDir({ XDG_DATA_HOME: "/d" })).toBe("/d/tui-use/recordings");
  });

  it("creates a 0700 directory", () => {
    const dir = join(mkdtempSync(join(tmpdir(), "p-")), "a", "b");
    ensurePrivateDir(dir);
    expect(statSync(dir).mode & 0o777).toBe(0o700);
  });

  it("refuses a symlinked directory", () => {
    const root = mkdtempSync(join(tmpdir(), "p-"));
    symlinkSync(tmpdir(), join(root, "link"));
    expect(() => ensurePrivateDir(join(root, "link"))).toThrow(/symlink/);
  });
});
