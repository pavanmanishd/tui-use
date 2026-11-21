import { z } from "zod";

export const WaitSchema = z
  .object({
    text: z.string().optional(),
    regex: z.string().optional(),
    gone: z.string().optional(),
    idle_ms: z.number().int().nonnegative().optional(),
    exit: z.boolean().optional(),
    timeout_ms: z.number().int().nonnegative().optional(),
  })
  .strict();

export const InputItemSchema = z.union([
  z.object({ text: z.string() }).strict(),
  z.object({ key: z.string() }).strict(),
  z.object({ paste: z.string() }).strict(),
  z.object({ secret: z.string() }).strict(),
]);

const session = z.string().min(1);
const mode = z.enum(["full", "diff"]);
const styles = z.enum(["marks", "none"]);
const size = z.number().int().min(10).max(1000);

export const methods = {
  hello: z.object({ version: z.string(), kind: z.enum(["mcp", "cli"]) }).strict(),
  start: z
    .object({
      command: z.string().min(1),
      cwd: z.string(),
      env: z.record(z.string(), z.string()),
      cols: size.default(120),
      rows: size.default(40),
      name: z.string().min(1).optional(),
      wait: WaitSchema.optional(),
    })
    .strict(),
  send: z
    .object({
      session,
      input: z.array(InputItemSchema),
      wait: WaitSchema.optional(),
      mode: mode.default("diff"),
      styles: styles.default("marks"),
    })
    .strict(),
  snapshot: z
    .object({ session, mode: mode.default("full"), styles: styles.default("marks") })
    .strict(),
  wait: z
    .object({
      session,
      wait: WaitSchema,
      mode: mode.default("diff"),
      styles: styles.default("marks"),
    })
    .strict(),
  scrollback: z
    .object({
      session,
      lines: z.tuple([z.number().int(), z.number().int()]).optional(),
      search: z.string().min(1).optional(),
    })
    .strict()
    .refine((p) => !(p.lines && p.search), "pass either lines or search, not both"),
  list: z.object({}).strict(),
  kill: z
    .object({
      session: session.optional(),
      all: z.boolean().optional(),
      signal: z
        .string()
        .regex(/^SIG[A-Z0-9]+$/)
        .optional(),
    })
    .strict()
    .refine((p) => Boolean(p.session) !== Boolean(p.all), "pass either session or all"),
  resize: z.object({ session, cols: size, rows: size }).strict(),
  recording: z.object({ session }).strict(),
  attach: z.object({ session }).strict(),
  input: z.object({ data: z.string() }).strict(),
  shutdown: z.object({}).strict(),
} as const;

export type Method = keyof typeof methods;
export type Params<M extends Method> = z.input<(typeof methods)[M]>;
export type ParsedParams<M extends Method> = z.output<(typeof methods)[M]>;

export interface ScreenResult {
  session: string;
  text: string;
  state: "running" | "exited";
  exit_code: number | null;
  settled?: boolean;
  fired?: string;
  timed_out?: boolean;
}

export interface HelloResult {
  version: string;
  sessions: number;
}

export interface AttachResult {
  session: string;
  cols: number;
  rows: number;
  screen: string;
  exit_code: number | null;
}

export const ErrorCode = {
  parse: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  app: 1,
} as const;

export interface RpcRequest {
  jsonrpc: "2.0";
  id?: number | string;
  method: string;
  params?: unknown;
}

export interface RpcResponse {
  jsonrpc: "2.0";
  id: number | string | null;
  result?: unknown;
  error?: { code: number; message: string };
}

export function parseParams<M extends Method>(method: M, params: unknown): ParsedParams<M> {
  const result = methods[method].safeParse(params ?? {});
  if (result.success) return result.data as ParsedParams<M>;
  const problems = result.error.issues.map((i) => {
    const path = i.path.join(".");
    return path ? `${path}: ${i.message}` : i.message;
  });
  throw new RpcError(ErrorCode.invalidParams, `invalid ${method} params: ${problems.join("; ")}`);
}

export class RpcError extends Error {
  constructor(
    readonly code: number,
    message: string,
  ) {
    super(message);
  }
}

export class LineReader {
  private buffer = "";

  push(chunk: string, onLine: (line: string) => void): void {
    this.buffer += chunk;
    let index = this.buffer.indexOf("\n");
    while (index !== -1) {
      const line = this.buffer.slice(0, index);
      this.buffer = this.buffer.slice(index + 1);
      if (line.trim()) onLine(line);
      index = this.buffer.indexOf("\n");
    }
  }
}

export function encodeMessage(message: unknown): string {
  return `${JSON.stringify(message)}\n`;
}
