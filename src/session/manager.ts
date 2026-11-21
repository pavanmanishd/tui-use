import { join } from "node:path";
import type { Config } from "../daemon/config.js";
import { recordingName } from "../recorder/writer.js";
import { type Owner, Session, type SessionInfo, type SessionOptions } from "./session.js";

export interface StartRequest {
  command: string;
  cwd: string;
  env: Record<string, string>;
  cols: number;
  rows: number;
  name?: string;
}

export type SessionFactory = (options: SessionOptions) => Session;

export class SessionManager {
  private readonly sessions = new Map<string, Session>();
  private nextId = 1;
  private readonly deny: RegExp[];

  constructor(
    private readonly config: Config,
    private readonly recordingsDir: string | null,
    private readonly create: SessionFactory = (o) => new Session(o),
  ) {
    this.deny = config.deny.map((p) => new RegExp(p));
  }

  start(req: StartRequest, owner: Owner): Session {
    const denied = this.deny.find((re) => re.test(req.command));
    if (denied) throw new Error(`command refused by deny pattern ${denied}`);

    const running = this.all().filter((s) => s.running);
    if (running.length >= this.config.maxSessions) {
      throw new Error(
        `session limit reached (${this.config.maxSessions}); kill one first. running: ${describe(running)}`,
      );
    }

    if (req.name !== undefined) {
      const existing = this.byName(req.name);
      if (existing?.running) {
        throw new Error(`a running session is already named "${req.name}" (${existing.id})`);
      }
      if (existing) this.remove(existing);
    }

    const id = `s${this.nextId++}`;
    const recordingPath =
      this.config.recordings && this.recordingsDir
        ? join(this.recordingsDir, recordingName(id, new Date()))
        : undefined;
    const session = this.create({
      id,
      name: req.name,
      command: req.command,
      cwd: req.cwd,
      env: req.env,
      cols: req.cols,
      rows: req.rows,
      scrollback: this.config.scrollbackLines,
      recordingPath,
      owner,
    });
    this.sessions.set(id, session);
    return session;
  }

  get(ref: string): Session {
    const session = this.sessions.get(ref) ?? this.byName(ref);
    if (!session) {
      const live = this.all();
      throw new Error(
        `no session "${ref}". ${live.length ? `sessions: ${describe(live)}` : "no sessions are open"}`,
      );
    }
    return session;
  }

  list(): SessionInfo[] {
    return this.all().map((s) => s.info());
  }

  get count(): number {
    return this.sessions.size;
  }

  get runningCount(): number {
    return this.all().filter((s) => s.running).length;
  }

  assertControl(session: Session, caller: Owner): void {
    if (caller.kind === "cli" || session.owner.id === caller.id) return;
    throw new Error(
      `session ${session.id} belongs to another ${session.owner.kind} client; only its owner or the tui-use CLI can control it`,
    );
  }

  async kill(session: Session, signal?: NodeJS.Signals): Promise<void> {
    await session.kill(signal);
    this.remove(session);
  }

  async killAll(): Promise<void> {
    await Promise.all(this.all().map((s) => this.kill(s)));
  }

  async ownerClosed(ownerId: string): Promise<void> {
    const owned = this.all().filter((s) => s.owner.id === ownerId);
    await Promise.all(owned.map((s) => this.kill(s)));
  }

  async sweepIdle(now = Date.now()): Promise<void> {
    const limit = this.config.idleTimeoutMinutes * 60_000;
    const stale = this.all().filter((s) => {
      const since = s.running ? Math.max(s.lastOutputAt, s.lastInputAt) : (s.exitedAt as number);
      return now - since >= limit;
    });
    await Promise.all(stale.map((s) => this.kill(s)));
  }

  private all(): Session[] {
    return [...this.sessions.values()];
  }

  private byName(name: string): Session | undefined {
    const matches = this.all().filter((s) => s.name === name);
    return matches.find((s) => s.running) ?? matches[0];
  }

  private remove(session: Session): void {
    this.sessions.delete(session.id);
    session.dispose();
  }
}

function describe(sessions: Session[]): string {
  return sessions
    .map(
      (s) => `${s.id}${s.name ? ` (${s.name})` : ""} ${s.command}${s.running ? "" : " [exited]"}`,
    )
    .join(", ");
}
