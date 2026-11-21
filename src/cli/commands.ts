import { writeFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { parseArgs } from "node:util";
import { DaemonClient, resolveCwd, resolveSecret, startRequestEnv } from "../daemon/client.js";
import type { Params, ScreenResult } from "../daemon/protocol.js";
import { buildInput, formatList, formatScreen } from "../format.js";
import { isKeyName } from "../keys/grammar.js";
import { MOUSE_ACTIONS, type MouseAction } from "../keys/mouse.js";
import type { InputItem, SessionInfo } from "../session/session.js";
import type { WaitSpec } from "../session/wait.js";

export class UsageError extends Error {}

export const EXIT = { ok: 0, error: 1, usage: 2, timeout: 3 } as const;

type OptionSpec = Record<string, { type: "string" | "boolean"; multiple?: boolean }>;

const json = { json: { type: "boolean" } } as const;
const view = {
  full: { type: "boolean" },
  diff: { type: "boolean" },
  styles: { type: "string" },
} as const;
const until = {
  "until-text": { type: "string" },
  "until-regex": { type: "string" },
  "until-gone": { type: "string" },
  "until-idle": { type: "string" },
  "until-exit": { type: "boolean" },
  timeout: { type: "string" },
} as const;
const waitFlags = {
  text: { type: "string" },
  regex: { type: "string" },
  gone: { type: "string" },
  idle: { type: "string" },
  exit: { type: "boolean" },
  timeout: { type: "string" },
} as const;

export const USAGE: Record<string, string> = {
  start:
    "tui-use start <command> [--name N] [--cwd DIR] [--cols 120] [--rows 40] [--env K=V]... [--until-text T | --until-regex R | --until-gone T | --until-idle MS | --until-exit] [--timeout MS] [--json]",
  send: "tui-use send <session> [--text T] [--paste] [--secret-env VAR] [--key K]... [--input TOKEN...] [--full] [--styles none] [--until-text T ...] [--timeout MS] [--json]",
  snapshot: "tui-use snapshot <session> [--diff] [--styles none] [--json]",
  screenshot: "tui-use screenshot <session> [--out FILE.png]",
  wait: "tui-use wait <session> [--text T] [--regex R] [--gone T] [--idle MS] [--exit] [--timeout MS] [--full] [--json]",
  scrollback: "tui-use scrollback <session> [--lines=FROM:TO | --search TEXT] [--json]",
  list: "tui-use list [--json]",
  kill: "tui-use kill <session> [--signal SIGTERM] | tui-use kill --all",
  resize: "tui-use resize <session> <cols> <rows> [--json]",
  recording: "tui-use recording <session> [--json]",
  attach: "tui-use attach <session>   (ctrl+] detaches)",
  replay: "tui-use replay <file.cast> [--speed 1]",
  mcp: "tui-use mcp   (run as an MCP server on stdio)",
  daemon: "tui-use daemon   (run the session daemon in the foreground)",
};

export function helpText(): string {
  return [
    "tui-use: drive interactive terminal programs from an AI agent.",
    "",
    "Commands:",
    ...Object.values(USAGE).map((u) => `  ${u}`),
    "",
    'Keys: enter, tab, esc, backspace, delete, up, down, left, right, home, end, pageup, pagedown, space, f1-f12, any character, with ctrl+, alt+ or shift+ (e.g. ctrl+c). With --input, tokens that are key names are keys, mouse:ACTION:ROW:COL is a mouse event (click, double_click, right_click, middle_click, scroll_up, scroll_down), and everything else is text; prefix "text:" to send a key name as text.',
  ].join("\n");
}

export function parse(command: string, args: string[], options: OptionSpec) {
  try {
    return parseArgs({ args, options, allowPositionals: true, strict: true });
  } catch (err) {
    const hint =
      command === "start" && /Unknown option/.test((err as Error).message)
        ? '\nquote the command, e.g. tui-use start "git rebase -i HEAD~3"'
        : "";
    throw new UsageError(`${(err as Error).message}${hint}\nusage: ${USAGE[command]}`);
  }
}

function int(value: string | undefined, flag: string, command: string): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n)) {
    throw new UsageError(`--${flag} must be an integer\nusage: ${USAGE[command]}`);
  }
  return n;
}

function need(positionals: string[], count: number, command: string): string[] {
  if (positionals.length < count) throw new UsageError(`usage: ${USAGE[command]}`);
  return positionals;
}

