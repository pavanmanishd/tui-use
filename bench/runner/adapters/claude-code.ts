import { type Adapter, empty, type Metrics, TUI_USE_SERVER } from "./types.js";

const CONFIG = "/home/agent/.bench-mcp.json";

export const claudeCode: Adapter = {
  name: "claude-code",
  keyEnvs: ["ANTHROPIC_API_KEY", "CLAUDE_CODE_OAUTH_TOKEN"],
  async prepare(container, condition) {
    const servers = condition === "tui-use" ? { "tui-use": TUI_USE_SERVER } : {};
    await container.write(CONFIG, JSON.stringify({ mcpServers: servers }));
  },
  command(prompt, model) {
    return [
      "claude",
      "-p",
      prompt,
      "--output-format",
      "stream-json",
      "--verbose",
      "--dangerously-skip-permissions",
      "--model",
      model,
      "--strict-mcp-config",
      "--mcp-config",
      CONFIG,
    ];
  },
  parse(stdout): Metrics {
    const events = parseEvents(stdout);
    if (events.length === 0) return { ...empty, agentError: "claude printed no JSON result" };
    const result = events.find((e) => e?.type === "result");
    if (!result) return { ...empty, agentError: "claude printed no result event" };
    const u = result.usage;
    return {
      turns: result.num_turns ?? null,
      inputTokens: u
        ? (u.input_tokens ?? 0) +
          (u.cache_creation_input_tokens ?? 0) +
          (u.cache_read_input_tokens ?? 0)
        : null,
      outputTokens: u?.output_tokens ?? null,
      costUsd: result.total_cost_usd ?? null,
      agentError: result.is_error
        ? String(result.terminal_reason ?? result.subtype ?? "error")
        : null,
      apiError: result.terminal_reason === "api_error" || result.api_error_status != null,
      ...toolCounts(events),
    };
  },
};

// biome-ignore lint/suspicious/noExplicitAny: events are untyped CLI output
type Event = any;

function parseEvents(stdout: string): Event[] {
  try {
    const parsed = JSON.parse(stdout);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return stdout
      .split("\n")
      .filter((l) => l.startsWith("{"))
      .flatMap((l) => {
        try {
          return [JSON.parse(l)];
        } catch {
          return [];
        }
      });
  }
}

function toolCounts(events: Event[]): { toolCalls: number | null; tuiUseCalls: number | null } {
  const assistant = events.filter((e) => e?.type === "assistant");
  if (assistant.length === 0) return { toolCalls: null, tuiUseCalls: null };
  const names: string[] = assistant.flatMap((e) =>
    (e.message?.content ?? [])
      .filter((c: Event) => c?.type === "tool_use")
      .map((c: Event) => String(c.name)),
  );
  return {
    toolCalls: names.length,
    tuiUseCalls: names.filter((n) => n.startsWith("mcp__tui-use__")).length,
  };
}
