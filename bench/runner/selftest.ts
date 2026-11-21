import { pool, startContainer } from "./docker.js";
import { IMAGES } from "./images.js";
import type { Task } from "./tasks.js";

export interface SelftestResult {
  task: string;
  ok: boolean;
  problem?: string;
}

async function phase(
  task: Task,
  tasksDir: string,
  solve: boolean,
): Promise<{ code: number; log: string }> {
  const name = `tui-bench-selftest-${task.id}-${solve ? "solve" : "plain"}-${process.pid}`;
  const c = await startContainer(IMAGES[solve ? "tui-use" : "shell"], name, tasksDir);
  try {
    const setup = await c.exec(["bash", `/bench/tasks/${task.id}/setup.sh`], {
      timeoutMs: 180_000,
    });
    if (setup.code !== 0) return { code: -1, log: `setup failed: ${setup.stdout}${setup.stderr}` };
    let log = "";
    if (solve) {
      const s = await c.exec(["bash", `/bench/tasks/${task.id}/solve.sh`], {
        user: "agent",
        timeoutMs: 300_000,
      });
      log = `${s.stdout}${s.stderr}`;
      if (s.code !== 0) return { code: -1, log: `solve failed (${s.code}): ${log}` };
    }
    const check = await c.exec(["bash", `/bench/tasks/${task.id}/check.sh`], { timeoutMs: 60_000 });
    return { code: check.code, log: `${log}${check.stdout}${check.stderr}` };
  } finally {
    await c.remove();
  }
}

export async function selftest(
  tasks: Task[],
  tasksDir: string,
  jobs: number,
): Promise<SelftestResult[]> {
  return pool(tasks, jobs, async (task) => {
    const plain = await phase(task, tasksDir, false);
    if (plain.code === 0)
      return { task: task.id, ok: false, problem: "check passes before the task is done" };
    if (plain.code === -1) return { task: task.id, ok: false, problem: plain.log };
    const solved = await phase(task, tasksDir, true);
    if (solved.code !== 0) {
      return {
        task: task.id,
        ok: false,
        problem: `check fails after solve.sh: ${solved.log.slice(-2000)}`,
      };
    }
    return { task: task.id, ok: true };
  });
}
