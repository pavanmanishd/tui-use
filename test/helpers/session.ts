import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach } from "vitest";
import { Session } from "../../src/session/session.js";

const open: Session[] = [];

afterEach(async () => {
  await Promise.all(open.splice(0).map((s) => s.kill("SIGKILL")));
});

export function startSession(
  command: string,
  options: Partial<{
    cols: number;
    rows: number;
    record: boolean;
    recordingPath: string;
    env: Record<string, string>;
  }> = {},
) {
  const env = { ...(process.env as Record<string, string>), ...options.env };
  const session = new Session({
    id: "s1",
    command,
    cwd: process.cwd(),
    env,
    cols: options.cols ?? 80,
    rows: options.rows ?? 24,
    scrollback: 1000,
    recordingPath:
      options.recordingPath ??
      (options.record ? join(mkdtempSync(join(tmpdir(), "rec-")), "s1.cast") : undefined),
    owner: { id: "c1", kind: "cli" },
  });
  open.push(session);
  return session;
}
