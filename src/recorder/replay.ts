import { readFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

export interface ReplayOptions {
  speed: number;
  write: (data: string) => void;
  wait?: (ms: number) => Promise<unknown>;
}

export async function replay(path: string, options: ReplayOptions): Promise<void> {
  const wait = options.wait ?? sleep;
  const lines = readFileSync(path, "utf8").split("\n").filter(Boolean);
  const header = JSON.parse(lines[0] ?? "{}");
  if (header.version !== 2) throw new Error(`${path} is not an asciinema v2 recording`);
  let previous = 0;
  for (const line of lines.slice(1)) {
    const [time, type, data] = JSON.parse(line) as [number, string, string];
    const delay = ((time - previous) * 1000) / options.speed;
    previous = time;
    if (delay > 0) await wait(delay);
    if (type === "o") options.write(data);
  }
}
