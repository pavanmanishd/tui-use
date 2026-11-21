import { describe, expect, it } from "vitest";
import { childEnv, spawnPty } from "../../src/pty/spawn.js";

function run(command: string, env: Record<string, string> = {}, size = { cols: 80, rows: 24 }) {
  return new Promise<{ out: string; code: number }>((resolve) => {
    const p = spawnPty({
      command,
      cwd: "/tmp",
      env: { ...(process.env as Record<string, string>), ...env },
      ...size,
    });
    let out = "";
    p.onData((d) => {
      out += d;
    });
    p.onExit(({ exitCode }) => setTimeout(() => resolve({ out, code: exitCode }), 50));
  });
}

describe("spawnPty", () => {
  it("runs through the shell with merged env and TERM", async () => {
    const { out } = await run('echo "foo=$FOO term=$TERM"', { FOO: "1" });
    expect(out).toContain("foo=1 term=xterm-256color");
  });

  it("uses the requested cwd and size", async () => {
    const { out } = await run("pwd; stty size", {}, { cols: 132, rows: 43 });
    expect(out).toMatch(/\/tmp/);
    expect(out).toContain("43 132");
  });

  it("reports the exit code", async () => {
    expect((await run("exit 7")).code).toBe(7);
  });

  it("drops variables that would mislead the program", () => {
    expect(childEnv({ COLUMNS: "80", LINES: "24", TMUX: "x", A: "1" })).toEqual({
      A: "1",
      TERM: "xterm-256color",
    });
  });
});
