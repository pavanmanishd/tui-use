import { type Adapter, empty, type Metrics, TUI_USE_SERVER } from "./types.js";

interface ModelStats {
  api?: { totalRequests?: number };
  tokens?: { prompt?: number; candidates?: number; thoughts?: number };
}

export const gemini: Adapter = {
  name: "gemini-cli",
  keyEnv: "GEMINI_API_KEY",
  async prepare(container, condition) {
    const settings = condition === "tui-use" ? { mcpServers: { "tui-use": TUI_USE_SERVER } } : {};
    await container.write("/home/agent/.gemini/settings.json", JSON.stringify(settings));
  },
  command(prompt, model) {
    return ["gemini", "-p", prompt, "-o", "json", "--yolo", "-m", model];
  },
  parse(stdout): Metrics {
    const start = stdout.indexOf("{");
    let parsed: { stats?: { models?: Record<string, ModelStats> }; error?: { message?: string } };
    try {
      parsed = JSON.parse(stdout.slice(start));
    } catch {
      return { ...empty, agentError: "gemini printed no JSON result" };
    }
    const models = Object.values(parsed.stats?.models ?? {});
    if (models.length === 0) return { ...empty, agentError: parsed.error?.message ?? "no stats" };
    const sum = (f: (m: ModelStats) => number | undefined) =>
      models.reduce((n, m) => n + (f(m) ?? 0), 0);
    return {
      turns: sum((m) => m.api?.totalRequests),
      inputTokens: sum((m) => m.tokens?.prompt),
      outputTokens: sum((m) => (m.tokens?.candidates ?? 0) + (m.tokens?.thoughts ?? 0)),
      costUsd: null,
      agentError: parsed.error?.message ?? null,
    };
  },
};
