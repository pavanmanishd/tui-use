import { z } from "zod";
import { MOUSE_ACTIONS } from "../keys/mouse.js";

const wait = z
  .object({
    text: z.string().optional().describe("Return once this substring is on screen."),
    regex: z.string().optional().describe("Return once this JavaScript regex matches the screen."),
    gone: z
      .string()
      .optional()
      .describe(
        "Return once this substring is no longer on screen (e.g. a spinner or 'Installing').",
      ),
    idle_ms: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Return after this long with no output."),
    exit: z.boolean().optional().describe("Return when the program exits."),
    timeout_ms: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Upper bound in ms. Default 5000, max 600000."),
  })
  .strict()
  .describe(
    "When to return. Conditions are OR-ed. Without one, the tool waits until the screen stops changing (300 ms quiet), which is fine for most steps; use text/regex/gone for slow programs.",
  );

const session = z.string().min(1).describe("Session id (s1) or the name given to tui_start.");
const mode = z
  .enum(["full", "diff"])
  .describe("full: the whole screen. diff: only rows that changed since the last screen you saw.");
const styles = z
  .enum(["marks", "none"])
  .describe("marks (default) wraps highlighted text such as the selected menu item in «…».");

export const tools = {
  tui_start: {
    description:
      "Start an interactive program (vim, git rebase -i, npm init, ssh, python, psql, htop, an installer...) in a real terminal and return its screen. Use this instead of the shell tool whenever a command prompts for input, opens an editor or pager, or draws a full-screen UI. The session stays open across calls; drive it with tui_send.",
    inputSchema: {
      command: z.string().min(1).describe("Command line, run through your shell."),
      cwd: z.string().optional().describe("Working directory. Defaults to the server's cwd."),
      env: z.record(z.string(), z.string()).optional().describe("Extra environment variables."),
      cols: z.number().int().min(10).max(1000).optional().describe("Terminal width, default 120."),
      rows: z.number().int().min(10).max(1000).optional().describe("Terminal height, default 40."),
      name: z.string().min(1).optional().describe("Optional name to refer to the session by."),
      wait: wait.optional(),
    },
  },
  tui_send: {
    description:
      "Type into a session, wait for it to respond, and return the new screen (as a diff by default). The screen shows row numbers, the cursor as [x], and highlighted items as «…». text is typed first, then secret_env, then keys. Use input for interleaving, e.g. save and quit vim: input=[{key:'esc'},{text:':wq'},{key:'enter'}]. Edits that depend on where the cursor lands can go wrong when batched; prefer commands that do not (e.g. vim :2,3s/^pick/squash/) or check the screen between steps. Key names: enter, tab, esc, backspace, delete, up, down, left, right, home, end, pageup, pagedown, space, f1-f12, single characters, with ctrl+/alt+/shift+ (ctrl+c, shift+tab).",
    inputSchema: {
      session,
      text: z.string().optional().describe("Text typed literally. \\n is sent as Enter."),
      keys: z.array(z.string()).optional().describe("Keys pressed after text, in order."),
      input: z
        .array(
          z.union([
            z.object({ text: z.string() }).strict(),
            z.object({ key: z.string() }).strict(),
            z.object({ secret_env: z.string() }).strict(),
            z
              .object({
                mouse: z
                  .object({
                    action: z.enum(MOUSE_ACTIONS),
                    row: z.number().int().min(1),
                    col: z.number().int().min(1),
                  })
                  .strict(),
              })
              .strict(),
          ]),
        )
        .optional()
        .describe(
          "Ordered mix of text, keys, secrets and mouse events. When given, text/keys/secret_env are ignored. A mouse event clicks or scrolls at a screen row and column as numbered in the snapshot, e.g. {mouse:{action:'click',row:5,col:12}}; it only works in programs that turned on mouse input.",
        ),
      secret_env: z
        .string()
        .optional()
        .describe(
          "Name of an environment variable of the tui-use server whose value is typed (e.g. a password). The value never appears in responses or recordings.",
        ),
      paste: z
        .boolean()
        .optional()
        .describe(
          "Send text as a bracketed paste: use for multi-line input into editors and REPLs.",
        ),
      wait: wait.optional(),
      mode: mode.optional().describe("Default diff."),
    },
  },
  tui_snapshot: {
    description:
      "Return the current screen of a session without sending input. Use image: true to also get a PNG of the screen with its colours, for when layout or colour matters more than text.",
    inputSchema: {
      session,
      mode: mode.optional().describe("Default full."),
      styles: styles.optional(),
      image: z.boolean().optional().describe("Also return a PNG screenshot of the screen."),
    },
  },
  tui_wait: {
    description:
      "Wait without sending input, for slow work like builds, installs and downloads, then return the screen. Prefer text/regex/gone conditions with a generous timeout_ms.",
    inputSchema: {
      session,
      wait,
      mode: mode.optional().describe("Default diff."),
    },
  },
  tui_scrollback: {
    description:
      "Read output that scrolled off the screen. Pass lines=[from, to] (1-based, negative counts from the end, e.g. [-50, -1]) or search='text' for matching lines with 2 lines of context. Defaults to the last 40 lines.",
    inputSchema: {
      session,
      lines: z.tuple([z.number().int(), z.number().int()]).optional(),
      search: z.string().min(1).optional(),
    },
  },
  tui_manage: {
    description:
      "Session housekeeping. action=list shows all sessions; kill ends one (signal defaults to SIGTERM, then SIGKILL after 2 s); resize changes its size; recording returns the path of its asciinema recording.",
    inputSchema: {
      action: z.enum(["list", "kill", "resize", "recording"]),
      session: session.optional().describe("Required for kill, resize and recording."),
      signal: z.string().optional().describe("For kill, e.g. SIGINT or SIGKILL."),
      cols: z.number().int().min(10).max(1000).optional().describe("For resize."),
      rows: z.number().int().min(10).max(1000).optional().describe("For resize."),
    },
  },
} as const;
