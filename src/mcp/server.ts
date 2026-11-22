import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { DaemonClient, resolveCwd, resolveSecret, startRequestEnv } from "../daemon/client.js";
import type { ScreenResult } from "../daemon/protocol.js";
import { buildInput, formatList, formatScreen } from "../format.js";
import type { SessionInfo } from "../session/session.js";
import { VERSION } from "../version.js";
import { tools } from "./tools.js";

type Args = Record<string, unknown>;

function text(value: string): CallToolResult {
  return { content: [{ type: "text", text: value }] };
}

function failure(err: unknown): CallToolResult {
  return { content: [{ type: "text", text: (err as Error).message }], isError: true };
}

function need<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`${what} is required for this action`);
  return value;
}

function createMcpServer(client: DaemonClient): McpServer {
  const server = new McpServer({ name: "tui-use", version: VERSION });
  const screen = (r: ScreenResult, wait?: { timeout_ms?: number }) =>
    text(formatScreen(r, wait?.timeout_ms));

  const handlers: Record<keyof typeof tools, (a: Args) => Promise<CallToolResult>> = {
    async tui_start(a) {
      const wait = a.wait as { timeout_ms?: number } | undefined;
      const result = await client.request<ScreenResult>("start", {
        command: a.command as string,
        cwd: resolveCwd(a.cwd as string | undefined),
        env: startRequestEnv((a.env as Record<string, string>) ?? {}),
        cols: a.cols as number | undefined,
        rows: a.rows as number | undefined,
        name: a.name as string | undefined,
        wait,
      });
      return screen(result, wait);
    },
    async tui_send(a) {
      const wait = a.wait as { timeout_ms?: number } | undefined;
      const result = await client.request<ScreenResult>("send", {
        session: a.session as string,
        input: buildInput(a, resolveSecret),
        wait,
        mode: (a.mode as "full" | "diff" | undefined) ?? "diff",
      });
      return screen(result, wait);
    },
    async tui_snapshot(a) {
      const result = await client.request<ScreenResult>("snapshot", {
        session: a.session as string,
        mode: (a.mode as "full" | "diff" | undefined) ?? "full",
        styles: a.styles as "marks" | "none" | undefined,
      });
      if (!a.image) return screen(result);
      const shot = await client.request<{ png: string }>("screenshot", {
        session: a.session as string,
      });
      return {
        content: [
          { type: "text", text: formatScreen(result) },
          { type: "image", data: shot.png, mimeType: "image/png" },
        ],
      };
    },
    async tui_wait(a) {
      const wait = a.wait as { timeout_ms?: number };
      const result = await client.request<ScreenResult>("wait", {
        session: a.session as string,
        wait,
        mode: (a.mode as "full" | "diff" | undefined) ?? "diff",
      });
      return screen(result, wait);
    },
    async tui_scrollback(a) {
      const result = await client.request<{ text: string }>("scrollback", {
        session: a.session as string,
        lines: a.lines as [number, number] | undefined,
        search: a.search as string | undefined,
      });
      return text(result.text);
    },
    async tui_manage(a) {
      switch (a.action) {
        case "list": {
          const result = await client.request<{ sessions: SessionInfo[] }>("list", {});
          return text(formatList(result.sessions));
        }
        case "kill": {
          const result = await client.request<{ killed: string[]; exit_code: number | null }>(
            "kill",
            {
              session: need(a.session as string | undefined, "session"),
              signal: a.signal as string | undefined,
            },
          );
          return text(`killed ${result.killed.join(", ")} (exit ${result.exit_code})`);
        }
        case "resize": {
          const result = await client.request<ScreenResult>("resize", {
            session: need(a.session as string | undefined, "session"),
            cols: need(a.cols as number | undefined, "cols"),
            rows: need(a.rows as number | undefined, "rows"),
          });
          return screen(result);
        }
        case "recording": {
          const result = await client.request<{ path: string }>("recording", {
            session: need(a.session as string | undefined, "session"),
          });
          return text(result.path);
        }
      }
      throw new Error(`unknown action ${String(a.action)}`);
    },
  };

  for (const [name, def] of Object.entries(tools) as Array<
    [keyof typeof tools, (typeof tools)[keyof typeof tools]]
  >) {
    server.registerTool(
      name,
      { description: def.description, inputSchema: def.inputSchema },
      async (args: Args) => {
        try {
          return await handlers[name](args);
        } catch (err) {
          return failure(err);
        }
      },
    );
  }
  return server;
}

export async function runMcpServer(): Promise<void> {
  const client = await DaemonClient.connect({ kind: "mcp" });
  const server = createMcpServer(client);
  const transport = new StdioServerTransport();
  const shutdown = () => {
    client.close();
    process.exit(0);
  };
  transport.onclose = shutdown;
  process.stdin.on("end", shutdown);
  client.once("close", () => {
    console.error("tui-use: lost connection to the daemon");
    process.exit(1);
  });
  await server.connect(transport);
}
