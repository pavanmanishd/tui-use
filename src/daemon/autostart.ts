import { spawn } from "node:child_process";
import { openSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ensurePrivateDir } from "./paths.js";

const CLI_ENTRY = fileURLToPath(new URL("../cli/main.js", import.meta.url));

export function spawnDaemon(socketPath: string): void {
  const dir = dirname(socketPath);
  ensurePrivateDir(dir);
  const log = openSync(join(dir, "daemon.log"), "a", 0o600);
  const child = spawn(process.execPath, [CLI_ENTRY, "daemon"], {
    detached: true,
    stdio: ["ignore", log, log],
    env: { ...process.env, TUI_USE_SOCKET: socketPath },
  });
  child.unref();
}
