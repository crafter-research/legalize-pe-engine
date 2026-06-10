import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CORPUS_REPO, loadCorpus, normUniqueId } from "./corpus.ts";

describe("normUniqueId", () => {
  it("derives a url-safe unique id from a corpus path", () => {
    expect(normUniqueId("pe/DECRETO_LEGISLATIVO-295.md")).toBe("pe-decreto-legislativo-295");
    expect(normUniqueId("pe-are/001-2026.md")).toBe("pe-are-001-2026");
  });
  it("output always matches ^[a-z0-9-]+$", () => {
    expect(normUniqueId("pe-lim-met/Nº 047-2026.md")).toMatch(/^[a-z0-9-]+$/);
  });
  it("distinguishes same identifier across jurisdictions", () => {
    expect(normUniqueId("pe-are/001-2026.md")).not.toBe(normUniqueId("pe-pun/001-2026.md"));
  });
});

// Integration: only runs where the corpus is checked out (skips in CI without it).
describe.skipIf(!existsSync(CORPUS_REPO))("loadCorpus", () => {
  it("loads the corpus and builds a searchable index", () => {
    const { norms, fuse, byId } = loadCorpus();
    expect(norms.length).toBeGreaterThan(1000);
    expect(byId.size).toBe(norms.length); // ids are unique (no collisions)
    expect(fuse.search("constitución").length).toBeGreaterThan(0);
  });
});
