import { fileURLToPath } from "node:url";

export function fixture(name: string, ...args: string[]): string {
  const path = fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));
  return [process.execPath, path, ...args].map((a) => `'${a}'`).join(" ");
}
