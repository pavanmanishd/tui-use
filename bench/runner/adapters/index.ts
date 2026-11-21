import { claudeCode } from "./claude-code.js";
import { gemini } from "./gemini.js";
import { opencode } from "./opencode.js";
import type { Adapter } from "./types.js";

export const ADAPTERS: Record<string, Adapter> = {
  [claudeCode.name]: claudeCode,
  [gemini.name]: gemini,
  [opencode.name]: opencode,
};
