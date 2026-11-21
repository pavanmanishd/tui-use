import { describe, expect, it } from "vitest";
import { z } from "zod";
import { tools } from "../../../src/mcp/tools.js";

const schema = (name: keyof typeof tools) => z.object(tools[name].inputSchema);

describe("MCP tool schemas", () => {
  it("defines the six tools with descriptions", () => {
    expect(Object.keys(tools).sort()).toEqual([
      "tui_manage",
      "tui_scrollback",
      "tui_send",
      "tui_snapshot",
      "tui_start",
      "tui_wait",
    ]);
    for (const def of Object.values(tools)) expect(def.description.length).toBeGreaterThan(40);
  });

  it("matches the spec parameter tables", () => {
    expect(Object.keys(tools.tui_start.inputSchema).sort()).toEqual(
      ["command", "cols", "cwd", "env", "name", "rows", "wait"].sort(),
    );
    expect(Object.keys(tools.tui_send.inputSchema).sort()).toEqual(
      ["input", "keys", "mode", "paste", "secret_env", "session", "text", "wait"].sort(),
    );
    expect(Object.keys(tools.tui_snapshot.inputSchema).sort()).toEqual([
      "mode",
      "session",
      "styles",
    ]);
    expect(Object.keys(tools.tui_wait.inputSchema).sort()).toEqual(["mode", "session", "wait"]);
    expect(Object.keys(tools.tui_scrollback.inputSchema).sort()).toEqual([
      "lines",
      "search",
      "session",
    ]);
    expect(Object.keys(tools.tui_manage.inputSchema).sort()).toEqual(
      ["action", "cols", "rows", "session", "signal"].sort(),
    );
  });

  it("accepts the vim save-and-quit example", () => {
    const parsed = schema("tui_send").parse({
      session: "s1",
      input: [{ key: "esc" }, { text: ":wq" }, { key: "enter" }],
    });
    expect(parsed.input).toHaveLength(3);
  });

  it("rejects unknown wait fields", () => {
    expect(() => schema("tui_wait").parse({ session: "s1", wait: { txt: "x" } })).toThrow();
  });
});
