import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fixture } from "../helpers/fixture.js";
import { startSession } from "../helpers/session.js";

describe("Session", () => {
  it("settles after bursts", async () => {
    const s = startSession(fixture("burst.mjs"));
    const outcome = await s.wait(undefined);
    expect(outcome).toEqual({ settled: true, timed_out: false });
    expect(await s.screenText()).toContain("burst 5");
  });

  it("reports settled false on a spinner", async () => {
    const s = startSession(fixture("spinner.mjs"));
    const start = Date.now();
    const outcome = await s.wait({ timeout_ms: 1000 });
    expect(outcome).toEqual({ settled: false, timed_out: true });
    expect(Date.now() - start).toBeGreaterThanOrEqual(950);
  });

  it("waits for text across slow output", async () => {
    const s = startSession(fixture("slow.mjs", "3", "200"));
    const outcome = await s.wait({ text: "done", timeout_ms: 5000 });
    expect(outcome).toEqual({ fired: "text", timed_out: false });
  });

  it("returns at once when the text is already there", async () => {
    const s = startSession(fixture("lines.mjs", "5"));
    await s.wait({ text: "line 5" });
    const start = Date.now();
    expect(await s.wait({ text: "line 3" })).toEqual({ fired: "text", timed_out: false });
    expect(Date.now() - start).toBeLessThan(200);
  });

  it("waits for text to disappear", async () => {
    const s = startSession(
      `${fixture("spinner.mjs")} & sleep 0.5; kill $!; clear; echo finished; sleep 5`,
    );
    expect(await s.wait({ gone: "Installing", timeout_ms: 5000 })).toMatchObject({ fired: "gone" });
  });

  it("waits for exit and keeps the final screen", async () => {
    const s = startSession(fixture("exit.mjs", "3"));
    expect(await s.wait({ exit: true })).toMatchObject({ fired: "exit" });
    expect(s.exitCode).toBe(3);
    expect(s.info().state).toBe("exited");
    expect(await s.snapshot("full", "marks")).toContain("bye");
    expect(() => s.send([{ text: "x" }])).toThrow(/has exited \(code 3\)/);
  });

  it("waits for output idle", async () => {
    const s = startSession(fixture("slow.mjs", "2", "100"));
    expect(await s.wait({ idle_ms: 400, timeout_ms: 3000 })).toMatchObject({ fired: "idle_ms" });
  });

  it("times out an explicit wait", async () => {
    const s = startSession(fixture("burst.mjs"));
    expect(await s.wait({ text: "never", timeout_ms: 300 })).toEqual({ timed_out: true });
  });

  it("sends text, keys and ordered input", async () => {
    const s = startSession(fixture("keys.mjs"));
    await s.wait({ text: "ready" });
    s.send([{ text: "hi\n" }, { key: "up" }, { key: "ctrl+a" }]);
    await s.wait({ text: '"\\u0001"' });
    const text = await s.screenText();
    expect(text).toContain('got "hi\\r\\u001b[A\\u0001"');
  });

  it("encodes cursor keys for application cursor mode", async () => {
    const s = startSession(fixture("keys.mjs", "app"));
    await s.wait({ text: "ready" });
    s.send([{ key: "up" }]);
    await s.wait({ text: "got" });
    expect(await s.screenText()).toContain('got "\\u001bOA"');
  });

  it("rejects an unknown key without writing anything", async () => {
    const s = startSession(fixture("keys.mjs"));
    await s.wait({ text: "ready" });
    expect(() => s.send([{ text: "abc" }, { key: "ctrl+enterr" }])).toThrow(/unknown key/);
    await s.wait({ idle_ms: 200 });
    expect(await s.screenText()).not.toContain("got");
  });

  it("uses bracketed paste when the program enabled it", async () => {
    const s = startSession(fixture("paste.mjs"));
    await s.wait({ text: "ready" });
    s.send([{ paste: "a\nb" }]);
    await s.wait({ text: "got" });
    expect(await s.screenText()).toContain('got "\\u001b[200~a\\rb\\u001b[201~"');
  });

  it("types pasted text when bracketed paste is off", async () => {
    const s = startSession(fixture("keys.mjs"));
    await s.wait({ text: "ready" });
    s.send([{ paste: "a\nb" }]);
    await s.wait({ text: "got" });
    expect(await s.screenText()).toContain('got "a\\rb"');
  });

  it("keeps secrets out of snapshots, scrollback and recordings", async () => {
    const s = startSession(fixture("secret-echo.mjs"), { record: true });
    await s.wait({ text: "Password:" });
    s.send([{ secret: "hunter2" }, { key: "enter" }]);
    await s.wait({ text: "you typed" });
    const snap = await s.snapshot("full", "marks");
    expect(snap).toContain("you typed: ***");
    expect(snap).not.toContain("hunter2");
    expect(await s.scrollback({ search: "hunter2" })).toContain("no matches");
    await s.kill();
    expect(readFileSync(s.recordingPath as string, "utf8")).not.toContain("hunter2");
  });

  it("marks the selected menu item and follows arrow keys", async () => {
    const s = startSession(fixture("menu.mjs"));
    await s.wait({ text: "cherry" });
    s.send([{ key: "down" }]);
    await s.wait(undefined);
    const snap = await s.snapshot("full", "marks");
    expect(snap).toContain("«> banana»");
    expect(snap).toMatch(/· alt ·/);
  });

  it("marks a colour-bar selection", async () => {
    const s = startSession(fixture("menu.mjs", "bar"));
    await s.wait({ text: "cherry" });
    expect(await s.snapshot("full", "marks")).toContain("«> apple»");
  });

  it("returns diffs after the first snapshot", async () => {
    const s = startSession(fixture("keys.mjs"));
    await s.wait({ text: "ready" });
    expect(await s.snapshot("diff", "marks")).toContain(" 1│ready");
    s.send([{ text: "x" }]);
    await s.wait(undefined);
    const diff = await s.snapshot("diff", "marks");
    expect(diff).toContain('got "x"');
    expect(diff).toMatch(/\(\d+ of 24 rows changed\)/);
    expect(diff).not.toContain(" 1│ready");
  });

  it("escalates to SIGKILL when SIGTERM is ignored", async () => {
    const s = startSession(fixture("ignore-term.mjs"));
    await s.wait({ text: "ready" });
    const start = Date.now();
    await s.kill();
    expect(Date.now() - start).toBeGreaterThanOrEqual(1900);
    expect(s.running).toBe(false);
  });

  it("resizes the program and the screen", async () => {
    const s = startSession("sleep 0.3; stty size; sleep 5", { cols: 80, rows: 24 });
    s.resize(100, 30);
    await s.wait({ text: "30 100" });
    expect(await s.snapshot("full", "marks")).toContain("100x30");
  });

  it("reads and searches scrollback", async () => {
    const s = startSession(fixture("lines.mjs", "200"));
    await s.wait({ text: "line 200" });
    const last = await s.scrollback({ lines: [-2, -1] });
    expect(last).toContain("199│line 199");
    expect(last).toContain("200│line 200");
    const found = await s.scrollback({ search: "error" });
    expect(found).toContain("118│line 118");
    expect(found).toContain("123│line 123");
  });
});

