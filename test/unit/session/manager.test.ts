import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../../../src/daemon/config.js";
import { SessionManager } from "../../../src/session/manager.js";
import type { Session, SessionOptions } from "../../../src/session/session.js";

interface Fake extends SessionOptions {
  exitCode: number | null;
  exitedAt: number | null;
  lastOutputAt: number;
  lastInputAt: number;
  killed: boolean;
  readonly running: boolean;
  kill(): Promise<void>;
  dispose(): void;
  info(): { id: string };
}

function fake(o: SessionOptions) {
  const s: Fake = {
    ...o,
    exitCode: null as number | null,
    exitedAt: null as number | null,
    lastOutputAt: Date.now(),
    lastInputAt: Date.now(),
    killed: false,
    get running(): boolean {
      return s.exitCode === null;
    },
    async kill() {
      s.killed = true;
      s.exitCode = 143;
      s.exitedAt = Date.now();
    },
    dispose() {},
    info() {
      return { id: o.id };
    },
  };
  return s as unknown as Session & { killed: boolean };
}

const mcpA = { id: "c1", kind: "mcp" as const };
const mcpB = { id: "c2", kind: "mcp" as const };
const cli = { id: "c3", kind: "cli" as const };
const req = (command: string, name?: string) => ({
  command,
  cwd: "/",
  env: {},
  cols: 120,
  rows: 40,
  name,
});

function manager(overrides = {}) {
  return new SessionManager({ ...DEFAULT_CONFIG, ...overrides }, "/tmp/rec", fake);
}

describe("SessionManager", () => {
  it("assigns ids and finds sessions by id or name", () => {
    const m = manager();
    const a = m.start(req("vim"), mcpA);
    const b = m.start(req("npm init", "init"), mcpA);
    expect([a.id, b.id]).toEqual(["s1", "s2"]);
    expect(m.get("init")).toBe(b);
    expect(m.get("s1")).toBe(a);
  });

  it("names a recording after the session", () => {
    const s = manager().start(req("vim"), mcpA) as unknown as SessionOptions;
    expect(s.recordingPath).toMatch(/^\/tmp\/rec\/\d{8}-\d{6}-s1\.cast$/);
  });

  it("skips recordings when disabled", () => {
    const s = manager({ recordings: false }).start(req("vim"), mcpA) as unknown as SessionOptions;
    expect(s.recordingPath).toBeUndefined();
  });

  it("rejects a duplicate name among running sessions", () => {
    const m = manager();
    m.start(req("a", "init"), mcpA);
    expect(() => m.start(req("b", "init"), mcpA)).toThrow(/already named "init" \(s1\)/);
  });

  it("reuses the name of an exited session", async () => {
    const m = manager();
    const old = m.start(req("a", "init"), mcpA);
    await old.kill();
    const fresh = m.start(req("b", "init"), mcpA);
    expect(m.get("init")).toBe(fresh);
  });

  it("rejects names that look like ids", () => {
    expect(() => manager().start(req("vim", "s3"), mcpA)).toThrow(/reserved for ids/);
  });

  it("replaces every exited session sharing a reused name", async () => {
    const m = manager();
    const a = m.start(req("a", "job"), mcpA);
    await a.kill();
    const b = m.start(req("b", "job"), mcpA);
    await b.kill();
    const c = m.start(req("c", "job"), mcpA);
    expect(m.get("job")).toBe(c);
    expect(m.list()).toHaveLength(1);
  });

  it("lists sessions in the unknown-session error", () => {
    const m = manager();
    m.start(req("vim", "ed"), mcpA);
    expect(() => m.get("nope")).toThrow('no session "nope". sessions: s1 (ed) vim');
  });

  it("enforces the session limit", () => {
    const m = manager({ maxSessions: 1 });
    m.start(req("vim"), mcpA);
    expect(() => m.start(req("htop"), mcpA)).toThrow(/session limit reached \(1\).*s1 vim/);
  });

  it("refuses denied commands", () => {
    const m = manager({ deny: ["^rm -rf /"] });
    expect(() => m.start(req("rm -rf /"), cli)).toThrow(
      "command refused by deny pattern /^rm -rf \\//",
    );
  });

  it("lets the owner and the CLI control a session, not other MCP clients", () => {
    const m = manager();
    const s = m.start(req("vim"), mcpA);
    expect(() => m.assertControl(s, mcpA)).not.toThrow();
    expect(() => m.assertControl(s, cli)).not.toThrow();
    expect(() => m.assertControl(s, mcpB)).toThrow(/belongs to another mcp client/);
  });

  it("kills sessions owned by a closed connection", async () => {
    const m = manager();
    const a = m.start(req("a"), mcpA);
    const b = m.start(req("b"), mcpA);
    const c = m.start(req("c"), mcpB);
    await m.ownerClosed(mcpA.id);
    expect([a, b, c].map((s) => (s as Session & { killed: boolean }).killed)).toEqual([
      true,
      true,
      false,
    ]);
    expect(m.list()).toHaveLength(1);
  });

  it("kills idle sessions", async () => {
    const m = manager({ idleTimeoutMinutes: 1 });
    const s = m.start(req("a"), cli) as Session & { killed: boolean };
    await m.sweepIdle(Date.now() + 30_000);
    expect(s.killed).toBe(false);
    await m.sweepIdle(Date.now() + 61_000);
    expect(s.killed).toBe(true);
    expect(m.list()).toHaveLength(0);
  });
});
