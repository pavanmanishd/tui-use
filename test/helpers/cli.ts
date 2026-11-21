import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach } from "vitest";

export const CLI = fileURLToPath(new URL("../../dist/cli/main.js", import.meta.url));

const homes: Array<Record<string, string>> = [];

afterEach(async () => {
  for (const env of homes.splice(0)) {
    await runCli(env, ["kill", "--all"]);
    try {
      const lock = join(dirname(env.TUI_USE_SOCKET as string), "daemon.lock");
      process.kill(Number(readFileSync(lock, "utf8")), "SIGTERM");
    } catch {}
  }
});

export function isolatedEnv(extra: Record<string, string> = {}): Record<string, string> {
  const root = mkdtempSync(join(tmpdir(), "tu-cli-"));
  const env = {
    ...(process.env as Record<string, string>),
    TUI_USE_SOCKET: join(root, "run", "d.sock"),
    XDG_CONFIG_HOME: join(root, "config"),
    XDG_DATA_HOME: join(root, "data"),
    ...extra,
  };
  homes.push(env);
  return env;
}

export function runCli(
  env: Record<string, string>,
  args: string[],
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    execFile(process.execPath, [CLI, ...args], { env }, (err, stdout, stderr) => {
      const code = err ? ((err as { code?: number }).code ?? 1) : 0;
      resolve({ stdout, stderr, code: typeof code === "number" ? code : 1 });
    });
  });
}
