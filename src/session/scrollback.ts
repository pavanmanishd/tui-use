export interface NumberedLine {
  n: number;
  text: string;
}

export function trimTrailingBlank(lines: string[]): string[] {
  let end = lines.length;
  while (end > 0 && lines[end - 1] === "") end--;
  return lines.slice(0, end);
}

function resolveIndex(n: number, total: number): number {
  return n < 0 ? total + n + 1 : n;
}

export function readRange(lines: string[], from: number, to: number): NumberedLine[] {
  const total = lines.length;
  const start = Math.max(1, resolveIndex(from, total));
  const end = Math.min(total, resolveIndex(to, total));
  const out: NumberedLine[] = [];
  for (let n = start; n <= end; n++) out.push({ n, text: lines[n - 1] as string });
  return out;
}

export function search(lines: string[], query: string, context = 2): NumberedLine[][] {
  const blocks: NumberedLine[][] = [];
  let current: NumberedLine[] = [];
  let currentEnd = 0;
  lines.forEach((line, i) => {
    if (!line.includes(query)) return;
    const n = i + 1;
    const start = Math.max(1, n - context);
    const end = Math.min(lines.length, n + context);
    if (current.length > 0 && start <= currentEnd + 1) {
      for (let k = currentEnd + 1; k <= end; k++)
        current.push({ n: k, text: lines[k - 1] as string });
    } else {
      if (current.length > 0) blocks.push(current);
      current = [];
      for (let k = start; k <= end; k++) current.push({ n: k, text: lines[k - 1] as string });
    }
    currentEnd = Math.max(currentEnd, end);
  });
  if (current.length > 0) blocks.push(current);
  return blocks;
}

export function formatLines(lines: NumberedLine[], total: number): string {
  const width = String(total).length;
  return lines.map((l) => `${String(l.n).padStart(width)}│${l.text}`).join("\n");
}
