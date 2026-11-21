import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export const CATEGORIES = [
  "editors",
  "git",
  "prompts",
  "repls",
  "full-screen",
  "remote",
  "pickers",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Task {
  id: string;
  category: Category;
  prompt: string;
  dir: string;
}

const FILES = ["task.md", "setup.sh", "check.sh", "solve.sh"];

export function parseTaskMd(text: string, id: string): { category: Category; prompt: string } {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  if (!match) throw new Error(`${id}/task.md needs a front matter block with a category`);
  const category = /^category:\s*(\S+)\s*$/m.exec(match[1] as string)?.[1];
  if (!CATEGORIES.includes(category as Category)) {
    throw new Error(`${id}/task.md has category ${category}; use one of ${CATEGORIES.join(", ")}`);
  }
  const prompt = (match[2] as string).trim();
  if (!prompt) throw new Error(`${id}/task.md has no prompt`);
  return { category: category as Category, prompt };
}

export function loadTask(dir: string, id: string): Task {
  const path = join(dir, id);
  for (const file of FILES) {
    if (!existsSync(join(path, file))) throw new Error(`${id} is missing ${file}`);
    if (file.endsWith(".sh") && (statSync(join(path, file)).mode & 0o111) === 0) {
      throw new Error(`${id}/${file} is not executable`);
    }
  }
  return { id, dir: path, ...parseTaskMd(readFileSync(join(path, "task.md"), "utf8"), id) };
}

export function loadTasks(dir: string, only?: string[]): Task[] {
  const ids = readdirSync(dir)
    .filter((name) => statSync(join(dir, name)).isDirectory())
    .sort();
  const selected = only?.length ? ids.filter((id) => only.includes(id)) : ids;
  if (only?.length && selected.length !== only.length) {
    const missing = only.filter((id) => !ids.includes(id));
    throw new Error(`unknown tasks: ${missing.join(", ")}`);
  }
  return selected.map((id) => loadTask(dir, id));
}

export function agentPrompt(task: Task): string {
  return [
    'You are working in a Linux container as the user "agent", in /home/agent/work.',
    "Complete the task below on your own without asking questions. Use sudo if you need root.",
    "When you are done, reply with a one-line summary.",
    "",
    task.prompt,
  ].join("\n");
}
