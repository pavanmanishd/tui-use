import { statSync, writeFileSync } from "node:fs";
import { createConnection } from "node:net";
import { dirname } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { describe, expect, it } from "vitest";
import { startRequestEnv } from "../../src/daemon/client.js";
import { DEFAULT_CONFIG } from "../../src/daemon/config.js";
import type { ScreenResult } from "../../src/daemon/protocol.js";
import { DaemonAlreadyRunning, startDaemon } from "../../src/daemon/server.js";
import { client, daemon, tempSocket } from "../helpers/daemon.js";
import { fixture } from "../helpers/fixture.js";

const start = (command: string, extra: Record<string, unknown> = {}) => ({
  command,
  cwd: process.cwd(),
  env: startRequestEnv(),
  cols: 80,
  rows: 24,
  ...extra,
});

function raw(socketPath: string, lines: string[]): Promise<string[]> {
  return new Promise((resolve) => {
    const socket = createConnection(socketPath);
    let data = "";
    socket.setEncoding("utf8");
    socket.on("data", (d: string) => {
      data += d;
      const got = data.trim().split("\n");
      if (got.length >= lines.length) {
        socket.end();
        resolve(got);
      }
    });
    socket.on("connect", () => {
      for (const l of lines) socket.write(`${l}\n`);
    });
  });
}

