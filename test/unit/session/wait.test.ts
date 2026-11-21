import { describe, expect, it } from "vitest";
import { firedCondition, normalizeWait } from "../../../src/session/wait.js";

const state = (screen: string, extra: Partial<{ exited: boolean; outputIdleMs: number }> = {}) => ({
  screen,
  exited: false,
  outputIdleMs: 0,
  ...extra,
});

describe("normalizeWait", () => {
  it("settles by default with a 5 s timeout", () => {
    expect(normalizeWait(undefined)).toMatchObject({ settle: true, timeoutMs: 5000 });
  });

  it("settles when only a timeout is given", () => {
    expect(normalizeWait({ timeout_ms: 100 })).toMatchObject({ settle: true, timeoutMs: 100 });
  });

  it("clamps the timeout to 600000", () => {
    expect(normalizeWait({ text: "x", timeout_ms: 900_000 }).timeoutMs).toBe(600_000);
  });

  it("rejects a bad regex", () => {
    expect(() => normalizeWait({ regex: "([" })).toThrow(/invalid wait regex/);
  });
});

describe("firedCondition", () => {
  it.each([
    [{ text: "Is this OK?" }, state("About to write\nIs this OK? (yes)"), "text"],
    [{ regex: "^\\$ $" }, state("out\n$ "), "regex"],
    [{ gone: "Installing" }, state("Done"), "gone"],
    [{ exit: true }, state("", { exited: true }), "exit"],
    [{ idle_ms: 500 }, state("", { outputIdleMs: 600 }), "idle_ms"],
  ] as const)("fires %j", (spec, s, expected) => {
    expect(firedCondition(normalizeWait(spec), s)).toBe(expected);
  });

  it("returns null when nothing matches", () => {
    const wait = normalizeWait({ text: "a", gone: "b", idle_ms: 1000, exit: true });
    expect(firedCondition(wait, state("b"))).toBeNull();
  });

  it("combines conditions with OR", () => {
    const wait = normalizeWait({ text: "never", gone: "spinner" });
    expect(firedCondition(wait, state("finished"))).toBe("gone");
  });
});
