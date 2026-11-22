export const MOUSE_ACTIONS = [
  "click",
  "double_click",
  "right_click",
  "middle_click",
  "scroll_up",
  "scroll_down",
] as const;

export type MouseAction = (typeof MOUSE_ACTIONS)[number];

export interface MouseInput {
  action: MouseAction;
  row: number;
  col: number;
}

export interface MouseModes {
  tracking: boolean;
  sgr: boolean;
  releases: boolean;
}

const BUTTON: Record<MouseAction, number> = {
  click: 0,
  double_click: 0,
  middle_click: 1,
  right_click: 2,
  scroll_up: 64,
  scroll_down: 65,
};

const LEGACY_LIMIT = 95;

function event(button: number, row: number, col: number, release: boolean, sgr: boolean): string {
  if (sgr) return `\x1b[<${button};${col};${row}${release ? "m" : "M"}`;
  const code = release ? 3 : button;
  return `\x1b[M${String.fromCharCode(32 + code, 32 + col, 32 + row)}`;
}

export function encodeMouse(
  input: MouseInput,
  modes: MouseModes,
  screen: { rows: number; cols: number },
): string {
  if (!modes.tracking) {
    throw new Error("the program has not turned on mouse input; use keys instead");
  }
  const { row, col, action } = input;
  if (row > screen.rows || col > screen.cols) {
    throw new Error(`row ${row}, col ${col} is outside the ${screen.cols}x${screen.rows} screen`);
  }
  if (!modes.sgr && (row > LEGACY_LIMIT || col > LEGACY_LIMIT)) {
    throw new Error(`row and col must be at most ${LEGACY_LIMIT} for this program's mouse mode`);
  }
  const button = BUTTON[action];
  if (action === "scroll_up" || action === "scroll_down")
    return event(button, row, col, false, modes.sgr);
  const press = event(button, row, col, false, modes.sgr);
  const click = modes.releases ? press + event(button, row, col, true, modes.sgr) : press;
  return action === "double_click" ? click + click : click;
}
