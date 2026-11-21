import { describe, expect, it } from "vitest";
import { isolatedEnv, runCli } from "../helpers/cli.js";
import { fixture } from "../helpers/fixture.js";

describe("tui-use CLI", () => {
  it("keeps a python session across separate invocations", async () => {
    const env = isolatedEnv();
    const started = await runCli(env, ["start", "python3 -q", "--name", "py"]);
    expect(started.code).toBe(0);
    expect(started.stdout).toContain(">>> [ ]");
    await runCli(env, ["send", "py", "--text", "x = 21", "--key", "enter"]);
    const sent = await runCli(env, ["send", "py", "--text", "x * 2", "--key", "enter"]);
    expect(sent.stdout).toContain("42");
    expect(sent.stdout).toMatch(/rows changed/);
  });

  it("tells the user to quote a command with flags", async () => {
    const out = await runCli(isolatedEnv(), ["start", "python3", "-q"]);
    expect(out.code).toBe(2);
    expect(out.stderr).toContain('quote the command, e.g. tui-use start "git rebase -i HEAD~3"');
  });

  it("exits 3 when a wait times out and 2 on a usage error", async () => {
    const env = isolatedEnv();
    await runCli(env, ["start", fixture("keys.mjs"), "--name", "k"]);
    const waited = await runCli(env, ["wait", "k", "--text", "never", "--timeout", "300"]);
    expect(waited.code).toBe(3);
    expect(waited.stdout).toContain("(wait timed out after 300ms)");
    const usage = await runCli(env, ["send"]);
    expect(usage.code).toBe(2);
    expect(usage.stderr).toContain("usage: tui-use send");
  });

  it("sends --input tokens as keys or text", async () => {
    const env = isolatedEnv();
    await runCli(env, ["start", fixture("keys.mjs"), "--name", "k"]);
    const sent = await runCli(env, ["send", "k", "--input", "esc", ":wq", "enter", "text:enter"]);
    expect(sent.stdout).toContain('got "\\u001b:wq\\renter"');
  });

  it("prints JSON with --json and lists sessions", async () => {
    const env = isolatedEnv();
    const started = await runCli(env, ["start", "sleep 30", "--json"]);
    expect(JSON.parse(started.stdout)).toMatchObject({ session: "s1", state: "running" });
    const list = await runCli(env, ["list"]);
    expect(list.stdout).toMatch(/^s1 · running · 120x40 · idle \d+ms · owner cli · sleep 30$/m);
  });

  it("reports request errors with exit 1", async () => {
    const env = isolatedEnv();
    const missing = await runCli(env, ["snapshot", "nope"]);
    expect(missing.code).toBe(1);
    expect(missing.stderr).toContain('no session "nope"');
  });

  it("reads secrets from --secret-env and keeps them out of output", async () => {
    const env = isolatedEnv({ MY_PASS: "hunter2" });
    await runCli(env, ["start", fixture("secret-echo.mjs"), "--name", "pw"]);
    const sent = await runCli(env, [
      "send",
      "pw",
      "--secret-env",
      "MY_PASS",
      "--key",
      "enter",
      "--until-text",
      "you typed",
    ]);
    expect(sent.stdout).toContain("you typed: ***");
    expect(sent.stdout).not.toContain("hunter2");
  });

  it("prints help and version", async () => {
    const env = isolatedEnv();
    expect((await runCli(env, ["--help"])).stdout).toContain("tui-use start <command>");
    expect((await runCli(env, ["--version"])).stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });
});
