export interface Key {
  base: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
}

const NAMED = new Set([
  "enter",
  "tab",
  "esc",
  "backspace",
  "delete",
  "up",
  "down",
  "left",
  "right",
  "home",
  "end",
  "pageup",
  "pagedown",
  "space",
  ...Array.from({ length: 12 }, (_, i) => `f${i + 1}`),
]);

const MODIFIERS = new Set(["ctrl", "alt", "shift"]);

export const KEY_HELP =
  "use enter, tab, esc, backspace, delete, up, down, left, right, home, end, pageup, pagedown, " +
  "space, f1-f12 or a single character, optionally prefixed with ctrl+, alt+ or shift+ " +
  "(e.g. ctrl+c, alt+x, shift+tab)";

export function isKeyName(name: string): boolean {
  try {
    parseKey(name);
    return true;
  } catch {
    return false;
  }
}

export function parseKey(name: string): Key {
  const fail = () => new Error(`unknown key "${name}": ${KEY_HELP}`);
  if (name.length === 0) throw fail();

  const parts = name.split("+");
  let base = parts.pop() as string;
  if (base === "" && parts.at(-1) === "") {
    parts.pop();
    base = "+";
  }

  const key: Key = { base: "", ctrl: false, alt: false, shift: false };
  for (const part of parts) {
    const mod = part.toLowerCase();
    if (!MODIFIERS.has(mod) || key[mod as "ctrl" | "alt" | "shift"]) throw fail();
    key[mod as "ctrl" | "alt" | "shift"] = true;
  }

  if ([...base].length === 1 && base !== " ") {
    key.base = base;
    if (key.ctrl || key.alt) key.base = base.toLowerCase();
    return key;
  }
  const lower = base.toLowerCase();
  if (!NAMED.has(lower)) throw fail();
  key.base = lower;
  return key;
}
