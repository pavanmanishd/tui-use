import { spawn } from "node:child_process";

export interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export function sh(
  argv: string[],
  options: { timeoutMs?: number; input?: string } = {},
): Promise<ExecResult> {
  return new Promise((resolve) => {
    const child = spawn(argv[0] as string, argv.slice(1), { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    child.stdout.on("data", (d) => {
      stdout += d;
    });
    child.stderr.on("data", (d) => {
      stderr += d;
    });
    const timer = options.timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          child.kill("SIGKILL");
        }, options.timeoutMs)
      : undefined;
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr, timedOut });
    });
    child.stdin.end(options.input ?? "");
  });
}

export async function must(argv: string[]): Promise<string> {
  const r = await sh(argv);
  if (r.code !== 0) throw new Error(`${argv.join(" ")} failed (${r.code}): ${r.stderr.trim()}`);
  return r.stdout;
}

export interface Container {
  name: string;
  exec(
    cmd: string[],
    options?: { user?: string; env?: Record<string, string>; timeoutMs?: number; input?: string },
  ): Promise<ExecResult>;
  write(path: string, content: string, user?: string): Promise<void>;
  remove(): Promise<void>;
}

export async function startContainer(
  image: string,
  name: string,
  tasksDir: string,
): Promise<Container> {
  await must([
    "docker",
    "run",
    "-d",
    "--rm",
    "--name",
    name,
    "-v",
    `${tasksDir}:/bench/tasks:ro`,
    image,
  ]);
  const container: Container = {
    name,
    exec(cmd, options = {}) {
      const argv = ["docker", "exec", "-i", "-u", options.user ?? "root", "-w", "/home/agent/work"];
      for (const [k, v] of Object.entries(options.env ?? {})) argv.push("-e", `${k}=${v}`);
      argv.push(name, ...cmd);
      return sh(argv, { timeoutMs: options.timeoutMs, input: options.input });
    },
    async write(path, content, user = "agent") {
      const r = await container.exec(
        ["sh", "-c", 'mkdir -p "$(dirname "$1")" && cat > "$1"', "sh", path],
        {
          user,
          input: content,
        },
      );
      if (r.code !== 0) throw new Error(`writing ${path} failed: ${r.stderr}`);
    },
    async remove() {
      await sh(["docker", "rm", "-f", name]);
    },
  };
  return container;
}

export async function pool<T, R>(
  items: T[],
  jobs: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(jobs, items.length)) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i] as T);
    }
  });
  await Promise.all(workers);
  return results;
}