function waitFrom(
  values: Record<string, unknown>,
  names: Record<"text" | "regex" | "gone" | "idle" | "exit", string>,
  command: string,
): WaitSpec | undefined {
  const spec: WaitSpec = {};
  const text = values[names.text] as string | undefined;
  const regex = values[names.regex] as string | undefined;
  const gone = values[names.gone] as string | undefined;
  if (text !== undefined) spec.text = text;
  if (regex !== undefined) spec.regex = regex;
  if (gone !== undefined) spec.gone = gone;
  const idle = int(values[names.idle] as string | undefined, names.idle, command);
  if (idle !== undefined) spec.idle_ms = idle;
  if (values[names.exit]) spec.exit = true;
  const timeout = int(values.timeout as string | undefined, "timeout", command);
  if (timeout !== undefined) spec.timeout_ms = timeout;
  return Object.keys(spec).length ? spec : undefined;
}

function styles(value: unknown, command: string): "marks" | "none" {
  if (value === undefined || value === "marks") return "marks";
  if (value === "none") return "none";
  throw new UsageError(`--styles must be marks or none\nusage: ${USAGE[command]}`);
}

export function inputTokens(tokens: string[]): InputItem[] {
  return tokens.map((t) => {
    if (t.startsWith("text:")) return { text: t.slice(5) };
    const mouse = /^mouse:([a-z_]+):(\d+):(\d+)$/.exec(t);
    if (mouse) {
      const action = mouse[1] as MouseAction;
      if (!MOUSE_ACTIONS.includes(action)) {
        throw new UsageError(`unknown mouse action ${action}; use ${MOUSE_ACTIONS.join(", ")}`);
      }
      return { mouse: { action, row: Number(mouse[2]), col: Number(mouse[3]) } };
    }
    return isKeyName(t) && t.length > 1 ? { key: t } : { text: t };
  });
}

function parseLines(value: string, command: string): [number, number] {
  const match = /^(-?\d+):(-?\d+)$/.exec(value);
  if (!match)
    throw new UsageError(`--lines must look like 1:50 or -50:-1\nusage: ${USAGE[command]}`);
  return [Number(match[1]), Number(match[2])];
}

export interface Output {
  text: string;
  json: unknown;
  code: number;
  asJson?: boolean;
}

function screenOutput(result: ScreenResult, wait: WaitSpec | undefined): Output {
  const explicit = wait && Object.keys(wait).some((k) => k !== "timeout_ms");
  return {
    text: formatScreen(result, wait?.timeout_ms),
    json: result,
    code: explicit && result.timed_out ? EXIT.timeout : EXIT.ok,
  };
}

export async function run(command: string, args: string[]): Promise<Output> {
  let asJson = false;
  const parseTracked = (cmd: string, a: string[], options: OptionSpec) => {
    const parsed = parse(cmd, a, options);
    asJson = parsed.values.json === true;
    return parsed;
  };
  const output = await runCommand(command, args, parseTracked);
  return { ...output, asJson };
}

