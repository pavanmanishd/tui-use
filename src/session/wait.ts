export interface WaitSpec {
  text?: string;
  regex?: string;
  gone?: string;
  idle_ms?: number;
  exit?: boolean;
  timeout_ms?: number;
}

export type Condition = "text" | "regex" | "gone" | "idle_ms" | "exit";

export const DEFAULT_TIMEOUT_MS = 5000;
export const MAX_TIMEOUT_MS = 600_000;
export const DEFAULT_IDLE_MS = 300;

export interface NormalizedWait {
  timeoutMs: number;
  settle: boolean;
  settleIdleMs: number;
  text?: string;
  regex?: RegExp;
  gone?: string;
  idleMs?: number;
  exit?: boolean;
}

export interface WaitState {
  screen: string;
  exited: boolean;
  outputIdleMs: number;
}

export function normalizeWait(spec: WaitSpec | undefined): NormalizedWait {
  const s = spec ?? {};
  const timeoutMs = Math.min(Math.max(0, s.timeout_ms ?? DEFAULT_TIMEOUT_MS), MAX_TIMEOUT_MS);
  let regex: RegExp | undefined;
  if (s.regex !== undefined) {
    try {
      regex = new RegExp(s.regex, "m");
    } catch (err) {
      throw new Error(`invalid wait regex: ${(err as Error).message}`);
    }
  }
  const hasCondition =
    s.text !== undefined ||
    regex !== undefined ||
    s.gone !== undefined ||
    s.idle_ms !== undefined ||
    s.exit === true;
  return {
    timeoutMs,
    settle: !hasCondition,
    settleIdleMs: DEFAULT_IDLE_MS,
    text: s.text,
    regex,
    gone: s.gone,
    idleMs: s.idle_ms,
    exit: s.exit === true ? true : undefined,
  };
}

export function firedCondition(wait: NormalizedWait, state: WaitState): Condition | null {
  if (wait.text !== undefined && state.screen.includes(wait.text)) return "text";
  if (wait.regex?.test(state.screen)) return "regex";
  if (wait.gone !== undefined && !state.screen.includes(wait.gone)) return "gone";
  if (wait.exit && state.exited) return "exit";
  if (wait.idleMs !== undefined && state.outputIdleMs >= wait.idleMs) return "idle_ms";
  return null;
}
