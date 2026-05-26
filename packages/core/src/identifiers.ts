/**
 * Identifier normalization helpers.
 *
 * Old (ES) format examples: `dleg-295`, `ley-27972`, `constitucion-1993`, `ds-033-2001-mtc`
 * New (SPEC v0.2) format: `DLEG-295-1984`, `LEY-27972-2003`, `CON-1993`, `DS-033-2001-MTC`
 */

export const SPECIAL_IDENTIFIERS: Record<string, string> = {
  "constitucion-1993": "CON-1993",
};

const RANK_TO_PREFIX: Record<string, string> = {
  ley: "LEY",
  "decreto-legislativo": "DLEG",
  "decreto-supremo": "DS",
  "decreto-de-urgencia": "DU",
  "decreto-ley": "DL",
  "resolucion-legislativa": "RL",
  "resolucion-ministerial": "RM",
  "ley-de-reforma-constitucional": "LEY-REFORMA",
  "ordenanza-municipal": "OM",
  "ordenanza-regional": "OR",
  constitucion: "CON",
};

export const STATUS_MAP: Record<string, string> = {
  vigente: "in_force",
  derogada: "repealed",
  modificada: "in_force", // modificada is still in force, just with history
  abrogada: "repealed",
  anulada: "annulled",
  expirada: "expired",
};

export const RANK_NORMALIZATIONS: Record<string, string> = {
  ley: "ley",
  "decreto-legislativo": "decreto_legislativo",
  "decreto-supremo": "decreto_supremo",
  "decreto-de-urgencia": "decreto_de_urgencia",
  "decreto-ley": "decreto_ley",
  "resolucion-legislativa": "resolucion_legislativa",
  "resolucion-ministerial": "resolucion_ministerial",
  "ley-de-reforma-constitucional": "ley_de_reforma_constitucional",
  "ordenanza-municipal": "ordenanza_municipal",
  "ordenanza-regional": "ordenanza_regional",
  constitucion: "constitucion",
};

export function buildNewIdentifier(input: {
  oldId: string;
  rank: string;
  publicationDate?: string;
}): string {
  // Special-case mapping wins
  const specialIdentifier = SPECIAL_IDENTIFIERS[input.oldId];
  if (specialIdentifier) return specialIdentifier;

  const year = input.publicationDate?.slice(0, 4) ?? "UNKNOWN";

  // Try to match `prefix-rest` where prefix is letters and rest is the rest
  const match = input.oldId.match(/^([a-zA-Z]+)-(.+)$/);
  if (!match) {
    return input.oldId.toUpperCase();
  }

  const [, oldPrefix, rest] = match;
  if (oldPrefix === undefined || rest === undefined) {
    return input.oldId.toUpperCase();
  }
  const expectedPrefix = RANK_TO_PREFIX[input.rank] ?? oldPrefix.toUpperCase();

  // If `rest` already ends with a 4-digit year and matches publicationDate, keep
  const restUpper = rest.toUpperCase();
  if (/-\d{4}(-[A-Z]+)?$/.test(restUpper)) {
    return `${expectedPrefix}-${restUpper}`;
  }

  // Otherwise append year
  return `${expectedPrefix}-${restUpper}-${year}`;
}

export function isoCodeForJurisdiction(jurisdiction?: string): string {
  if (!jurisdiction || jurisdiction === "pe") return "pe";
  return jurisdiction; // assume already in `pe-xxx` format
}
