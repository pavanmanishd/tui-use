import type { ScreenResult } from "./daemon/protocol.js";
import type { InputItem, SessionInfo } from "./session/session.js";

export function formatScreen(result: ScreenResult, timeoutMs?: number): string {
  const lines = [result.text];
  if (result.fired) lines.push(`(wait fired: ${result.fired})`);
  else if (result.settled === false) {
    lines.push(
      `(still changing after ${timeoutMs ?? 5000}ms; for slow programs wait with text, regex or gone)`,
    );
  } else if (result.timed_out) lines.push(`(wait timed out after ${timeoutMs ?? 5000}ms)`);
  return lines.join("\n");
}

export function formatList(sessions: SessionInfo[]): string {
  if (sessions.length === 0) return "no sessions";
  return sessions
    .map((s) =>
      [
        `${s.id}${s.name ? ` (${s.name})` : ""}`,
        s.state === "running" ? "running" : `exited ${s.exit_code}`,
        `${s.cols}x${s.rows}`,
        `idle ${s.idle_ms}ms`,
        `owner ${s.owner}`,
        s.command,
      ].join(" · "),
    )
    .join("\n");
}

export interface InputRequest {
  text?: string;
  keys?: string[];
  input?: Array<{ text: string } | { key: string } | { secret_env: string }>;
  secret_env?: string;
  paste?: boolean;
}

export function buildInput(req: InputRequest, secret: (name: string) => string): InputItem[] {
  if (req.input) {
    return req.input.map((item) =>
      "secret_env" in item ? { secret: secret(item.secret_env) } : item,
    );
  }
  const items: InputItem[] = [];
  if (req.text !== undefined) items.push(req.paste ? { paste: req.text } : { text: req.text });
  if (req.secret_env !== undefined) items.push({ secret: secret(req.secret_env) });
  for (const key of req.keys ?? []) items.push({ key });
  return items;
}
