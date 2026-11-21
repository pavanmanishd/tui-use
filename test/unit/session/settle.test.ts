import { describe, expect, it } from "vitest";
import { onlySpinnerMoving, settle } from "../../../src/session/settle.js";

function clock() {
  let t = 0;
  const events: Array<{ at: number; fn: () => void }> = [];
  return {
    now: () => t,
    at(ms: number, fn: () => void) {
      events.push({ at: ms, fn });
    },
    async wait(ms: number) {
      const target = t + ms;
      for (const e of events
        .filter((e) => e.at > t && e.at <= target)
        .sort((a, b) => a.at - b.at)) {
        t = e.at;
        e.fn();
      }
      t = target;
    },
  };
}

function base(c: ReturnType<typeof clock>) {
  return { now: c.now, wait: (ms: number) => c.wait(ms), exited: () => false, started: () => true };
}

describe("settle", () => {
  it("settles after a burst writer stops", async () => {
    const c = clock();
    let last = 0;
    let screen = ["0"];
    for (let i = 1; i <= 5; i++) {
      c.at(i * 100, () => {
        last = c.now();
        screen = Array.from({ length: i }, (_, k) => `line ${k}`);
      });
    }
    const result = await settle({
      ...base(c),
      idleMs: 300,
      timeoutMs: 5000,
      lastActivity: () => last,
      screenRows: async () => screen,
    });
    expect(result).toEqual({ settled: true });
    expect(screen).toHaveLength(5);
    expect(c.now()).toBeGreaterThanOrEqual(800);
    expect(c.now()).toBeLessThan(1100);
  });

  it("reports a spinner instead of waiting for the timeout", async () => {
    const c = clock();
    let last = 0;
    const frames = ["|", "/", "-", "\\"];
    let n = 0;
    for (let i = 1; i < 100; i++) {
      c.at(i * 80, () => {
        last = c.now();
        n++;
      });
    }
    const result = await settle({
      ...base(c),
      idleMs: 300,
      timeoutMs: 5000,
      lastActivity: () => last,
      screenRows: async () => ["$ npm install", `Installing ${frames[n % 4]}`, ""],
    });
    expect(result).toEqual({ settled: true, spinnerRow: 2 });
    expect(c.now()).toBeLessThan(1000);
  });

  it("keeps waiting while several rows change", async () => {
    const c = clock();
    let last = 0;
    let n = 0;
    for (let i = 1; i < 100; i++) {
      c.at(i * 80, () => {
        last = c.now();
        n++;
      });
    }
    const result = await settle({
      ...base(c),
      idleMs: 300,
      timeoutMs: 2000,
      lastActivity: () => last,
      screenRows: async () => [`log ${n}`, `progress ${n * 7}`],
    });
    expect(result).toEqual({ settled: false });
    expect(c.now()).toBe(2000);
  });

  it("returns at once when the process has exited", async () => {
    const c = clock();
    const result = await settle({
      ...base(c),
      exited: () => true,
      idleMs: 300,
      timeoutMs: 5000,
      lastActivity: () => 0,
      screenRows: async () => [],
    });
    expect(result).toEqual({ settled: true });
    expect(c.now()).toBe(0);
  });

  it("does not settle before the first output", async () => {
    const c = clock();
    let started = false;
    let last = 0;
    c.at(1200, () => {
      started = true;
      last = c.now();
    });
    const result = await settle({
      ...base(c),
      started: () => started,
      idleMs: 300,
      timeoutMs: 5000,
      lastActivity: () => last,
      screenRows: async () => [String(started)],
    });
    expect(result).toEqual({ settled: true });
    expect(c.now()).toBeGreaterThanOrEqual(1500);
  });
});

describe("onlySpinnerMoving", () => {
  it("accepts small changes confined to one row", () => {
    expect(
      onlySpinnerMoving([
        ["a", "x 1%"],
        ["a", "x 2%"],
        ["a", "x 3%"],
      ]),
    ).toEqual({ ok: true, row: 2 });
  });

  it("accepts an unchanged screen", () => {
    expect(onlySpinnerMoving([["a"], ["a"], ["a"]])).toEqual({ ok: true, row: undefined });
  });

  it("rejects changes on different rows or wide changes", () => {
    expect(
      onlySpinnerMoving([
        ["a", "b"],
        ["c", "b"],
        ["c", "d"],
      ]).ok,
    ).toBe(false);
    expect(onlySpinnerMoving([["a"], ["a long new line of output"], ["a"]]).ok).toBe(false);
  });
});
