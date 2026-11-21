import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ADAPTERS } from "./adapters/index.js";
import type { Condition } from "./adapters/types.js";
import { type Container, pool, startContainer } from "./docker.js";
import { IMAGES } from "./images.js";
import { agentPrompt, type Task } from "./tasks.js";

export const AGENT_TIMEOUT_MS = 10 * 60_000;

const KILL_NEW_AGENT_PROCESSES =
  'for p in $(pgrep -u agent); do case " $1 " in *" $p "*) ;; *) kill -KILL "$p" 2>/dev/null ;; esac; done';

const QUIET_ENV = {
  DISABLE_AUTOUPDATER: "1",
  NO_UPDATE_NOTIFIER: "1",
  GEMINI_CLI_DISABLE_AUTO_UPDATE: "true",
};

export interface MatrixEntry {
  cli: string;
  model: string;
}

export interface ResultRow {
  run_id: string;
  task: string;
  category: string;
  cli: string;
  cli_version: string;
  model: string;
  condition: Condition;
  repeat: number;
  success: boolean;
  timed_out: boolean;
  turns: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  wall_ms: number;
  agent_error: string | null;
  infra_error: string | null;
  tool_calls: number | null;
  tui_use_calls: number | null;
  transcript: string;
}

export interface RunOptions {
  runId: string;
  outDir: string;
  tasksDir: string;
  tasks: Task[];
  matrix: MatrixEntry[];
  repeats: number;
  jobs: number;
  conditions: Condition[];
}

interface Job {
  task: Task;
  entry: MatrixEntry;
  condition: Condition;
  repeat: number;
}

export async function runBench(options: RunOptions): Promise<ResultRow[]> {
  for (const entry of options.matrix) {
    const adapter = ADAPTERS[entry.cli];
    if (!adapter)
      throw new Error(`unknown cli ${entry.cli}; known: ${Object.keys(ADAPTERS).join(", ")}`);
    if (!adapter.keyEnvs.some((k) => process.env[k])) {
      throw new Error(`${entry.cli} needs one of ${adapter.keyEnvs.join(", ")} in the environment`);
    }
  }
  const transcripts = join(options.outDir, "transcripts");
  mkdirSync(transcripts, { recursive: true });
  const resultsPath = join(options.outDir, "results.jsonl");

  const jobs: Job[] = [];
  for (const task of options.tasks) {
    for (const entry of options.matrix) {
      for (const condition of options.conditions) {
        for (let repeat = 1; repeat <= options.repeats; repeat++)
          jobs.push({ task, entry, condition, repeat });
      }
    }
  }
  console.log(`${jobs.length} runs, ${options.jobs} at a time`);

  return pool(jobs, options.jobs, async (job) => {
    const row = await runOne(job, options, transcripts);
    appendFileSync(resultsPath, `${JSON.stringify(row)}\n`);
    console.log(
      `${row.infra_error ? "ERR " : row.success ? "pass" : "FAIL"} ${row.task} ${row.cli}/${row.model} ${row.condition} #${row.repeat} ${Math.round(row.wall_ms / 1000)}s`,
    );
    return row;
  });
}

async function runOne(job: Job, options: RunOptions, transcripts: string): Promise<ResultRow> {
  const adapter = ADAPTERS[job.entry.cli] as (typeof ADAPTERS)[string];
  const slug = `${job.task.id}-${job.entry.cli}-${job.entry.model.replace(/[^a-z0-9.-]/gi, "_")}-${job.condition}-${job.repeat}`;
  const transcript = join(transcripts, `${slug}.txt`);
  const row: ResultRow = {
    run_id: options.runId,
    task: job.task.id,
    category: job.task.category,
    cli: job.entry.cli,
    cli_version: "",
    model: job.entry.model,
    condition: job.condition,
    repeat: job.repeat,
    success: false,
    timed_out: false,
    turns: null,
    input_tokens: null,
    output_tokens: null,
    cost_usd: null,
    wall_ms: 0,
    agent_error: null,
    infra_error: null,
    tool_calls: null,
    tui_use_calls: null,
    transcript,
  };
  const env = { HOME: "/home/agent", ...QUIET_ENV };
  const passEnv = adapter.keyEnvs.filter((k) => process.env[k]);
  let c: Container | undefined;
  try {
    c = await startContainer(
      IMAGES[job.condition],
      `tui-bench-${options.runId}-${slug}`,
      options.tasksDir,
    );
    const setup = await c.exec(["bash", `/bench/tasks/${job.task.id}/setup.sh`], {
      timeoutMs: 180_000,
    });
    if (setup.code !== 0) throw new Error(`setup failed: ${setup.stderr.trim().slice(-500)}`);
    await adapter.prepare(c, job.condition);
    const baseline = (await c.exec(["pgrep", "-u", "agent"])).stdout.split(/\s+/).filter(Boolean);
    row.cli_version = (
      await c.exec([adapter.command("", "")[0] as string, "--version"], {
        user: "agent",
        env,
        passEnv,
      })
    ).stdout.trim();

    const start = Date.now();
    const agent = await c.exec(adapter.command(agentPrompt(job.task), job.entry.model), {
      user: "agent",
      env,
      passEnv,
      timeoutMs: AGENT_TIMEOUT_MS,
    });
    row.wall_ms = Date.now() - start;
    row.timed_out = agent.timedOut;
    writeFileSync(transcript, `${agent.stdout}\n--- stderr ---\n${agent.stderr}`);
    await c.exec(["bash", "-c", KILL_NEW_AGENT_PROCESSES, "bash", baseline.join(" ")]);

    const metrics = adapter.parse(agent.stdout, agent.stderr);
    row.turns = metrics.turns;
    row.input_tokens = metrics.inputTokens;
    row.output_tokens = metrics.outputTokens;
    row.cost_usd = metrics.costUsd;
    row.agent_error = metrics.agentError;
    row.tool_calls = metrics.toolCalls;
    row.tui_use_calls = metrics.tuiUseCalls;
    if (metrics.apiError) throw new Error(`api: ${metrics.agentError}`);
    if (!agent.timedOut) {
      const check = await c.exec(["bash", `/bench/tasks/${job.task.id}/check.sh`], {
        timeoutMs: 60_000,
      });
      row.success = check.code === 0;
    }
  } catch (err) {
    row.infra_error = (err as Error).message;
  } finally {
    await c?.remove();
  }
  return row;
}
