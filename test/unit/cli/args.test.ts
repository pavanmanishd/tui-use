import { describe, expect, it } from "vitest";
import { helpText, inputTokens, parse, USAGE, UsageError } from "../../../src/cli/commands.js";
import { buildInput, formatList, formatScreen } from "../../../src/format.js";

describe("inputTokens", () => {
  it("treats key names as keys and everything else as text", () => {
    expect(inputTokens(["esc", ":wq", "enter", "q", "text:enter", "ctrl+c"])).toEqual([
      { key: "esc" },
      { text: ":wq" },
      { key: "enter" },
      { text: "q" },
      { text: "enter" },
      { key: "ctrl+c" },
    ]);
  });
});

describe("parse", () => {
  it("raises a usage error with the command usage", () => {
    expect(() => parse("snapshot", ["s1", "--bogus"], {})).toThrow(UsageError);
    expect(() => parse("snapshot", ["s1", "--bogus"], {})).toThrow(USAGE.snapshot as string);
  });

  it("hints to quote commands with flags", () => {
    expect(() => parse("start", ["git", "rebase", "-i"], {})).toThrow(/quote the command/);
  });

  it("documents every command in help", () => {
    for (const command of [
      "start",
      "send",
      "snapshot",
      "wait",
      "scrollback",
      "attach",
      "replay",
      "mcp",
    ]) {
      expect(helpText()).toContain(`tui-use ${command}`);
    }
  });
});

describe("buildInput", () => {
  const secret = (name: string) => `<${name}>`;

  it("orders text, secret, then keys", () => {
    expect(buildInput({ text: "a", secret_env: "PW", keys: ["enter"] }, secret)).toEqual([
      { text: "a" },
      { secret: "<PW>" },
      { key: "enter" },
    ]);
  });

  it("uses paste for text when asked", () => {
    expect(buildInput({ text: "a\nb", paste: true }, secret)).toEqual([{ paste: "a\nb" }]);
  });

  it("prefers the ordered input array", () => {
    expect(
      buildInput(
        { text: "ignored", input: [{ key: "esc" }, { secret_env: "PW" }, { text: "x" }] },
        secret,
      ),
    ).toEqual([{ key: "esc" }, { secret: "<PW>" }, { text: "x" }]);
  });
});

describe("format", () => {
  const base = { session: "s1", text: "SCREEN", state: "running" as const, exit_code: null };

  it("adds a status line only when useful", () => {
    expect(formatScreen({ ...base, settled: true, timed_out: false })).toBe("SCREEN");
    expect(formatScreen({ ...base, fired: "text", timed_out: false })).toBe(
      "SCREEN\n(wait fired: text)",
    );
    expect(formatScreen({ ...base, timed_out: true }, 300)).toBe(
      "SCREEN\n(wait timed out after 300ms)",
    );
    expect(formatScreen({ ...base, settled: false, timed_out: true })).toMatch(
      /still changing after 5000ms/,
    );
  });

  it("lists sessions", () => {
    expect(formatList([])).toBe("no sessions");
    expect(
      formatList([
        {
          id: "s1",
          name: "py",
          command: "python3",
          cwd: "/",
          cols: 120,
          rows: 40,
          state: "exited",
          exit_code: 0,
          idle_ms: 5,
          created_at: "",
          owner: "mcp",
        },
      ]),
    ).toBe("s1 (py) · exited 0 · 120x40 · idle 5ms · owner mcp · python3");
  });
});

describe("mouse tokens", () => {
  it("parses mouse:ACTION:ROW:COL", () => {
    expect(inputTokens(["mouse:click:5:12"])).toEqual([
      { mouse: { action: "click", row: 5, col: 12 } },
    ]);
    expect(() => inputTokens(["mouse:poke:1:1"])).toThrow(/unknown mouse action poke/);
  });
});
