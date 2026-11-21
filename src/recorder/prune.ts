import { readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

export function pruneRecordings(dir: string, retentionDays: number, now = Date.now()): string[] {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  const cutoff = now - retentionDays * 24 * 60 * 60 * 1000;
  const removed: string[] = [];
  for (const name of names) {
    if (!name.endsWith(".cast")) continue;
    const path = join(dir, name);
    if (statSync(path).mtimeMs < cutoff) {
      rmSync(path);
      removed.push(path);
    }
  }
  return removed;
}
