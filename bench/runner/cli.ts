import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import type { Condition } from "./adapters/types.js";
import { must, startContainer, startedContainer } from "./docker.js";
import { buildImages, IMAGES } from "./images.js";
import { readResults, report } from "./report.js";
import { KILL_NEW_AGENT_PROCESSES, type MatrixEntry, runBench } from "./run.js";
import { selftest } from "./selftest.js";
import { loadTasks } from "./tasks.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const TASKS = join(ROOT, "bench", "tasks");

const USAGE = `usage:
  tsx bench/runner/cli.ts build-images
  tsx bench/runner/cli.ts selftest [--task ID]... [--jobs 4]
  tsx bench/runner/cli.ts run [--task ID]... [--cli NAME]... [--repeats 3] [--jobs 4] [--condition shell|tui-use] [--shard 1/4]
  tsx bench/runner/cli.ts report <results-dir>
  tsx bench/runner/cli.ts prepare <container> --task ID --condition shell|tui-use
  tsx bench/runner/cli.ts check <container> --task ID`;

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  const { values, positionals } = parseArgs({
    args: rest,
    allowPositionals: true,
    options: {
      task: { type: "string", multiple: true },
      cli: { type: "string", multiple: true },
      condition: { type: "string", multiple: true },
      repeats: { type: "string", default: "3" },
      jobs: { type: "string", default: "4" },
      shard: { type: "string" },
    },
  });
  const jobs = Number(values.jobs);
  const repeats = Number(values.repeats);
  if (!(Number.isInteger(jobs) && jobs > 0 && Number.isInteger(repeats) && repeats > 0)) {
    console.error("--jobs and --repeats must be positive integers");
    return 2;
  }
  const conditions = (values.condition ?? ["shell", "tui-use"]) as Condition[];
  if (conditions.some((c) => c !== "shell" && c !== "tui-use")) {
    console.error("--condition must be shell or tui-use");
    return 2;
  }
  const shard = /^(\d+)\/(\d+)$/.exec(values.shard ?? "1/1");
  const [index, count] = [Number(shard?.[1]), Number(shard?.[2])];
  if (!shard || index < 1 || index > count) {
    console.error("--shard must look like 2/4");
    return 2;
  }
  const tasks = () => loadTasks(TASKS, values.task).filter((_, i) => i % count === index - 1);

  switch (command) {
    case "build-images":
      await buildImages(ROOT);
      return 0;
    case "selftest": {
      const results = await selftest(tasks(), TASKS, jobs);
      for (const r of results)
        console.log(`${r.ok ? "ok  " : "FAIL"} ${r.task}${r.problem ? `\n     ${r.problem}` : ""}`);
      const failed = results.filter((r) => !r.ok).length;
      console.log(`${results.length - failed}/${results.length} tasks pass the self-test`);
      return failed ? 1 : 0;
    }
    case "run": {
      const matrix: MatrixEntry[] = JSON.parse(
        readFileSync(join(ROOT, "bench/runner/matrix.json"), "utf8"),
      );
      const runId = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const outDir = join(ROOT, "bench", "results", runId);
      const rows = await runBench({
        runId,
        outDir,
        tasksDir: TASKS,
        tasks: tasks(),
        matrix: values.cli?.length ? matrix.filter((m) => values.cli?.includes(m.cli)) : matrix,
        repeats,
        jobs,
        conditions,
      });
      const md = report(rows);
      writeFileSync(join(outDir, "report.md"), `${md}\n`);
      console.log(`\n${md}\n\nresults in ${outDir}`);
      return 0;
    }
    case "prepare": {
      const [name] = positionals;
      const [task] = values.task ?? [];
      const condition = conditions[0];
      if (!name || !task || conditions.length !== 1) break;
      const c = await startContainer(IMAGES[condition as Condition], name, TASKS);
      const setup = await c.exec(["bash", `/bench/tasks/${task}/setup.sh`], { timeoutMs: 180_000 });
      if (setup.code !== 0) {
        await c.remove();
        console.error(`setup failed: ${setup.stderr}`);
        return 1;
      }
      const baseline = (await c.exec(["pgrep", "-u", "agent"])).stdout.split(/\s+/).filter(Boolean);
      await c.write("/root/.bench-baseline", baseline.join(" "), "root");
      console.log(`${name} ready for ${task} (${condition})`);
      return 0;
    }
    case "check": {
      const [name] = positionals;
      const [task] = values.task ?? [];
      if (!name || !task) break;
      const sh = (cmd: string[]) => must(["docker", "exec", name, ...cmd]).catch(() => "");
      await sh([
        "bash",
        "-c",
        `${KILL_NEW_AGENT_PROCESSES.replace("$1", "$(cat /root/.bench-baseline)")}`,
      ]);
      const check = await startedContainer(name).exec(["bash", `/bench/tasks/${task}/check.sh`], {
        timeoutMs: 60_000,
      });
      console.log(check.code === 0 ? "pass" : "fail");
      await must(["docker", "rm", "-f", name]);
      return check.code === 0 ? 0 : 3;
    }
    case "report": {
      const dir = positionals[0];
      if (!dir) break;
      console.log(report(readResults(join(dir, "results.jsonl"))));
      return 0;
    }
  }
  console.error(USAGE);
  return 2;
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (err: Error) => {
    console.error(err.message);
    process.exitCode = 1;
  },
);
