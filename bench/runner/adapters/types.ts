import type { Container } from "../docker.js";

export type Condition = "shell" | "tui-use";

export interface Metrics {
  turns: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  agentError: string | null;
  apiError: boolean;
}

export interface Adapter {
  name: string;
  keyEnv: string;
  prepare(container: Container, condition: Condition): Promise<void>;
  command(prompt: string, model: string): string[];
  parse(stdout: string, stderr?: string): Metrics;
}

export const TUI_USE_SERVER = { command: "tui-use", args: ["mcp"] };

export const empty: Metrics = {
  turns: null,
  inputTokens: null,
  outputTokens: null,
  costUsd: null,
  agentError: null,
  apiError: false,
};
