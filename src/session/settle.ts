import { setTimeout as sleep } from "node:timers/promises";

export const HASH_RECHECK_MS = 50;
export const SPINNER_SAMPLE_MS = 250;
const SPINNER_SAMPLES = 3;
const SPINNER_MAX_SPAN = 4;

export interface SettleOptions {
  idleMs: number;
  timeoutMs: number;
  lastActivity: () => number;
  screenRows: () => Promise<string[]>;
  exited: () => boolean;
  started: () => boolean;
  now?: () => number;
  wait?: (ms: number) => Promise<unknown>;
}

export interface SettleResult {
  settled: boolean;
  spinnerRow?: number;
}

function changedSpan(a: string, b: string): number {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let end = 0;
  while (
    end < a.length - start &&
    end < b.length - start &&
    a[a.length - 1 - end] === b[b.length - 1 - end]
  ) {
    end++;
  }
  return Math.max(a.length, b.length) - start - end;
}

export function onlySpinnerMoving(samples: string[][]): { ok: boolean; row?: number } {
  let row: number | undefined;
  let quietPairs = 0;
  for (let s = 1; s < samples.length; s++) {
    const before = samples[s - 1] as string[];
    const after = samples[s] as string[];
    if (before.length !== after.length) return { ok: false };
    const changed = after.flatMap((line, i) => (line === before[i] ? [] : [i]));
    if (changed.length === 0) {
      quietPairs++;
      continue;
    }
    const i = changed[0] as number;
    if (changed.length > 1 || (row !== undefined && row !== i + 1)) return { ok: false };
    if (changedSpan(before[i] as string, after[i] as string) > SPINNER_MAX_SPAN)
      return { ok: false };
    row = i + 1;
  }
  if (row === undefined) return { ok: true };
  return quietPairs === 0 ? { ok: true, row } : { ok: false };
}

export async function settle(options: SettleOptions): Promise<SettleResult> {
  const now = options.now ?? Date.now;
  const wait = options.wait ?? sleep;
  const deadline = now() + options.timeoutMs;
  const samples: string[][] = [];

  while (true) {
    if (options.exited()) return { settled: true };
    const remaining = deadline - now();
    if (remaining <= 0) return { settled: false };

    if (!options.started()) {
      await wait(Math.min(HASH_RECHECK_MS, remaining));
      continue;
    }

    const quietFor = now() - options.lastActivity();
    if (quietFor < options.idleMs) {
      samples.push(await options.screenRows());
      if (samples.length > SPINNER_SAMPLES) samples.shift();
      if (samples.length === SPINNER_SAMPLES) {
        const spinner = onlySpinnerMoving(samples);
        if (spinner.ok) return { settled: true, spinnerRow: spinner.row };
      }
      await wait(Math.min(SPINNER_SAMPLE_MS, remaining));
      continue;
    }

    const activity = options.lastActivity();
    const first = (await options.screenRows()).join("\n");
    await wait(Math.min(HASH_RECHECK_MS, Math.max(0, deadline - now())));
    if (options.lastActivity() !== activity) continue;
    const second = (await options.screenRows()).join("\n");
    if (first === second) return { settled: true };
  }
}
