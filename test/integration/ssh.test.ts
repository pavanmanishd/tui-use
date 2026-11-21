import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startSession } from "../helpers/session.js";

const PASSWORD = "correct-horse-battery";
const NAME = `tui-use-sshd-${process.pid}`;

function dockerAvailable(): boolean {
  try {
    execSync("docker info", { stdio: "ignore", timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

const docker = dockerAvailable();

describe.skipIf(!docker)("ssh with a password from secret_env", () => {
  let port = 0;

  beforeAll(() => {
    const context = fileURLToPath(new URL("./sshd", import.meta.url));
    execSync(`docker build -q -t tui-use-sshd ${context}`, { stdio: "ignore" });
    execSync(`docker run -d --rm --name ${NAME} -p 127.0.0.1::22 tui-use-sshd`, { stdio: "ignore" });
    port = Number(execSync(`docker port ${NAME} 22`).toString().trim().split(":").pop());
  }, 180_000);

  afterAll(() => {
    execSync(`docker rm -f ${NAME}`, { stdio: "ignore" });
  });

  it("logs in, edits a file, and never shows the password", async () => {
    const s = startSession(
      `ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p ${port} tester@127.0.0.1`,
      { record: true },
    );
    await s.wait({ regex: "password:", timeout_ms: 20_000 });
    s.send([{ secret: PASSWORD }, { key: "enter" }]);
    await s.wait({ regex: "\\$ $", timeout_ms: 10_000 });

    s.send([{ text: "vi note.txt\n" }]);
    await s.wait({ text: "note.txt" });
    s.send([{ text: "ihello from tui-use" }, { key: "esc" }, { text: ":wq\n" }]);
    await s.wait({ regex: "\\$ $" });
    s.send([{ text: `cat note.txt; echo ${PASSWORD}\n` }]);
    await s.wait({ text: "hello from tui-use" });

    const snap = await s.snapshot("full", "marks");
    expect(snap).toContain("hello from tui-use");
    expect(snap).not.toContain(PASSWORD);
    expect(await s.scrollback({ search: "horse" })).toContain("no matches");

    s.send([{ text: "exit\n" }]);
    await s.wait({ exit: true });
    expect(readFileSync(s.recordingPath as string, "utf8")).not.toContain(PASSWORD);
  });
});
