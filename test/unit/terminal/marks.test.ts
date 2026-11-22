import { describe, expect, it } from "vitest";
import { screenOf } from "../../helpers/screen.js";

const REV = "\x1b[7m";
const OFF = "\x1b[0m";

describe("style marks", () => {
  it("marks a reverse-video menu item", async () => {
    const { screen } = await screenOf(`one\r\n${REV}two${OFF}\r\nthree`);
    expect(screen.rows.slice(0, 3)).toEqual(["one", "«two»", "three"]);
  });

  it("marks a colour-bar selection spanning the row", async () => {
    const bar = `\x1b[48;5;236m> beta${" ".repeat(14)}${OFF}`;
    const { screen } = await screenOf(`  alpha\r\n${bar}\r\n  gamma`);
    expect(screen.rows.slice(0, 3)).toEqual(["  alpha", "«> beta»", "  gamma"]);
  });

  it("does not mark the majority background of a painted screen", async () => {
    const blue = "\x1b[44m";
    const cyan = "\x1b[46m";
    const fill = (text: string) => text.padEnd(20);
    const bytes = `${blue}${fill("left panel")}\r\n${cyan}${fill("selected")}${blue}\r\n${fill("file")}\r\n${fill("")}\r\n${fill("")}`;
    const { screen } = await screenOf(bytes);
    expect(screen.rows.slice(0, 3)).toEqual(["left panel", "«selected»", "file"]);
  });

  it("escapes literal guillemets in marks mode only", async () => {
    const marked = await screenOf("«quote» a\\b");
    expect(marked.screen.rows[0]).toBe("\\«quote\\» a\\b");
    const plain = await screenOf("«quote»", { styles: "none" });
    expect(plain.screen.rows[0]).toBe("«quote»");
  });

  it("drops marks with styles none", async () => {
    const { screen } = await screenOf(`${REV}two${OFF}`, { styles: "none" });
    expect(screen.rows[0]).toBe("two");
  });

  it("keeps an empty highlighted row visible", async () => {
    const { screen } = await screenOf(`x\r\n${REV}${" ".repeat(20)}${OFF}`);
    expect(screen.rows[1]).toBe("« »");
  });

  it("combines the cursor with a mark", async () => {
    const { screen } = await screenOf(`${REV}ab${OFF}\x1b[1;1H`, { cursor: true });
    expect(screen.rows[0]).toBe("«[a]b»");
  });
});

describe("blank marked runs", () => {
  it("drops a painted gutter next to unselected items", async () => {
    const gutter = "\x1b[48;5;236m \x1b[0m";
    const { screen } = await screenOf(
      `${gutter} alpha\r\n\x1b[48;5;236m▌ beta\x1b[0m\r\n${gutter} gamma`,
    );
    expect(screen.rows.slice(0, 3)).toEqual(["  alpha", "«▌ beta»", "  gamma"]);
  });
});

describe("highlighted blank cells", () => {
  it("keeps a highlighted blank cell inside a row", async () => {
    const { screen } = await screenOf("[\x1b[41m \x1b[0m] Install nginx");
    expect(screen.rows[0]).toBe("[« »] Install nginx");
  });
});

describe("highlights of different strength", () => {
  it("marks the brighter of two coloured buttons as the strong one", async () => {
    const active = "\x1b[48;5;212m   Yes   \x1b[0m";
    const inactive = "\x1b[48;5;236m   No   \x1b[0m";
    const { screen } = await screenOf(`${active}  ${inactive}`, {}, 40, 3);
    expect(screen.rows[0]).toBe("«   Yes   »  ‹   No›");
  });

  it("keeps a single highlight colour strong", async () => {
    const { screen } = await screenOf("\x1b[7mone\x1b[0m two \x1b[7mthree\x1b[0m");
    expect(screen.rows[0]).toBe("«one» two «three»");
  });

  it("ranks highlights after dropping a painted gutter", async () => {
    const { screen } = await screenOf("\x1b[47m  \x1b[0mfoo\x1b[44mbar\x1b[0m");
    expect(screen.rows[0]).toBe("  foo«bar»");
  });

  it("escapes literal single guillemets", async () => {
    const { screen } = await screenOf("‹a›");
    expect(screen.rows[0]).toBe("\\‹a\\›");
  });
});
