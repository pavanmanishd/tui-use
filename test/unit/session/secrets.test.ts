import { describe, expect, it } from "vitest";
import { Redactor } from "../../../src/session/secrets.js";

describe("Redactor", () => {
  it("replaces exact matches", () => {
    const r = new Redactor();
    r.add("hunter2");
    expect(r.redact("pw=hunter2 again hunter2")).toBe("pw=*** again ***");
  });

  it("prefers the longest secret when secrets overlap", () => {
    const r = new Redactor();
    r.add("abc");
    r.add("abcdef");
    expect(r.redact("xabcdefx")).toBe("x***x");
  });

  it("ignores empty secrets", () => {
    const r = new Redactor();
    r.add("");
    expect(r.redact("abc")).toBe("abc");
  });
});

describe("StreamRedactor", () => {
  const collect = (secrets: string[], chunks: string[]) => {
    const r = new Redactor();
    for (const s of secrets) r.add(s);
    const stream = r.stream();
    return chunks.map((c) => stream.push(c)).join("") + stream.flush();
  };

  it("catches a secret split across chunks", () => {
    expect(collect(["hunter2"], ["pw: hun", "ter2\r\n"])).toBe("pw: ***\r\n");
  });

  it("catches a secret split into single characters", () => {
    expect(collect(["s3cret"], [..."xx s3cret yy"])).toBe("xx *** yy");
  });

  it("handles several secrets", () => {
    expect(collect(["aaa", "bbbb"], ["1aa", "a2bb", "bb3"])).toBe("1***2***3");
  });

  it("passes output straight through without secrets", () => {
    const stream = new Redactor().stream();
    expect(stream.push("hello")).toBe("hello");
  });

  it("picks up secrets added mid-stream", () => {
    const r = new Redactor();
    const stream = r.stream();
    expect(stream.push("before ")).toBe("before ");
    r.add("token");
    expect(stream.push("tok") + stream.push("en!") + stream.flush()).toBe("***!");
  });
});

describe("Redactor.ranges", () => {
  it("finds non-overlapping ranges, longest secret first", () => {
    const r = new Redactor();
    r.add("ab");
    r.add("abcd");
    expect(r.ranges("xabcdyab")).toEqual([
      [1, 5],
      [6, 8],
    ]);
  });
});
