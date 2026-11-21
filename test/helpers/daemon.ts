import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach } from "vitest";
import { DaemonClient } from "../../src/daemon/client.js";
import { type Config, DEFAULT_CONFIG } from "../../src/daemon/config.js";
import { type Daemon, startDaemon } from "../../src/daemon/server.js";

const running: Daemon[] = [];
const clients: DaemonClient[] = [];

afterEach(async () => {
  for (const c of clients.splice(0)) c.close();
  await Promise.all(running.splice(0).map((d) => d.close()));
});

export function tempSocket(): string {
  return join(mkdtempSync(join(tmpdir(), "tu-")), "d.sock");
}

export async function daemon(config: Partial<Config> = {}, idleExitMs = 60_000) {
  const socketPath = tempSocket();
  const logs: string[] = [];
  const d = await startDaemon({
    socketPath,
    config: { ...DEFAULT_CONFIG, recordings: false, ...config },
    recordingsDir: null,
    idleExitMs,
    log: (m) => logs.push(m),
  });
  running.push(d);
  return { daemon: d, socketPath, logs };
}

export async function client(socketPath: string, kind: "mcp" | "cli" = "cli") {
  const c = await DaemonClient.connect({ kind, socketPath, autostart: false });
  clients.push(c);
  return c;
}
