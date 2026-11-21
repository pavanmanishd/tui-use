import { chmodSync, lstatSync, mkdirSync, type Stats } from "node:fs";
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

function assertOwned(path: string, stat: Stats): void {
  const uid = process.getuid?.();
  if (stat.isSymbolicLink())
    throw new Error(`${path} is a symlink; refusing to use it for tui-use`);
  if (uid !== undefined && stat.uid !== uid) {
    throw new Error(`${path} is owned by another user; refusing to use it for tui-use`);
  }
}

export function ensurePrivateDir(dir: string): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const stat = lstatSync(dir);
  assertOwned(dir, stat);
  if ((stat.mode & 0o777) !== 0o700) chmodSync(dir, 0o700);
}

export function assertPrivateSocket(socket: string): void {
  const dir = dirname(socket);
  const dirStat = lstatSync(dir);
  assertOwned(dir, dirStat);
  if ((dirStat.mode & 0o077) !== 0) {
    throw new Error(
      `${dir} is accessible to other users; refusing to connect to the tui-use socket`,
    );
  }
  assertOwned(socket, lstatSync(socket));
}
