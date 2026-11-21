import { describe, expect, it } from "vitest";
import { settle } from "../../../src/session/settle.js";

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

describe("settle", () => {
  it("settles after a burst writer stops", async () => {
    const c = clock();
    let last = 0;
    let screen = "0";
    for (let i = 1; i <= 5; i++) {
      c.at(i * 100, () => {
        last = c.now();
        screen = String(i);
      });
    }
    const settled = await settle({
      idleMs: 300,
      timeoutMs: 5000,
      lastActivity: () => last,
      screenHash: async () => screen,
      exited: () => false,
      started: () => true,
      now: c.now,
      wait: (ms) => c.wait(ms),
    });
    expect(settled).toBe(true);
    expect(screen).toBe("5");
    expect(c.now()).toBeGreaterThanOrEqual(800);
    expect(c.now()).toBeLessThan(1000);
  });

  it("times out on a spinner", async () => {
    const c = clock();
    let last = 0;
    for (let i = 1; i < 100; i++) c.at(i * 80, () => (last = c.now()));
    const settled = await settle({
      idleMs: 300,
      timeoutMs: 2000,
      lastActivity: () => last,
      screenHash: async () => String(last),
      exited: () => false,
      started: () => true,
      now: c.now,
      wait: (ms) => c.wait(ms),
    });
    expect(settled).toBe(false);
    expect(c.now()).toBe(2000);
  });

  it("returns at once when the process has exited", async () => {
    const c = clock();
    const settled = await settle({
      idleMs: 300,
      timeoutMs: 5000,
      lastActivity: () => 0,
      screenHash: async () => "",
      exited: () => true,
      started: () => true,
      now: c.now,
      wait: (ms) => c.wait(ms),
    });
    expect(settled).toBe(true);
    expect(c.now()).toBe(0);
  });

  it("waits for the screen hash to stop changing", async () => {
    const c = clock();
    let n = 0;
    const settled = await settle({
      idleMs: 0,
      timeoutMs: 5000,
      lastActivity: () => -1000,
      screenHash: async () => String(Math.min(n++, 3)),
      exited: () => false,
      started: () => true,
      now: c.now,
      wait: (ms) => c.wait(ms),
    });
    expect(settled).toBe(true);
    expect(n).toBeGreaterThanOrEqual(5);
  });
});

it("does not settle before the first output", async () => {
  const c = clock();
  let started = false;
  let last = 0;
  c.at(1200, () => {
    started = true;
    last = c.now();
  });
  const settled = await settle({
    idleMs: 300,
    timeoutMs: 5000,
    lastActivity: () => last,
    screenHash: async () => String(started),
    exited: () => false,
    started: () => started,
    now: c.now,
    wait: (ms) => c.wait(ms),
  });
  expect(settled).toBe(true);
  expect(c.now()).toBeGreaterThanOrEqual(1500);
});
