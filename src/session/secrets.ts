export const REDACTED = "***";

export class Redactor {
  private readonly secrets = new Set<string>();

  add(secret: string): void {
    if (secret.length > 0) this.secrets.add(secret);
  }

  get maxLength(): number {
    let max = 0;
    for (const s of this.secrets) max = Math.max(max, s.length);
    return max;
  }

  ranges(text: string): Array<[number, number]> {
    const found: Array<[number, number]> = [];
    for (const s of [...this.secrets].sort((a, b) => b.length - a.length)) {
      let at = text.indexOf(s);
      while (at !== -1) {
        const end = at + s.length;
        if (!found.some(([a, b]) => at < b && end > a)) found.push([at, end]);
        at = text.indexOf(s, at + 1);
      }
    }
    return found.sort((a, b) => a[0] - b[0]);
  }

  redact(text: string): string {
    let out = "";
    let last = 0;
    for (const [start, end] of this.ranges(text)) {
      out += text.slice(last, start) + REDACTED;
      last = end;
    }
    return out + text.slice(last);
  }

  stream(): StreamRedactor {
    return new StreamRedactor(this);
  }
}

export class StreamRedactor {
  private pending = "";

  constructor(private readonly redactor: Redactor) {}

  push(chunk: string): string {
    const buffered = this.redactor.redact(this.pending + chunk);
    const hold = Math.max(0, this.redactor.maxLength - 1);
    const cut = Math.max(0, buffered.length - hold);
    this.pending = buffered.slice(cut);
    return buffered.slice(0, cut);
  }

  flush(): string {
    const out = this.redactor.redact(this.pending);
    this.pending = "";
    return out;
  }
}
