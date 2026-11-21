import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { spawnPty } from "../../src/pty/spawn.js";
import { Emulator } from "../../src/terminal/emulator.js";
import { renderFull, renderScreen } from "../../src/terminal/render.js";

interface Case {
  name: string;
  command: string;
  steps: Array<string | number>;
}

const dir = new URL(".", import.meta.url).pathname;
const work = mkdtempSync(join(tmpdir(), "golden-"));

const linux = process.platform === "linux";

const linuxCases: Case[] = [
  { name: "nano-gnu-linux", command: "nano notes.txt", steps: [800, "\x1b[B\x1b[B", 400] },
  { name: "htop-linux", command: "htop -d 100", steps: [1500, "\x1b[B", 600] },
  { name: "mc-linux", command: "mc --nosubshell", steps: [1500, "\x1b[B", 600] },
];

const cases: Case[] = [
  {
    name: "vim",
    command: `vim -u NONE -N notes.txt`,
    steps: [800, "jjw", 300, "ifixed ", 300, "\x1b", 400],
  },
  { name: "less", command: `less notes.txt`, steps: [600, "/bank\r", 500] },
  {
    name: "python",
    command: "python3 -q",
    steps: [800, "x = [1, 2, 3]\r", 300, "sum(x) * 2\r", 500],
  },
  {
    name: "fzf",
    command: `printf 'alpha\\nbeta\\ngamma\\ndelta\\n' | fzf --height=100% --layout=reverse`,
    steps: [800, "\x1b[B", 400],
  },
  { name: "nano", command: `nano notes.txt`, steps: [800, "\x1b[B", 400] },
];

async function capture(c: Case): Promise<void> {
  const chunks: string[] = [];
  const p = spawnPty({
    command: c.command,
    cwd: work,
    env: process.env as Record<string, string>,
    cols: 80,
    rows: 24,
  });
  p.onData((d) => chunks.push(d));
  for (const step of c.steps) {
    if (typeof step === "number") await sleep(step);
    else p.write(step);
  }
  const bytes = chunks.join("");
  p.kill("SIGKILL");
  writeFileSync(`${dir}${c.name}.bytes`, JSON.stringify(bytes));
  const emu = new Emulator(80, 24, 1000);
  await emu.write(bytes);
  const screen = renderScreen(emu, { styles: "marks", cursor: true });
  writeFileSync(`${dir}${c.name}.txt`, `${renderFull(c.name, screen.rows)}\n`);
  console.log(`captured ${c.name}`);
}

writeFileSync(join(work, "notes.txt"), "# Notes\n\n- buy milk\n- call bank\n- fix the bug\n");
for (const c of linux ? linuxCases : cases) await capture(c);
