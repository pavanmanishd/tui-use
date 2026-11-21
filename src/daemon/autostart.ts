import { spawn } from "node:child_process";
import { openSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ensurePrivateDir } from "./paths.js";

const CLI_ENTRY = fileURLToPath(new URL("../cli/main.js", import.meta.url));

const DAEMON_ENV = [
  "HOME",
  "PATH",
  "LANG",
  "TMPDIR",
  "XDG_CONFIG_HOME",
  "XDG_DATA_HOME",
  "XDG_RUNTIME_DIR",
];

export function spawnDaemon(socketPath: string): void {
  const dir = dirname(socketPath);
  ensurePrivateDir(dir);
  const log = openSync(join(dir, "daemon.log"), "a", 0o600);
  const child = spawn(process.execPath, [CLI_ENTRY, "daemon"], {
    detached: true,
    stdio: ["ignore", log, log],
    cwd: homedir(),
    env: {
      ...Object.fromEntries(
        DAEMON_ENV.flatMap((k) => (process.env[k] ? [[k, process.env[k]]] : [])),
      ),
      TUI_USE_SOCKET: socketPath,
    },
  });
  child.unref();
}
