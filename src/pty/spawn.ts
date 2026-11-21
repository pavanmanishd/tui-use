import pty from "@lydell/node-pty";

export type Pty = ReturnType<typeof pty.spawn>;

export interface SpawnOptions {
  command: string;
  cwd: string;
  env: Record<string, string>;
  cols: number;
  rows: number;
}

const DROPPED_ENV = [
  "COLUMNS",
  "LINES",
  "TMUX",
  "TMUX_PANE",
  "TERM_PROGRAM",
  "TERM_PROGRAM_VERSION",
];

export function childEnv(env: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = { ...env };
  for (const name of DROPPED_ENV) delete out[name];
  out.TERM = "xterm-256color";
  return out;
}

export function spawnPty(options: SpawnOptions): Pty {
  const env = childEnv(options.env);
  const shell = env.SHELL || "/bin/sh";
  return pty.spawn(shell, ["-c", options.command], {
    name: "xterm-256color",
    cols: options.cols,
    rows: options.rows,
    cwd: options.cwd,
    env,
  });
}
