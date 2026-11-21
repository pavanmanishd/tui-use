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

  redact(text: string): string {
    let out = text;
    for (const s of [...this.secrets].sort((a, b) => b.length - a.length)) {
      out = out.replaceAll(s, REDACTED);
    }
    return out;
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
