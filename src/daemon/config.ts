import { readFileSync } from "node:fs";
import { z } from "zod";

const schema = z
  .object({
    maxSessions: z.number().int().positive().default(8),
    idleTimeoutMinutes: z.number().positive().default(30),
    scrollbackLines: z.number().int().nonnegative().default(10_000),
    recordings: z.boolean().default(true),
    recordingRetentionDays: z.number().positive().default(7),
    deny: z
      .array(
        z.string().refine((p) => {
          try {
            new RegExp(p);
            return true;
          } catch {
            return false;
          }
        }, "not a valid regular expression"),
      )
      .default([]),
  })
  .strict();

export type Config = z.infer<typeof schema>;

export const DEFAULT_CONFIG: Config = schema.parse({});

export function parseConfig(raw: unknown, source: string): Config {
  const result = schema.safeParse(raw);
  if (result.success) return result.data;
  const problems = result.error.issues.map((issue) => {
    if (issue.code === "unrecognized_keys") return `unknown key ${issue.keys.join(", ")}`;
    const path = issue.path.join(".");
    return `${path || "config"}: ${issue.message}`;
  });
  throw new Error(`invalid config ${source}: ${problems.join("; ")}`);
}

export function loadConfig(path: string): Config {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return DEFAULT_CONFIG;
    throw err;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    throw new Error(`invalid config ${path}: ${(err as Error).message}`);
  }
  return parseConfig(raw, path);
}