describe("Session hardening", () => {
  it("kills a grandchild that ignores SIGTERM after its parent exits", async () => {
    const s = startSession(`${fixture("ignore-term.mjs")} & wait`);
    await s.wait({ regex: "ready \\d+" });
    const pid = Number(/ready (\d+)/.exec(await s.screenText())?.[1]);
    await s.kill();
    expect(() => process.kill(pid, 0)).toThrow();
  });

  it("clears the idle timer and listeners once a wait finishes", async () => {
    const s = startSession(fixture("spinner.mjs"));
    expect(await s.wait({ idle_ms: 10_000, timeout_ms: 300 })).toEqual({ timed_out: true });
    expect(s.listenerCount("parsed")).toBe(0);
    expect(s.listenerCount("exit")).toBe(0);
  });

  it("redacts a secret that wraps across rows", async () => {
    const secret = "abcdefghij0123456789";
    const s = startSession(`printf '%70s'; printf "$TOKEN"; printf '\\n'; sleep 5`, {
      env: { TOKEN: secret },
    });
    await s.wait(undefined);
    s.send([{ secret }]);
    await s.wait({ idle_ms: 100 });
    const snap = await s.snapshot("full", "marks");
    expect(snap).not.toContain("abcdefghij");
    expect(snap).not.toContain("0123456789");
    expect(snap).toContain("***");
    const back = await s.scrollback({ lines: [1, -1] });
    expect(back).not.toContain("abcdefghij");
  });

  it("does not leave a process behind when the recording cannot be created", () => {
    expect(() => startSession("sleep 30", { recordingPath: "/dev/null/nope/s1.cast" })).toThrow();
  });
});

describe("waits after input", () => {
  it("does not fire on text that was on screen before the program reacted", async () => {
    const s = startSession(`${fixture("keys.mjs")}`);
    await s.wait({ text: "ready" });
    const before = s.outputChunks;
    s.send([{ text: "x" }]);
    const outcome = await s.wait({ text: "ready", timeout_ms: 3000 }, before);
    expect(outcome).toMatchObject({ fired: "text" });
    expect(await s.screenText()).toContain('got "x"');
  });

  it("times out when the program never reacts", async () => {
    const s = startSession("sleep 30");
    await s.wait({ idle_ms: 100 });
    const before = s.outputChunks;
    s.send([{ text: "" }]);
    expect(await s.wait({ gone: "nothing here", timeout_ms: 300 }, before)).toEqual({
      timed_out: true,
    });
  });
});
