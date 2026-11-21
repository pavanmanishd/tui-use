import { setTimeout as sleep } from "node:timers/promises";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { describe, expect, it } from "vitest";
import { CLI, isolatedEnv, runCli } from "../helpers/cli.js";
import { fixture } from "../helpers/fixture.js";

async function connect(env: Record<string, string>) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [CLI, "mcp"],
    env,
  });
  const client = new Client({ name: "test", version: "0" });
  await client.connect(transport);
  return client;
}

function textOf(result: unknown): string {
  return (result as { content: Array<{ text: string }> }).content.map((c) => c.text).join("\n");
}

describe("MCP server", () => {
  it("lists the six tools", async () => {
    const client = await connect(isolatedEnv());
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "tui_manage",
      "tui_scrollback",
      "tui_send",
      "tui_snapshot",
      "tui_start",
      "tui_wait",
    ]);
    await client.close();
  });

  it("drives a python REPL and kills its sessions on disconnect", async () => {
    const env = isolatedEnv();
    const client = await connect(env);
    const started = await client.callTool({
      name: "tui_start",
      arguments: { command: "python3 -q" },
    });
    expect(textOf(started)).toContain(">>> [ ]");
    const sent = await client.callTool({
      name: "tui_send",
      arguments: { session: "s1", text: "2+2", keys: ["enter"] },
    });
    expect(textOf(sent)).toMatch(/│4$/m);
    const listed = await client.callTool({ name: "tui_manage", arguments: { action: "list" } });
    expect(textOf(listed)).toContain("owner mcp");
    await client.close();
    await sleep(800);
    const after = await runCli(env, ["list"]);
    expect(after.stdout.trim()).toBe("no sessions");
  });

  it("returns tool errors the agent can act on", async () => {
    const client = await connect(isolatedEnv());
    await client.callTool({ name: "tui_start", arguments: { command: fixture("keys.mjs") } });
    const bad = await client.callTool({
      name: "tui_send",
      arguments: { session: "s1", keys: ["ctrl+enterr"] },
    });
    expect(bad.isError).toBe(true);
    expect(textOf(bad)).toMatch(/unknown key "ctrl\+enterr": use enter, tab/);
    const both = await client.callTool({
      name: "tui_scrollback",
      arguments: { session: "s1", lines: [1, 2], search: "x" },
    });
    expect(textOf(both)).toContain("pass either lines or search");
    await client.close();
  });

  it("types secrets from its own environment", async () => {
    const client = await connect(isolatedEnv({ PW: "hunter2" }));
    await client.callTool({
      name: "tui_start",
      arguments: { command: fixture("secret-echo.mjs") },
    });
    const sent = await client.callTool({
      name: "tui_send",
      arguments: { session: "s1", secret_env: "PW", keys: ["enter"], wait: { text: "you typed" } },
    });
    expect(textOf(sent)).toContain("you typed: ***");
    expect(textOf(sent)).not.toContain("hunter2");
    await client.close();
  });

  it("waits with conditions and reports what fired", async () => {
    const client = await connect(isolatedEnv());
    await client.callTool({
      name: "tui_start",
      arguments: { command: fixture("slow.mjs", "2", "200") },
    });
    const waited = await client.callTool({
      name: "tui_wait",
      arguments: { session: "s1", wait: { text: "done", timeout_ms: 5000 } },
    });
    expect(textOf(waited)).toContain("(wait fired: text)");
    await client.close();
  });
});
