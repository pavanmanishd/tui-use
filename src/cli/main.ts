#!/usr/bin/env node
import { loadConfig } from "../daemon/config.js";
import { configPath, logPath, recordingsDir, socketPath } from "../daemon/paths.js";
import { DaemonAlreadyRunning, startDaemon } from "../daemon/server.js";
import { replay } from "../recorder/replay.js";
import { VERSION } from "../version.js";
import { attach } from "./attach.js";
import { EXIT, helpText, parse, run, USAGE, UsageError } from "./commands.js";

const DAEMON_IDLE_EXIT_MS = 30 * 60_000;

async function runDaemon(): Promise<number> {
  const log = (message: string) => console.error(`${new Date().toISOString()} ${message}`);
  process.on("uncaughtException", (err) => log(`uncaught: ${err.stack}`));
  process.on("unhandledRejection", (err) => log(`unhandled: ${(err as Error)?.stack ?? err}`));
  try {
    const daemon = await startDaemon({
      socketPath: socketPath(),
      config: loadConfig(configPath()),
      recordingsDir: recordingsDir(),
      idleExitMs: DAEMON_IDLE_EXIT_MS,
      log,
      onExit: () => process.exit(0),
    });
    for (const signal of ["SIGTERM", "SIGINT", "SIGHUP"] as const) {
      process.on(signal, () => void daemon.close());
    }
    return new Promise<number>(() => {});
  } catch (err) {
    if (err instanceof DaemonAlreadyRunning) return EXIT.ok;
    log(`failed to start: ${(err as Error).message}`);
    return EXIT.error;
  }
}

async function main(argv: string[]): Promise<number> {
  const [command, ...args] = argv;
  if (!command || command === "--help" || command === "-h" || command === "help") {
    console.log(helpText());
    return command ? EXIT.ok : EXIT.usage;
  }
  if (command === "--version" || command === "-v") {
    console.log(VERSION);
    return EXIT.ok;
  }
  if (command === "daemon") return runDaemon();
  if (command === "mcp") {
    const { runMcpServer } = await import("../mcp/server.js");
    await runMcpServer();
    return new Promise<number>(() => {});
  }
  if (command === "attach") {
    const { positionals } = parse(command, args, {});
    if (positionals.length !== 1) throw new UsageError(`usage: ${USAGE.attach}`);
    return attach(positionals[0] as string);
  }
  if (command === "replay") {
    const { values, positionals } = parse(command, args, { speed: { type: "string" } });
    const speed = Number(values.speed ?? 1);
    if (positionals.length !== 1 || !(speed > 0)) throw new UsageError(`usage: ${USAGE.replay}`);
    await replay(positionals[0] as string, { speed, write: (d) => process.stdout.write(d) });
    return EXIT.ok;
  }

  const output = await run(command, args);
  const asJson = args.includes("--json");
  console.log(asJson ? JSON.stringify(output.json, null, 2) : output.text);
  return output.code;
}

main(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code;
  },
  (err: Error) => {
    if (err instanceof UsageError) {
      console.error(err.message);
      process.exitCode = EXIT.usage;
      return;
    }
    console.error(`tui-use: ${err.message}`);
    if (/daemon/.test(err.message) && !/see /.test(err.message)) {
      console.error(`daemon log: ${logPath()}`);
    }
    process.exitCode = EXIT.error;
  },
);
