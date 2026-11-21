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
      "json",
      "--dangerously-skip-permissions",
      "--model",
      model,
      "--strict-mcp-config",
      "--mcp-config",
      CONFIG,
    ];
  },
  parse(stdout): Metrics {
    let parsed: unknown;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      return { ...empty, agentError: "claude printed no JSON result" };
    }
    const events = Array.isArray(parsed) ? parsed : [parsed];
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
    };
  },
};
