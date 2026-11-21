import { setTimeout as sleep } from "node:timers/promises";

export const HASH_RECHECK_MS = 50;

export interface SettleOptions {
  idleMs: number;
  timeoutMs: number;
  lastActivity: () => number;
  screenHash: () => Promise<string>;
  exited: () => boolean;
  started: () => boolean;
  now?: () => number;
  wait?: (ms: number) => Promise<unknown>;
}

export async function settle(options: SettleOptions): Promise<boolean> {
  const now = options.now ?? Date.now;
  const wait = options.wait ?? sleep;
  const deadline = now() + options.timeoutMs;

  while (true) {
    if (options.exited()) return true;
    const remaining = deadline - now();
    if (remaining <= 0) return false;

    if (!options.started()) {
      await wait(Math.min(HASH_RECHECK_MS, remaining));
      continue;
    }

    const quietFor = now() - options.lastActivity();
    if (quietFor < options.idleMs) {
      await wait(Math.min(options.idleMs - quietFor, remaining));
      continue;
    }

    const activity = options.lastActivity();
    const first = await options.screenHash();
    await wait(Math.min(HASH_RECHECK_MS, Math.max(0, deadline - now())));
    if (options.lastActivity() !== activity) continue;
    const second = await options.screenHash();
    if (first === second) return true;
  }
}
