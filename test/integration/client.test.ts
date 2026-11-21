import { createServer } from "node:net";
import { describe, expect, it } from "vitest";
import { tempSocket } from "../helpers/daemon.js";

const dist = (path: string) => import(new URL(`../../dist/${path}`, import.meta.url).href);
const { DaemonClient } = (await dist(
  "daemon/client.js",
)) as typeof import("../../src/daemon/client.js");
const { VERSION } = (await dist("version.js")) as typeof import("../../src/version.js");

function fakeDaemon(socketPath: string, version: string, sessions: number) {
  let shutdowns = 0;
  const server = createServer((socket) => {
    socket.setEncoding("utf8");
    socket.on("data", (chunk: string) => {
      for (const line of chunk.trim().split("\n")) {
        const msg = JSON.parse(line);
        if (msg.method === "hello") {
          socket.write(
            `${JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { version, sessions } })}\n`,
          );
        } else if (msg.method === "shutdown") {
          shutdowns++;
          socket.write(`${JSON.stringify({ jsonrpc: "2.0", id: msg.id, result: { ok: true } })}\n`);
          server.close();
          socket.destroy();
        }
      }
    });
  });
  return new Promise<{ shutdowns: () => number }>((resolve) =>
    server.listen(socketPath, () => resolve({ shutdowns: () => shutdowns })),
  );
}

describe("DaemonClient", () => {
  it("refuses an old daemon that still has running sessions", async () => {
    const socketPath = tempSocket();
    await fakeDaemon(socketPath, "0.0.1", 2);
    await expect(DaemonClient.connect({ kind: "cli", socketPath })).rejects.toThrow(
      `the running tui-use daemon is version 0.0.1 with 2 running sessions, but this client is ${VERSION}`,
    );
  });

  it("replaces an old daemon with no sessions", async () => {
    const socketPath = tempSocket();
    const fake = await fakeDaemon(socketPath, "0.0.1", 0);
    const client = await DaemonClient.connect({ kind: "cli", socketPath });
    expect(fake.shutdowns()).toBe(1);
    await expect(client.request("list", {})).resolves.toEqual({ sessions: [] });
    await client.request("shutdown", {});
    client.close();
  });

  it("autostarts one daemon when two clients connect at once", async () => {
    const socketPath = tempSocket();
    const [a, b] = await Promise.all([
      DaemonClient.connect({ kind: "cli", socketPath }),
      DaemonClient.connect({ kind: "cli", socketPath }),
    ]);
    await a.request("start", {
      command: "sleep 30",
      cwd: process.cwd(),
      env: process.env as Record<string, string>,
    });
    const listed = await b.request<{ sessions: unknown[] }>("list", {});
    expect(listed.sessions).toHaveLength(1);
    await a.request("kill", { all: true });
    await a.request("shutdown", {});
    a.close();
    b.close();
  });
});

describe("socket checks", () => {
  it("refuses a socket in a directory other users can read", async () => {
    const { chmodSync } = await import("node:fs");
    const { dirname } = await import("node:path");
    const socketPath = tempSocket();
    await fakeDaemon(socketPath, VERSION, 0);
    chmodSync(dirname(socketPath), 0o755);
    await expect(
      DaemonClient.connect({ kind: "cli", socketPath, autostart: false }),
    ).rejects.toThrow(/accessible to other users/);
  });
});

describe("startRequestEnv", () => {
  it("leaves out variables listed in TUI_USE_SECRETS", async () => {
    const { startRequestEnv } = (await dist(
      "daemon/client.js",
    )) as typeof import("../../src/daemon/client.js");
    process.env.TUI_USE_SECRETS = "SSH_PASS, DB_PASS";
    process.env.SSH_PASS = "x";
    try {
      const env = startRequestEnv({ EXTRA: "1" });
      expect(env.SSH_PASS).toBeUndefined();
      expect(env.TUI_USE_SECRETS).toBeUndefined();
      expect(env.EXTRA).toBe("1");
      expect(env.PATH).toBe(process.env.PATH);
    } finally {
      delete process.env.TUI_USE_SECRETS;
      delete process.env.SSH_PASS;
    }
  });
});
