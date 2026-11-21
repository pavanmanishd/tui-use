import { readFileSync } from "node:fs";
import type { ResultRow } from "./run.js";

export function readResults(path: string): ResultRow[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function median(values: Array<number | null>): number | null {
  const v = values.filter((x): x is number => x !== null).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? (v[mid] as number) : ((v[mid - 1] as number) + (v[mid] as number)) / 2;
}

const pct = (rows: ResultRow[]) =>
  rows.length ? `${Math.round((100 * rows.filter((r) => r.success).length) / rows.length)}%` : "–";
const num = (n: number | null, digits = 0) => (n === null ? "–" : n.toFixed(digits));
const tokens = (r: ResultRow) =>
  r.input_tokens === null && r.output_tokens === null
    ? null
    : (r.input_tokens ?? 0) + (r.output_tokens ?? 0);

function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const r of rows) out.set(key(r), [...(out.get(key(r)) ?? []), r]);
  return out;
}

export function report(all: ResultRow[]): string {
  const rows = all.filter((r) => !r.infra_error);
  if (rows.length === 0) return `no completed runs (${all.length} hit infrastructure errors)`;
  const lines = [
    "| CLI | Model | Shell only | With tui-use | Median turns (shell / tui-use) | Median tokens (shell / tui-use) | Median wall time s (shell / tui-use) |",
    "|---|---|---|---|---|---|---|",
  ];
  for (const [key, group] of groupBy(rows, (r) => `${r.cli}\u0000${r.model}`)) {
    const [cli, model] = key.split("\u0000");
    const shell = group.filter((r) => r.condition === "shell");
    const tui = group.filter((r) => r.condition === "tui-use");
    const both = <T>(f: (rs: ResultRow[]) => T) => `${f(shell)} / ${f(tui)}`;
    lines.push(
      `| ${cli} | ${model} | ${pct(shell)} | ${pct(tui)} | ${both((rs) => num(median(rs.map((r) => r.turns))))} | ${both((rs) => num(median(rs.map(tokens))))} | ${both((rs) => num(median(rs.map((r) => r.wall_ms / 1000))))} |`,
    );
  }
  lines.push("", "| Category | Shell only | With tui-use |", "|---|---|---|");
  for (const [category, group] of groupBy(rows, (r) => r.category)) {
    lines.push(
      `| ${category} | ${pct(group.filter((r) => r.condition === "shell"))} | ${pct(group.filter((r) => r.condition === "tui-use"))} |`,
    );
  }
  const tasks = new Set(rows.map((r) => r.task)).size;
  const repeats = Math.max(...rows.map((r) => r.repeat));
  const skipped = all.length - rows.length;
  lines.push(
    "",
    `${rows.length} runs over ${tasks} tasks, ${repeats} repeats per cell. Medians cover all runs, passed or failed.${skipped ? ` ${skipped} runs with infrastructure errors are left out.` : ""}`,
  );
  return lines.join("\n");
}