describe("daemon", () => {
  it("keeps the socket in a private directory", async () => {
    const { socketPath } = await daemon();
    expect(statSync(dirname(socketPath)).mode & 0o777).toBe(0o700);
    expect(statSync(socketPath).mode & 0o777).toBe(0o600);
  });

  it("answers parse errors and requires hello first, then keeps working", async () => {
    const { socketPath } = await daemon();
    const replies = await raw(socketPath, [
      "not json",
      JSON.stringify({ jsonrpc: "2.0", id: 1, method: "list", params: {} }),
      JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "hello",
        params: { version: "x", kind: "cli" },
      }),
      JSON.stringify({ jsonrpc: "2.0", id: 3, method: "nope", params: {} }),
      JSON.stringify({ jsonrpc: "2.0", id: 4, method: "list", params: {} }),
    ]);
    const byId = new Map(replies.map((r) => JSON.parse(r)).map((m) => [m.id, m]));
    expect(byId.get(null).error.code).toBe(-32700);
    expect(byId.get(1).error.message).toBe("send hello first");
    expect(byId.get(2).result.sessions).toBe(0);
    expect(byId.get(3).error.code).toBe(-32601);
    expect(byId.get(4).result).toEqual({ sessions: [] });
  });

  it("rejects invalid params with a readable message", async () => {
    const { socketPath } = await daemon();
    const c = await client(socketPath);
    await expect(
      c.request("send", { session: "s1", input: [{ bogus: 1 }] } as never),
    ).rejects.toThrow(/invalid send params: input.0/);
  });

  it("starts, sends and snapshots a session", async () => {
    const { socketPath } = await daemon();
    const c = await client(socketPath);
    const started = await c.request<ScreenResult>(
      "start",
      start(fixture("keys.mjs"), { name: "k" }),
    );
    expect(started.session).toBe("s1");
    expect(started.text).toContain("ready");
    const sent = await c.request<ScreenResult>("send", { session: "k", input: [{ text: "hi" }] });
    expect(sent.text).toContain('got "hi"');
    expect(sent.text).toMatch(/rows changed/);
  });

  it("kills MCP-owned sessions when that client disconnects", async () => {
    const { socketPath, daemon: d } = await daemon();
    const mcp = await client(socketPath, "mcp");
    await mcp.request("start", start("sleep 30"));
    const cli = await client(socketPath);
    await cli.request("start", start("sleep 30"));
    mcp.close();
    await sleep(500);
    const list = d.manager.list();
    expect(list.map((s) => s.owner)).toEqual(["cli"]);
  });

  it("stops another MCP client from controlling a session but lets the CLI", async () => {
    const { socketPath } = await daemon();
    const a = await client(socketPath, "mcp");
    const b = await client(socketPath, "mcp");
    const cli = await client(socketPath);
    await a.request("start", start(fixture("keys.mjs")));
    await expect(b.request("send", { session: "s1", input: [{ text: "x" }] })).rejects.toThrow(
      /belongs to another mcp client/,
    );
    await expect(b.request("snapshot", { session: "s1" })).resolves.toBeTruthy();
    await expect(
      cli.request("send", { session: "s1", input: [{ text: "x" }] }),
    ).resolves.toBeTruthy();
    await expect(b.request("kill", { all: true })).rejects.toThrow(
      /only available from the tui-use CLI/,
    );
  });

  it("returns the final screen when a program crashes mid-send and keeps other sessions", async () => {
    const { socketPath, daemon: d } = await daemon();
    const c = await client(socketPath);
    await c.request("start", start("sleep 30", { name: "other" }));
    await c.request("start", start(`read x; echo crashed; kill -SEGV $$`));
    const sent = await c.request<ScreenResult>("send", {
      session: "s2",
      input: [{ text: "go\n" }],
    });
    expect(sent.state).toBe("exited");
    expect(sent.text).toContain("crashed");
    expect(d.manager.get("other").running).toBe(true);
  });

  it("refuses a second daemon on a live socket and replaces a stale one", async () => {
    const { socketPath } = await daemon();
    const options = {
      socketPath,
      config: DEFAULT_CONFIG,
      recordingsDir: null,
      idleExitMs: 60_000,
    };
    await expect(startDaemon(options)).rejects.toBeInstanceOf(DaemonAlreadyRunning);

    const stale = tempSocket();
    writeFileSync(stale, "");
    const d = await startDaemon({ ...options, socketPath: stale });
    const c = await client(stale);
    await expect(c.request("list", {})).resolves.toEqual({ sessions: [] });
    c.close();
    await d.close();
  });

  it("exits after the idle period with no sessions or connections", async () => {
    let exited = false;
    const socketPath = tempSocket();
    await startDaemon({
      socketPath,
      config: DEFAULT_CONFIG,
      recordingsDir: null,
      idleExitMs: 200,
      onExit: () => {
        exited = true;
      },
    });
    await sleep(700);
    expect(exited).toBe(true);
    expect(() => statSync(socketPath)).toThrow();
  });

  it("streams output to an attached client and flags the header", async () => {
    const { socketPath } = await daemon();
    const agent = await client(socketPath, "mcp");
    await agent.request("start", start(fixture("keys.mjs")));
    const human = await client(socketPath);
    const outputs: string[] = [];
    human.on("notification", (method: string, params: { data: string }) => {
      if (method === "output") outputs.push(params.data);
    });
    const info = await human.request<{ screen: string }>("attach", { session: "s1" });
    expect(info.screen).toContain("ready");
    const snap = await agent.request<ScreenResult>("snapshot", { session: "s1" });
    expect(snap.text).toContain("human attached (rw)");
    human.notify("input", { data: "z" });
    await sleep(300);
    expect(outputs.join("")).toContain('got "z"');
    human.close();
    await sleep(200);
    const after = await agent.request<ScreenResult>("snapshot", { session: "s1" });
    expect(after.text).not.toContain("human attached");
  });

  it("refuses shutdown while sessions run", async () => {
    const { socketPath } = await daemon();
    const c = await client(socketPath);
    await c.request("start", start("sleep 30"));
    await expect(c.request("shutdown", {})).rejects.toThrow(/1 running sessions/);
  });

  it("never logs a secret", async () => {
    const { socketPath, logs } = await daemon();
    const c = await client(socketPath);
    await c.request("start", start(fixture("secret-echo.mjs")));
    const sent = await c.request<ScreenResult>("send", {
      session: "s1",
      input: [{ secret: "hunter2" }, { key: "enter" }],
      wait: { text: "you typed" },
    });
    expect(sent.text).not.toContain("hunter2");
    await expect(
      c.request("send", { session: "s1", input: [{ secret: "hunter2" }, { key: "nokey" }] }),
    ).rejects.toThrow(/unknown key "nokey"/);
    expect(logs.join("\n")).not.toContain("hunter2");
  });
});
