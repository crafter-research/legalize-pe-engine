import { describe, expect, it } from "vitest";
import { normUniqueId } from "./laws";

describe("normUniqueId", () => {
  it("derives an id from a national norm path", () => {
    expect(normUniqueId("pe/DECRETO_LEGISLATIVO-295.md")).toBe("pe-decreto-legislativo-295");
  });

  it("derives an id from a regional norm path (jurisdiction prefix included)", () => {
    expect(normUniqueId("pe-are/001-2026.md")).toBe("pe-are-001-2026");
  });

  it("is idempotent (applying it to its own output is stable)", () => {
    const once = normUniqueId("pe/DECRETO_LEGISLATIVO-295.md");
    expect(normUniqueId(`${once}.md`)).toBe(once);
    expect(normUniqueId(once)).toBe(once);
  });

  it("always produces output matching the API id pattern ^[a-z0-9-]+$", () => {
    const pattern = /^[a-z0-9-]+$/;
    const samples = [
      "pe/CON-1993.md",
      "pe/DLEG-635-1991.md",
      "pe-cus/ORDENANZA_REGIONAL-001-2024.md",
      "pe-lim-met/Acuerdo de Concejo 123_2025.md",
      "pe/RESOLUCION-SUNAD-000367-93-ADUANAS-1993.md",
    ];
    for (const s of samples) {
      expect(normUniqueId(s)).toMatch(pattern);
    }
  });

  it("gives two distinct ids when the same bare identifier lives in two jurisdictions", () => {
    // This is the bug being fixed: identical `identifier` values (e.g. 001-2026)
    // recur across jurisdictions. The file path is unique, so the ids must differ.
    const are = normUniqueId("pe-are/001-2026.md");
    const cus = normUniqueId("pe-cus/001-2026.md");
    expect(are).not.toBe(cus);
    expect(are).toBe("pe-are-001-2026");
    expect(cus).toBe("pe-cus-001-2026");
  });

  it("collapses repeated and trailing separators", () => {
    expect(normUniqueId("pe/__weird--name__.md")).toBe("pe-weird-name");
  });
});
