import { setTimeout as sleep } from "node:timers/promises";
import pty from "@lydell/node-pty";
import { describe, expect, it } from "vitest";
import { CLI, isolatedEnv, runCli } from "../helpers/cli.js";
import { fixture } from "../helpers/fixture.js";

function attachInPty(env: Record<string, string>, session: string, cols = 120, rows = 40) {
  const term = pty.spawn(process.execPath, [CLI, "attach", session], { cols, rows, env });
  let out = "";
  term.onData((d) => {
    out += d;
  });
  const exited = new Promise<number>((resolve) => term.onExit(({ exitCode }) => resolve(exitCode)));
  return { term, exited, output: () => out };
}

async function until(check: () => boolean, ms = 5000) {
  const deadline = Date.now() + ms;
  while (!check()) {
    if (Date.now() > deadline) throw new Error("timed out");
    await sleep(25);
  }
}

describe("tui-use attach", () => {
  it("mirrors the screen, forwards keys and detaches with ctrl+]", async () => {
    const env = isolatedEnv();
    await runCli(env, ["start", fixture("keys.mjs"), "--name", "k"]);
    const a = attachInPty(env, "k");
    await until(() => a.output().includes("ready"));
    const flagged = await runCli(env, ["snapshot", "k"]);
    expect(flagged.stdout).toContain("human attached (rw)");

    a.term.write("q");
    await until(() => a.output().includes('got "q"'));
    await runCli(env, ["send", "k", "--text", "agent"]);
    await until(() => a.output().includes('got "agent"'));

    a.term.write("\x1d");
    expect(await a.exited).toBe(0);
    expect(a.output()).toContain("detached from s1");
    const after = await runCli(env, ["snapshot", "k"]);
    expect(after.stdout).toContain("running");
    expect(after.stdout).not.toContain("human attached");
  });

  it("warns when the local terminal is smaller", async () => {
    const env = isolatedEnv();
    await runCli(env, ["start", "sleep 30", "--name", "z"]);
    const a = attachInPty(env, "z", 80, 24);
    await until(() => a.output().includes("is 120x40 but this terminal is 80x24"));
    a.term.write("\x1d");
    await a.exited;
  });

  it("returns when the session exits", async () => {
    const env = isolatedEnv();
    await runCli(env, ["start", "sleep 1; exit 4", "--name", "e"]);
    const a = attachInPty(env, "e");
    expect(await a.exited).toBe(0);
    expect(a.output()).toContain("session exited (4)");
  });
});
