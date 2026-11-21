import type { Key } from "./grammar.js";

export interface KeyModes {
  applicationCursorKeys: boolean;
}

const ESC = "\x1b";

const CURSOR: Record<string, string> = {
  up: "A",
  down: "B",
  right: "C",
  left: "D",
  home: "H",
  end: "F",
};

const TILDE: Record<string, number> = {
  delete: 3,
  pageup: 5,
  pagedown: 6,
  f5: 15,
  f6: 17,
  f7: 18,
  f8: 19,
  f9: 20,
  f10: 21,
  f11: 23,
  f12: 24,
};

const SS3: Record<string, string> = { f1: "P", f2: "Q", f3: "R", f4: "S" };

const CTRL_SYMBOLS: Record<string, string> = {
  "@": "\x00",
  "[": "\x1b",
  "\\": "\x1c",
  "]": "\x1d",
  "^": "\x1e",
  _: "\x1f",
  "?": "\x7f",
};

function modifierParam(key: Key): number {
  return 1 + (key.shift ? 1 : 0) + (key.alt ? 2 : 0) + (key.ctrl ? 4 : 0);
}

function encodeChar(key: Key): string {
  let out = key.base;
  if (key.ctrl) {
    if (/^[a-z]$/.test(out)) out = String.fromCharCode(out.charCodeAt(0) & 0x1f);
    else if (out in CTRL_SYMBOLS) out = CTRL_SYMBOLS[out] as string;
    else throw new Error(`ctrl+${key.base} has no control code`);
  } else if (key.shift) {
    out = out.toUpperCase();
  }
  return key.alt ? ESC + out : out;
}

export function encodeKey(key: Key, modes: KeyModes): string {
  const { base } = key;
  if (base.length === 1 || [...base].length === 1) return encodeChar(key);

  const mods = key.ctrl || key.alt || key.shift;
  const param = modifierParam(key);

  if (base in CURSOR) {
    const final = CURSOR[base] as string;
    if (mods) return `${ESC}[1;${param}${final}`;
    return modes.applicationCursorKeys ? `${ESC}O${final}` : `${ESC}[${final}`;
  }
  if (base in TILDE) {
    const code = TILDE[base] as number;
    return mods ? `${ESC}[${code};${param}~` : `${ESC}[${code}~`;
  }
  if (base in SS3) {
    const final = SS3[base] as string;
    return mods ? `${ESC}[1;${param}${final}` : `${ESC}O${final}`;
  }

  const alt = key.alt ? ESC : "";
  switch (base) {
    case "enter":
      return `${alt}\r`;
    case "tab":
      return key.shift ? `${ESC}[Z` : `${alt}\t`;
    case "esc":
      return `${alt}${ESC}`;
    case "backspace":
      return `${alt}${key.ctrl ? "\x08" : "\x7f"}`;
    case "space":
      return key.ctrl ? `${alt}\x00` : `${alt} `;
  }
  throw new Error(`cannot encode key "${base}"`);
}

export function encodeText(text: string): string {
  return text.replace(/\r?\n/g, "\r");
}

export function encodePaste(text: string, bracketed: boolean): string {
  if (!bracketed) return encodeText(text);
  const body = encodeText(text).replaceAll(`${ESC}[201~`, "");
  return `${ESC}[200~${body}${ESC}[201~`;
}
