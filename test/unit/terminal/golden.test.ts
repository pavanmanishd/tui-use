import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Emulator } from "../../../src/terminal/emulator.js";
import { renderFull, renderScreen } from "../../../src/terminal/render.js";

const dir = new URL("../../golden/", import.meta.url);
const names = readdirSync(dir)
  .filter((f) => f.endsWith(".bytes"))
  .map((f) => f.replace(/\.bytes$/, ""));

describe("golden screens", () => {
  it("has captures", () => {
    expect(names.length).toBeGreaterThanOrEqual(5);
  });

  it.each(names)("%s renders as captured", async (name) => {
    const bytes = JSON.parse(readFileSync(new URL(`${name}.bytes`, dir), "utf8"));
    const emu = new Emulator(80, 24, 1000);
    await emu.write(bytes);
    const screen = renderScreen(emu, { styles: "marks", cursor: true });
    const expected = readFileSync(new URL(`${name}.txt`, dir), "utf8");
    expect(`${renderFull(name, screen.rows)}\n`).toBe(expected);
  });
});
