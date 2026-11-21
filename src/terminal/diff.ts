import { numberRow, renderFull } from "./render.js";

export interface Frame {
  cols: number;
  rows: string[];
}

export function renderDiff(header: string, current: Frame, previous: Frame | undefined): string {
  if (!previous || previous.cols !== current.cols || previous.rows.length !== current.rows.length) {
    return renderFull(header, current.rows);
  }
  const changed: number[] = [];
  current.rows.forEach((row, i) => {
    if (row !== previous.rows[i]) changed.push(i);
  });
  const total = current.rows.length;
  if (changed.length > total / 2) return renderFull(header, current.rows);
  if (changed.length === 0) return `${header}\n───\n(no changes)`;
  const lines = [header, "───"];
  for (const i of changed) lines.push(numberRow(i + 1, total, current.rows[i] as string));
  lines.push(`(${changed.length} of ${total} rows changed)`);
  return lines.join("\n");
}
