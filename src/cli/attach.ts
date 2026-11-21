import { DaemonClient } from "../daemon/client.js";
import type { AttachResult } from "../daemon/protocol.js";

const DETACH = "\x1d";
const RESTORE =
  "\x1b[0m\x1b[?1049l\x1b[?25h\x1b[?1l\x1b[?2004l\x1b[?1000l\x1b[?1002l\x1b[?1006l\r\n";

export async function attach(session: string): Promise<number> {
  const { stdin, stdout } = process;
  if (!stdin.isTTY) {
    process.stderr.write("tui-use attach needs an interactive terminal\n");
    return 1;
  }
  const client = await DaemonClient.connect({ kind: "cli" });
  const info = await client.request<AttachResult>("attach", { session });

  const cols = stdout.columns ?? info.cols;
  const rows = stdout.rows ?? info.rows;
  if (cols < info.cols || rows < info.rows) {
    stdout.write(
      `tui-use: session ${info.session} is ${info.cols}x${info.rows} but this terminal is ${cols}x${rows}; the view may wrap\r\n`,
    );
  }
  stdout.write(`\x1b[2J\x1b[H${info.screen}`);

  return new Promise<number>((resolve) => {
    let done = false;
    const finish = (message: string, code: number) => {
      if (done) return;
      done = true;
      stdin.off("data", onInput);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write(`${RESTORE}${message}\n`);
      client.close();
      resolve(code);
    };
    const onInput = (chunk: Buffer) => {
      const data = chunk.toString("utf8");
      const cut = data.indexOf(DETACH);
      if (cut === -1) {
        client.notify("input", { data });
        return;
      }
      if (cut > 0) client.notify("input", { data: data.slice(0, cut) });
      finish(`detached from ${info.session}`, 0);
    };

    if (info.exit_code !== null) {
      finish(`session exited (${info.exit_code})`, 0);
      return;
    }
    client.on("notification", (method: string, params: { data?: string; code?: number }) => {
      if (method === "output" && params.data) stdout.write(params.data);
      else if (method === "exit") finish(`session exited (${params.code})`, 0);
    });
    client.once("close", () => finish("the tui-use daemon closed the connection", 1));
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", onInput);
  });
}
