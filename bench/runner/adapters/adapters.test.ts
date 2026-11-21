import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { claudeCode } from "./claude-code.js";
import { gemini } from "./gemini.js";
import { opencode } from "./opencode.js";

const fixture = (name: string) =>
  readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8");

describe("claude-code adapter", () => {
  it("reads turns, tokens and cost from the result event", () => {
    expect(claudeCode.parse(fixture("claude-code.json"))).toEqual({
      turns: 1,
      inputTokens: 2 + 19439 + 24652,
      outputTokens: 73,
      costUsd: 0.0042964200000000004,
      agentError: null,
    });
  });

  it("accepts a single result object", () => {
    const one = JSON.stringify({
      type: "result",
      num_turns: 3,
      usage: { output_tokens: 5 },
      is_error: true,
      subtype: "error_max_turns",
    });
    expect(claudeCode.parse(one)).toMatchObject({
      turns: 3,
      outputTokens: 5,
      agentError: "error_max_turns",
    });
  });

  it("reports missing output instead of guessing", () => {
    expect(claudeCode.parse("")).toMatchObject({
      turns: null,
      agentError: "claude printed no JSON result",
    });
  });

  it("builds a strict MCP command", () => {
    const argv = claudeCode.command("do it", "claude-opus-5-5");
    expect(argv).toContain("--strict-mcp-config");
    expect(argv.slice(0, 3)).toEqual(["claude", "-p", "do it"]);
  });
});

describe("gemini adapter", () => {
  it("sums requests and tokens across models", () => {
    expect(gemini.parse(fixture("gemini.json"))).toEqual({
      turns: 3,
      inputTokens: 24939 + 8965,
      outputTokens: 20 + 154 + 10 + 30,
      costUsd: null,
      agentError: null,
    });
  });

  it("skips log lines before the JSON", () => {
    expect(gemini.parse(`Loaded cached credentials.\n${fixture("gemini.json")}`).turns).toBe(3);
  });
});

describe("opencode adapter", () => {
  it("counts steps and sums tokens and cost", () => {
    expect(opencode.parse(fixture("opencode.jsonl"))).toEqual({
      turns: 2,
      inputTokens: 1200 + 1500 + 800,
      outputTokens: 52,
      costUsd: 0.003,
      agentError: null,
    });
  });

  it("reports an error event when there are no steps", () => {
    const line = JSON.stringify({ type: "error", error: { name: "ProviderAuthError" } });
    expect(opencode.parse(line).agentError).toContain("ProviderAuthError");
  });

  it("routes models through OpenRouter", () => {
    expect(opencode.command("p", "qwen/qwen3-coder")).toContain("openrouter/qwen/qwen3-coder");
  });
});
