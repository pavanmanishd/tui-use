import { describe, expect, it } from "vitest";
import { report } from "./report.js";
import type { ResultRow } from "./run.js";

const row = (over: Partial<ResultRow>): ResultRow => ({
  run_id: "r",
  task: "t1",
  category: "editors",
  cli: "claude-code",
  cli_version: "2.1.329",
  model: "m",
  condition: "shell",
  repeat: 1,
  success: false,
  timed_out: false,
  turns: 10,
  input_tokens: 1000,
  output_tokens: 100,
  cost_usd: 0.1,
  wall_ms: 60_000,
  agent_error: null,
  transcript: "x",
  ...over,
});

describe("report", () => {
  it("renders success rates and medians per CLI and model", () => {
    const md = report([
      row({ condition: "shell", success: false, turns: 20 }),
      row({ condition: "shell", success: true, turns: 10, repeat: 2 }),
      row({ condition: "tui-use", success: true, turns: 6, wall_ms: 30_000 }),
      row({ condition: "tui-use", success: true, turns: 8, wall_ms: 40_000, repeat: 2 }),
    ]);
    expect(md).toContain("| claude-code | m | 50% | 100% | 15 / 7 | 1100 / 1100 | 60 / 35 |");
    expect(md).toContain("| editors | 50% | 100% |");
    expect(md).toContain("4 runs over 1 tasks, 2 repeats per cell.");
  });

  it("shows a dash when a CLI reports no tokens", () => {
    const md = report([row({ input_tokens: null, output_tokens: null, condition: "tui-use" })]);
    expect(md).toContain("– / –");
  });
});
