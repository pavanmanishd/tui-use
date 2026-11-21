import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Recorder, recordingName } from "../../../src/recorder/writer.js";
import { Redactor } from "../../../src/session/secrets.js";

const header = {
  cols: 80,
  rows: 24,
  command: "python3",
  term: "xterm-256color",
  shell: "/bin/zsh",
};

function read(path: string) {
  return readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
}

describe("Recorder", () => {
  it("writes an asciinema v2 header, output and resize events", () => {
    const path = join(mkdtempSync(join(tmpdir(), "rec-")), "sub", "a.cast");
    const rec = new Recorder(path, header, new Redactor().stream());
    rec.output(">>> ");
    rec.resize(160, 50);
    rec.close();
    const [head, out, resize] = read(path);
    expect(head).toMatchObject({
      version: 2,
      width: 80,
      height: 24,
      title: "python3",
      env: { TERM: "xterm-256color", SHELL: "/bin/zsh" },
    });
    expect(out.slice(1)).toEqual(["o", ">>> "]);
    expect(resize.slice(1)).toEqual(["r", "160x50"]);
    expect(typeof out[0]).toBe("number");
  });

  it("never records a secret, even split across chunks", () => {
    const path = join(mkdtempSync(join(tmpdir(), "rec-")), "b.cast");
    const redactor = new Redactor();
    redactor.add("hunter2");
    const rec = new Recorder(path, header, redactor.stream());
    rec.output("echo: hun");
    rec.output("ter2\r\n");
    rec.close();
    const text = readFileSync(path, "utf8");
    expect(text).not.toContain("hunter2");
    expect(text).not.toContain('hun"');
    const output = read(path)
      .slice(1)
      .map((e) => e[2])
      .join("");
    expect(output).toBe("echo: ***\r\n");
  });
});

describe("recordingName", () => {
  it("formats the date, time and id", () => {
    expect(recordingName("s3", new Date(2026, 10, 21, 9, 5, 7))).toBe("20261121-090507-s3.cast");
  });
});
