import { describe, expect, it } from "vitest";
import { parsePatch } from "./diff-parser";

describe("parsePatch", () => {
  it("parses add / del / context lines correctly", () => {
    const patch = "@@ -1,3 +1,3 @@\n context\n-removed\n+added\n still here";
    const hunks = parsePatch(patch);
    expect(hunks).toHaveLength(1);
    expect(hunks[0]?.lines.map((l) => l.type)).toEqual(["context", "del", "add", "context"]);
  });

  it("increments oldLine / newLine correctly", () => {
    const patch = "@@ -5,2 +5,2 @@\n ctx\n-del\n+add";
    const [hunk] = parsePatch(patch);
    const ctx = hunk?.lines[0];
    const del = hunk?.lines[1];
    const add = hunk?.lines[2];
    expect(ctx?.oldLine).toBe(5);
    expect(ctx?.newLine).toBe(5);
    expect(del?.oldLine).toBe(6);
    expect(del?.newLine).toBeUndefined();
    expect(add?.newLine).toBe(6);
    expect(add?.oldLine).toBeUndefined();
  });

  it("empty string lines are not counted as context (#11a fix)", () => {
    const patch = "@@ -1,2 +1,2 @@\n context\n\n+added";
    const hunks = parsePatch(patch);
    // Only " context" and "+added" — the "" is skipped entirely.
    expect(hunks[0]?.lines.map((l) => l.type)).toEqual(["context", "add"]);
  });

  it("'\\ No newline at end of file' is ignored (#11b fix)", () => {
    const patch = "@@ -1 +1 @@\n-old\n+new\n\\ No newline at end of file";
    const hunks = parsePatch(patch);
    expect(hunks[0]?.lines.map((l) => l.type)).toEqual(["del", "add"]);
  });

  it("handles multiple hunks", () => {
    const patch = "@@ -1,2 +1,2 @@\n ctx\n-a\n+b\n@@ -10,2 +10,2 @@\n ctx2\n-c\n+d";
    const hunks = parsePatch(patch);
    expect(hunks).toHaveLength(2);
    expect(hunks[0]?.oldStart).toBe(1);
    expect(hunks[1]?.oldStart).toBe(10);
  });

  it("skips +++ and --- header lines", () => {
    const patch = "@@ -1 +1 @@\n--- a/file.md\n+++ b/file.md\n-old\n+new";
    const hunks = parsePatch(patch);
    // +++ and --- are skipped; only del and add counted.
    expect(hunks[0]?.lines.map((l) => l.type)).toEqual(["del", "add"]);
  });

  it("returns empty array for empty input", () => {
    expect(parsePatch("")).toEqual([]);
  });
});
