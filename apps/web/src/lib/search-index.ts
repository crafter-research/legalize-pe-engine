import { readFileSync } from "node:fs";
import { join } from "node:path";
import { collectAllNormFiles, parseFrontmatter } from "./laws";

export interface SearchableLaw {
  identifier: string;
  title: string;
  rank: string;
  status: string;
  publication_date: string;
  jurisdiction: string;
  body: string;
}

export interface CompactLaw {
  id: string;
  t: string; // title
  r: string; // rank
  s?: string; // status (omit if 'in_force')
  e?: string;
  f: string; // publication_date
  j?: string; // jurisdiction (e.g. "pe", "pe-cus")
  b: string; // body preview (cleaned)
  m?: string[];
}

export type CompactLey = CompactLaw;

function cleanBodyForSearch(body: string): string {
  return (
    body
      // Remove OCR artifacts from El Peruano
      .replace(/Firmado por:.*?(?=\n|$)/gi, "")
      .replace(/NORMAS LEGALES/g, "")
      .replace(/El Peruano\s*\/?\s*\w+\s+\d+\s+de\s+\w+\s+de\s+\d+/gi, "")
      // Remove markdown formatting
      .replace(/^#+\s+/gm, "")
      .replace(/\*+/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Remove common legal boilerplate
      .replace(/Ver jurisprudencia aqu[ií]\.?/gi, "")
      .replace(/CONCORDANCIAS:.*?(?=\n\n|\n[A-Z])/gs, "")
      // Fix encoding issues
      .replace(/�/g, "")
      // Normalize whitespace
      .replace(/\s+/g, " ")
      .trim()
  );
}

export function buildSearchIndex(): SearchableLaw[] {
  const files = collectAllNormFiles();
  const laws: SearchableLaw[] = [];

  for (const { absDir, relativePath } of files) {
    const content = readFileSync(join(absDir, relativePath), "utf-8");
    const { meta, body } = parseFrontmatter(content);

    if (!meta.title || !meta.identifier) continue;

    const bodyPreview = body
      .replace(/^#+\s+/gm, "")
      .replace(/\*+/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .slice(0, 500);

    laws.push({
      identifier: meta.identifier,
      title: meta.title,
      rank: meta.rank || "",
      status: meta.status || "in_force",
      publication_date: meta.publication_date || "",
      jurisdiction: meta.jurisdiction || "pe",
      body: bodyPreview,
    });
  }

  return laws.sort((a, b) => (b.publication_date ?? "").localeCompare(a.publication_date ?? ""));
}

export function buildCompactSearchIndex(): CompactLaw[] {
  const files = collectAllNormFiles();
  const laws: CompactLaw[] = [];

  for (const { absDir, relativePath } of files) {
    const content = readFileSync(join(absDir, relativePath), "utf-8");
    const { meta, body } = parseFrontmatter(content);

    if (!meta.title || !meta.identifier) continue;

    const jurisdiction = meta.jurisdiction || "pe";
    // Regional norms are skeletons (body = title + source line) — their body preview
    // adds no search value beyond the title, only weight. Keep the preview only for
    // national norms, which carry real full text. Cuts the index ~50% at 21K norms.
    const cleanedBody = jurisdiction === "pe" ? cleanBodyForSearch(body).slice(0, 150) : "";

    const law: CompactLaw = {
      id: meta.identifier,
      t: meta.title,
      r: meta.rank || "",
      f: meta.publication_date || "",
      b: cleanedBody,
    };
    // Omit j for national (the client defaults to "pe") to save bytes across ~11K entries.
    if (jurisdiction !== "pe") law.j = jurisdiction;

    const status = meta.status || "in_force";
    if (status !== "in_force") {
      law.s = status;
    }

    laws.push(law);
  }

  return laws.sort((a, b) => (b.f ?? "").localeCompare(a.f ?? ""));
}
