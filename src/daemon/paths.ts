import { chmodSync, mkdirSync, statSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";

type Env = NodeJS.ProcessEnv;

export function socketPath(env: Env = process.env): string {
  if (env.TUI_USE_SOCKET) return env.TUI_USE_SOCKET;
  if (env.XDG_RUNTIME_DIR) return join(env.XDG_RUNTIME_DIR, "tui-use", "d.sock");
  return join(tmpdir(), `tui-use-${process.getuid?.() ?? "user"}`, "d.sock");
}

export function logPath(env: Env = process.env): string {
  return join(dirname(socketPath(env)), "daemon.log");
}

export function configPath(env: Env = process.env): string {
  const base = env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(base, "tui-use", "config.json");
}

export function recordingsDir(env: Env = process.env): string {
  const base = env.XDG_DATA_HOME || join(homedir(), ".local", "share");
  return join(base, "tui-use", "recordings");
}

export function ensurePrivateDir(dir: string): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const stat = statSync(dir);
  const uid = process.getuid?.();
  if (uid !== undefined && stat.uid !== uid) {
    throw new Error(`${dir} is owned by another user; refusing to use it for the tui-use socket`);
  }
  if ((stat.mode & 0o777) !== 0o700) chmodSync(dir, 0o700);
}