async function runCommand(
  command: string,
  args: string[],
  parse: (cmd: string, a: string[], options: OptionSpec) => ReturnType<typeof parseArgs>,
): Promise<Output> {
  const connect = (strictVersion = true) => DaemonClient.connect({ kind: "cli", strictVersion });

  switch (command) {
    case "start": {
      const { values, positionals } = parse(command, args, {
        name: { type: "string" },
        cwd: { type: "string" },
        cols: { type: "string" },
        rows: { type: "string" },
        env: { type: "string", multiple: true },
        ...until,
        ...json,
      });
      need(positionals, 1, command);
      const extraEnv: Record<string, string> = {};
      for (const pair of (values.env as string[] | undefined) ?? []) {
        const eq = pair.indexOf("=");
        if (eq < 1) throw new UsageError(`--env must be KEY=VALUE\nusage: ${USAGE[command]}`);
        extraEnv[pair.slice(0, eq)] = pair.slice(eq + 1);
      }
      const wait = waitFrom(
        values,
        {
          text: "until-text",
          regex: "until-regex",
          gone: "until-gone",
          idle: "until-idle",
          exit: "until-exit",
        },
        command,
      );
      const params: Params<"start"> = {
        command: positionals.join(" "),
        cwd: resolveCwd(values.cwd as string | undefined),
        env: startRequestEnv(extraEnv),
        cols: int(values.cols as string | undefined, "cols", command),
        rows: int(values.rows as string | undefined, "rows", command),
        name: values.name as string | undefined,
        wait,
      };
      const client = await connect();
      try {
        return screenOutput(await client.request<ScreenResult>("start", params), wait);
      } finally {
        client.close();
      }
    }
    case "send": {
      const { values, positionals } = parse(command, args, {
        text: { type: "string" },
        paste: { type: "boolean" },
        "secret-env": { type: "string" },
        key: { type: "string", multiple: true },
        input: { type: "boolean" },
        ...view,
        ...until,
        ...json,
      });
      const [session, ...rest] = need(positionals, 1, command);
      if (rest.length > 0 && !values.input) {
        throw new UsageError(
          `unexpected argument ${rest[0]}; did you mean --input?\nusage: ${USAGE[command]}`,
        );
      }
      const input = values.input
        ? inputTokens(rest)
        : buildInput(
            {
              text: values.text as string | undefined,
              paste: values.paste as boolean | undefined,
              secret_env: values["secret-env"] as string | undefined,
              keys: values.key as string[] | undefined,
            },
            resolveSecret,
          );
      const wait = waitFrom(
        values,
        {
          text: "until-text",
          regex: "until-regex",
          gone: "until-gone",
          idle: "until-idle",
          exit: "until-exit",
        },
        command,
      );
      const client = await connect();
      try {
        const result = await client.request<ScreenResult>("send", {
          session: session as string,
          input,
          wait,
          mode: values.full ? "full" : "diff",
          styles: styles(values.styles, command),
        });
        return screenOutput(result, wait);
      } finally {
        client.close();
      }
    }
    case "snapshot": {
      const { values, positionals } = parse(command, args, { ...view, ...json });
      const [session] = need(positionals, 1, command);
      const client = await connect();
      try {
        const result = await client.request<ScreenResult>("snapshot", {
          session: session as string,
          mode: values.diff ? "diff" : "full",
          styles: styles(values.styles, command),
        });
        return screenOutput(result, undefined);
      } finally {
        client.close();
      }
    }
    case "screenshot": {
      const { values, positionals } = parse(command, args, { out: { type: "string" }, ...json });
      const [session] = need(positionals, 1, command);
      const client = await connect();
      try {
        const result = await client.request<{ session: string; png: string }>("screenshot", {
          session: session as string,
        });
        const out = resolvePath((values.out as string | undefined) ?? `${result.session}.png`);
        writeFileSync(out, Buffer.from(result.png, "base64"));
        return { text: out, json: { session: result.session, path: out }, code: EXIT.ok };
      } finally {
        client.close();
      }
    }
    case "wait": {
      const { values, positionals } = parse(command, args, { ...waitFlags, ...view, ...json });
      const [session] = need(positionals, 1, command);
      const wait =
        waitFrom(
          values,
          { text: "text", regex: "regex", gone: "gone", idle: "idle", exit: "exit" },
          command,
        ) ?? {};
      const client = await connect();
      try {
        const result = await client.request<ScreenResult>("wait", {
          session: session as string,
          wait,
          mode: values.full ? "full" : "diff",
          styles: styles(values.styles, command),
        });
        return screenOutput(result, wait);
      } finally {
        client.close();
      }
    }
    case "scrollback": {
      const { values, positionals } = parse(command, args, {
        lines: { type: "string" },
        search: { type: "string" },
        ...json,
      });
      const [session] = need(positionals, 1, command);
      const client = await connect();
      try {
        const result = await client.request<{ text: string }>("scrollback", {
          session: session as string,
          lines: values.lines ? parseLines(values.lines as string, command) : undefined,
          search: values.search as string | undefined,
        });
        return { text: result.text, json: result, code: EXIT.ok };
      } finally {
        client.close();
      }
    }
    case "list": {
      parse(command, args, json);
      const client = await connect(false);
      try {
        const result = await client.request<{ sessions: SessionInfo[] }>("list", {});
        return { text: formatList(result.sessions), json: result, code: EXIT.ok };
      } finally {
        client.close();
      }
    }
    case "kill": {
      const { values, positionals } = parse(command, args, {
        all: { type: "boolean" },
        signal: { type: "string" },
        ...json,
      });
      if (!values.all) need(positionals, 1, command);
      const client = await connect(false);
      try {
        const result = await client.request<{ killed: string[] }>(
          "kill",
          values.all
            ? { all: true }
            : { session: positionals[0], signal: values.signal as string | undefined },
        );
        const text = result.killed.length ? `killed ${result.killed.join(", ")}` : "no sessions";
        return { text, json: result, code: EXIT.ok };
      } finally {
        client.close();
      }
    }
    case "resize": {
      const { positionals } = parse(command, args, json);
      const [session, cols, rows] = need(positionals, 3, command);
      const client = await connect();
      try {
        const result = await client.request<ScreenResult>("resize", {
          session: session as string,
          cols: int(cols, "cols", command) as number,
          rows: int(rows, "rows", command) as number,
        });
        return screenOutput(result, undefined);
      } finally {
        client.close();
      }
    }
    case "recording": {
      const { positionals } = parse(command, args, json);
      const [session] = need(positionals, 1, command);
      const client = await connect();
      try {
        const result = await client.request<{ path: string }>("recording", {
          session: session as string,
        });
        return { text: result.path, json: result, code: EXIT.ok };
      } finally {
        client.close();
      }
    }
  }
  throw new UsageError(`unknown command ${command}\n\n${helpText()}`);
}
