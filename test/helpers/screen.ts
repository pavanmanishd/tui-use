import { Emulator } from "../../src/terminal/emulator.js";
import { type RenderOptions, renderScreen } from "../../src/terminal/render.js";

export async function screenOf(
  bytes: string,
  options: Partial<RenderOptions> = {},
  cols = 20,
  rows = 5,
) {
  const emu = new Emulator(cols, rows, 100);
  await emu.write(bytes);
  const screen = renderScreen(emu, { styles: "marks", cursor: false, ...options });
  return { emu, screen };
}
