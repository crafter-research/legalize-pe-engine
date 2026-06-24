import { describe, expect, it } from "vitest";
import { buildNewIdentifier } from "./identifiers";

describe("buildNewIdentifier", () => {
  it("maps the constitution special case", () => {
    expect(buildNewIdentifier({ oldId: "constitucion-1993", rank: "constitucion" })).toBe(
      "CON-1993",
    );
  });

  it("rewrites the rank prefix using RANK_TO_PREFIX", () => {
    expect(
      buildNewIdentifier({
        oldId: "dleg-295",
        rank: "decreto-legislativo",
        publicationDate: "1984-03-25",
      }),
    ).toBe("DLEG-295-1984");
  });

  it("keeps an existing trailing year and does not double-append", () => {
    expect(
      buildNewIdentifier({
        oldId: "ds-033-2001-mtc",
        rank: "decreto-supremo",
        publicationDate: "2001-07-01",
      }),
    ).toBe("DS-033-2001-MTC");
  });

  it("appends UNKNOWN when no publicationDate is supplied", () => {
    expect(buildNewIdentifier({ oldId: "ley-27972", rank: "ley" })).toBe("LEY-27972-UNKNOWN");
  });

  it("uppercases ids that have no prefix-rest shape", () => {
    expect(buildNewIdentifier({ oldId: "foobar", rank: "ley" })).toBe("FOOBAR");
  });

  // --- adversarial / suspicious behaviors ---

  it("uses the old prefix verbatim when the rank is unknown", () => {
    // No mapping for rank "xyz" -> falls back to oldPrefix.toUpperCase()
    expect(
      buildNewIdentifier({ oldId: "abc-123", rank: "xyz", publicationDate: "2020-01-01" }),
    ).toBe("ABC-123-2020");
  });

  it("BUG CANDIDATE: trailing-year regex ignores the actual publicationDate", () => {
    // rest already ends in -2001, so the year from publicationDate (2099) is ignored.
    // The function trusts the id over the metadata; if they disagree, metadata loses silently.
    const out = buildNewIdentifier({
      oldId: "ds-033-2001-mtc",
      rank: "decreto-supremo",
      publicationDate: "2099-01-01",
    });
    expect(out).toBe("DS-033-2001-MTC"); // NOT DS-033-2099-MTC
  });

  it("BUG CANDIDATE: a 4-digit number that is NOT a year is treated as a year", () => {
    // "ley-1234" -> rest "1234" matches /-\d{4}.../? No leading dash. Let's see real output.
    // Documents whatever it does so a regression is visible.
    const out = buildNewIdentifier({
      oldId: "ley-1234",
      rank: "ley",
      publicationDate: "2020-05-05",
    });
    // rest = "1234"; restUpper test /-\d{4}(-[A-Z]+)?$/ requires a leading dash, so 1234 has none -> appends year
    expect(out).toBe("LEY-1234-2020");
  });

  it("BUG CANDIDATE: ledger-style id with embedded 4-digit-year-like segment", () => {
    // "rm-120-2024" -> rest "120-2024" -> matches trailing-year -> keeps, ignores rank RM mapping? rank resolution
    const out = buildNewIdentifier({
      oldId: "rm-120-2024",
      rank: "resolucion-ministerial",
      publicationDate: "2024-01-01",
    });
    expect(out).toBe("RM-120-2024");
  });

  it("does not strip a malformed empty rest (single dash)", () => {
    // "ley-" -> match group rest = "" -> match requires (.+) so no match -> uppercases whole
    expect(buildNewIdentifier({ oldId: "ley-", rank: "ley" })).toBe("LEY-");
  });
});
