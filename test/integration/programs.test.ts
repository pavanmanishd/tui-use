import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { startSession } from "../helpers/session.js";

function workdir(): string {
  const dir = mkdtempSync(join(tmpdir(), "prog-"));
  writeFileSync(join(dir, "notes.md"), "# Notes\n\n- buy milk\n- call bank\n- fix the bug\n");
  return dir;
}

const has = (bin: string) => {
  try {
    execSync(`command -v ${bin}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

describe("real programs", () => {
  it("edits a line in vim and saves", async () => {
    const dir = workdir();
    const s = startSession(`cd ${dir} && vim -u NONE -N notes.md`);
    await s.wait({ text: "notes.md" });
    s.send([
      { text: "4G" },
      { text: "A today" },
      { key: "esc" },
      { text: ":wq" },
      { key: "enter" },
    ]);
    expect(await s.wait({ exit: true, timeout_ms: 5000 })).toMatchObject({ fired: "exit" });
    expect(readFileSync(join(dir, "notes.md"), "utf8")).toContain("- call bank today");
  });

  it("shows vim's insert mode and cursor", async () => {
    const dir = workdir();
    const s = startSession(`cd ${dir} && vim -u NONE -N notes.md`, { cols: 80, rows: 24 });
    await s.wait({ text: "notes.md" });
    s.send([{ text: "5Gwi" }]);
    await s.wait({ text: "-- INSERT --" });
    const snap = await s.snapshot("full", "marks");
    expect(snap).toContain("5│- [f]ix the bug");
    expect(snap).toContain("cursor 5:3 · alt");
  });

  it("searches in less and marks the match", async () => {
    const dir = workdir();
    const s = startSession(`cd ${dir} && less notes.md`);
    await s.wait({ text: "notes.md" });
    s.send([{ text: "/bank" }, { key: "enter" }]);
    await s.wait(undefined);
    expect(await s.snapshot("full", "marks")).toContain("- call «bank»");
    s.send([{ text: "q" }]);
    expect(await s.wait({ exit: true })).toMatchObject({ fired: "exit" });
  });

  it("keeps state across python REPL steps", async () => {
    const s = startSession("python3 -q");
    await s.wait({ text: ">>>" });
    s.send([{ text: "x = [1, 2, 3]\n" }]);
    await s.wait(undefined);
    s.send([{ text: "sum(x) * 7\n" }]);
    await s.wait({ text: "42" });
    s.send([{ paste: "def f(n):\n    return n + 1\n\n" }]);
    await s.wait(undefined);
    s.send([{ text: "f(41)\n" }]);
    expect(await s.wait({ regex: "^42$" })).toMatchObject({ fired: "regex" });
  });

  it.skipIf(!has("htop"))("renders htop with the selected row marked", async () => {
    const s = startSession("htop -d 10", { cols: 120, rows: 30 });
    await s.wait({ text: "F10" });
    await s.wait({ idle_ms: 500, timeout_ms: 3000 });
    const snap = await s.snapshot("full", "marks");
    expect(snap).toMatch(/[«‹]\s*PID USER/);
    expect(snap).toContain("· alt ·");
    s.send([{ key: "f10" }]);
    expect(await s.wait({ exit: true })).toMatchObject({ fired: "exit" });
  });

  it("squashes three commits with git rebase -i", async () => {
    const dir = mkdtempSync(join(tmpdir(), "repo-"));
    const git = (cmd: string) => execSync(`git ${cmd}`, { cwd: dir, stdio: "pipe" }).toString();
    git("init -q -b main");
    git("config user.email t@example.com");
    git("config user.name t");
    for (const n of [1, 2, 3, 4]) {
      writeFileSync(join(dir, `f${n}`), String(n));
      git(`add f${n}`);
      git(`commit -q -m c${n}`);
    }
    const s = startSession(`cd ${dir} && git rebase -i HEAD~3`, {
      env: { GIT_EDITOR: "vim -u NONE -N" },
    });
    await s.wait({ text: "pick" });
    s.send([{ text: "2G0cwsquash" }, { key: "esc" }, { text: "3G0cwsquash" }, { key: "esc" }]);
    await s.wait(undefined);
    s.send([{ text: ":wq" }, { key: "enter" }]);
    await s.wait({ text: "This is a combination of 3 commits" });
    s.send([{ text: ":wq" }, { key: "enter" }]);
    expect(await s.wait({ exit: true })).toMatchObject({ fired: "exit" });
    expect(git("log --format=%s").trim().split("\n")).toHaveLength(2);
  });

  it.skipIf(!has("fzf"))("marks the fzf selection and picks an item", async () => {
    const s = startSession(
      "printf 'alpha\\nbeta\\ngamma\\n' | fzf --height=100% --layout=reverse > /tmp/tu-fzf-$$; cat /tmp/tu-fzf-$$",
    );
    await s.wait({ text: "3/3" });
    s.send([{ key: "down" }]);
    await s.wait(undefined);
    expect(await s.snapshot("full", "marks")).toMatch(/«.*beta»/);
    s.send([{ key: "enter" }]);
    await s.wait({ exit: true });
    expect(await s.screenText()).toMatch(/^beta$/m);
  });

  it("saves a file in nano", async () => {
    const dir = workdir();
    const s = startSession(`cd ${dir} && nano notes.md`);
    await s.wait({ text: "notes.md" });
    s.send([{ key: "ctrl+end" }, { text: "- added\n" }, { key: "ctrl+o" }]);
    await s.wait(undefined);
    s.send([{ key: "enter" }]);
    await s.wait(undefined);
    s.send([{ key: "ctrl+x" }]);
    expect(await s.wait({ exit: true })).toMatchObject({ fired: "exit" });
    expect(readFileSync(join(dir, "notes.md"), "utf8")).toContain("- added");
  });
});
