import { describe, expect, it } from "vitest";
import { renderFull } from "../../../src/terminal/render.js";
import { screenOf } from "../../helpers/screen.js";

describe("renderScreen rows", () => {
  it("trims trailing spaces", async () => {
    const { screen } = await screenOf("ab   \r\ncd");
    expect(screen.rows.slice(0, 2)).toEqual(["ab", "cd"]);
  });

  it("renders wide characters once with cell-based cursor columns", async () => {
    const { screen } = await screenOf("日本x\x1b[D", { cursor: true });
    expect(screen.rows[0]).toBe("日本[x]");
    expect(screen.cursorCol).toBe(5);
  });
});

describe("cursor marker", () => {
  it("wraps the character under the cursor", async () => {
    const { screen } = await screenOf("fix the bug\x1b[3D", { cursor: true });
    expect(screen.rows[0]).toBe("fix the [b]ug");
    expect([screen.cursorRow, screen.cursorCol]).toEqual([1, 9]);
  });

  it("shows a blank cell as [ ]", async () => {
    const { screen } = await screenOf("$ ", { cursor: true });
    expect(screen.rows[0]).toBe("$ [ ]");
  });

  it("is omitted when the cursor is hidden", async () => {
    const { screen } = await screenOf("abc\x1b[?25l", { cursor: true });
    expect(screen.rows[0]).toBe("abc");
  });

  it("is omitted when cursor rendering is off", async () => {
    const { screen } = await screenOf("abc");
    expect(screen.rows[0]).toBe("abc");
  });
});

describe("renderFull", () => {
  it("numbers rows and collapses trailing blanks", () => {
    const rows = ["a", "", "b", ...Array(37).fill("")];
    const text = renderFull("HEADER", rows);
    expect(text.split("\n")).toEqual(["HEADER", "───", " 1│a", " 2│", " 3│b", "…(37 empty lines)"]);
  });

  it("uses the singular for one empty line", () => {
    expect(renderFull("H", ["a", ""]).split("\n").at(-1)).toBe("…(1 empty line)");
  });
});
