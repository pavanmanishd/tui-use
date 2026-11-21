import { type Adapter, empty, type Metrics, TUI_USE_SERVER } from "./types.js";

interface StepFinish {
  cost?: number;
  tokens?: {
    input?: number;
    output?: number;
    reasoning?: number;
    cache?: { read?: number; write?: number };
  };
}

export const opencode: Adapter = {
  name: "opencode",
  keyEnv: "OPENROUTER_API_KEY",
  async prepare(container, condition) {
    const config: Record<string, unknown> = { $schema: "https://opencode.ai/config.json" };
    if (condition === "tui-use") {
      config.mcp = {
        "tui-use": {
          type: "local",
          command: [TUI_USE_SERVER.command, ...TUI_USE_SERVER.args],
          enabled: true,
        },
      };
    }
    await container.write("/home/agent/.config/opencode/opencode.json", JSON.stringify(config));
  },
  command(prompt, model) {
    return ["opencode", "run", "--format", "json", "--auto", "-m", `openrouter/${model}`, prompt];
  },
  parse(stdout): Metrics {
    const events = stdout
      .split("\n")
      .filter((l) => l.startsWith("{"))
      .flatMap((l) => {
        try {
          return [JSON.parse(l)];
        } catch {
          return [];
        }
      });
    const steps: StepFinish[] = events
      .filter((e) => e.type === "step_finish")
      .map((e) => e.part ?? {});
    const error = events.find((e) => e.type === "error");
    if (steps.length === 0) {
      return { ...empty, agentError: error ? JSON.stringify(error.error) : "no steps" };
    }
    const sum = (f: (s: StepFinish) => number | undefined) =>
      steps.reduce((n, s) => n + (f(s) ?? 0), 0);
    return {
      turns: steps.length,
      inputTokens: sum(
        (s) =>
          (s.tokens?.input ?? 0) + (s.tokens?.cache?.read ?? 0) + (s.tokens?.cache?.write ?? 0),
      ),
      outputTokens: sum((s) => (s.tokens?.output ?? 0) + (s.tokens?.reasoning ?? 0)),
      costUsd: sum((s) => s.cost),
      agentError: error ? JSON.stringify(error.error) : null,
    };
  },
};
