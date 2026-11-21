import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { agentPrompt, loadTasks, parseTaskMd } from "./tasks.js";

function taskDir(files: Record<string, string>, executable = true) {
  const root = mkdtempSync(join(tmpdir(), "tasks-"));
  const dir = join(root, "vim-edit-line");
  mkdirSync(dir);
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(dir, name), content);
    if (name.endsWith(".sh") && executable) chmodSync(join(dir, name), 0o755);
  }
  return root;
}

const valid = {
  "task.md": "---\ncategory: editors\n---\nUse vim to change line 3.\n",
  "setup.sh": "#!/bin/bash\n",
  "check.sh": "#!/bin/bash\n",
  "solve.sh": "#!/bin/bash\n",
};

describe("loadTasks", () => {
  it("loads a valid task", () => {
    const [task] = loadTasks(taskDir(valid));
    expect(task).toMatchObject({
      id: "vim-edit-line",
      category: "editors",
      prompt: "Use vim to change line 3.",
    });
    expect(agentPrompt(task as never)).toContain("Use vim to change line 3.");
  });

  it("rejects a missing file", () => {
    const { "solve.sh": _, ...rest } = valid;
    expect(() => loadTasks(taskDir(rest))).toThrow("vim-edit-line is missing solve.sh");
  });

  it("rejects scripts that are not executable", () => {
    expect(() => loadTasks(taskDir(valid, false))).toThrow(/not executable/);
  });

  it("rejects unknown task filters", () => {
    expect(() => loadTasks(taskDir(valid), ["nope"])).toThrow("unknown tasks: nope");
  });
});

describe("parseTaskMd", () => {
  it("requires a known category", () => {
    expect(() => parseTaskMd("---\ncategory: misc\n---\nx", "t")).toThrow(/use one of editors/);
    expect(() => parseTaskMd("no front matter", "t")).toThrow(/front matter/);
  });
});
