import { readFileSync } from "node:fs";
import { join } from "node:path";
import { collectAllNormFiles, parseFrontmatter } from "./leyes";

export interface SearchableLey {
  identifier: string;
  title: string;
  rank: string;
  status: string;
  publication_date: string;
  jurisdiction: string;
  body: string;
}

export interface CompactLey {
  id: string;
  t: string; // title
  r: string; // rank
  s?: string; // status (omit if 'in_force')
  f: string; // publication_date
  j: string; // jurisdiction (e.g. "pe", "pe-cus")
  b: string; // body preview (cleaned)
}

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

export function buildSearchIndex(): SearchableLey[] {
  const files = collectAllNormFiles();
  const leyes: SearchableLey[] = [];

  for (const { absDir, relativePath } of files) {
    const content = readFileSync(join(absDir, relativePath), "utf-8");
    const { meta, body } = parseFrontmatter(content);

    if (!meta.title || !meta.identifier) continue;

    const bodyPreview = body
      .replace(/^#+\s+/gm, "")
      .replace(/\*+/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .slice(0, 500);

    leyes.push({
      identifier: meta.identifier,
      title: meta.title,
      rank: meta.rank || "",
      status: meta.status || "in_force",
      publication_date: meta.publication_date || "",
      jurisdiction: meta.jurisdiction || "pe",
      body: bodyPreview,
    });
  }

  return leyes.sort((a, b) =>
    (b.publication_date ?? "").localeCompare(a.publication_date ?? ""),
  );
}

export function buildCompactSearchIndex(): CompactLey[] {
  const files = collectAllNormFiles();
  const leyes: CompactLey[] = [];

  for (const { absDir, relativePath } of files) {
    const content = readFileSync(join(absDir, relativePath), "utf-8");
    const { meta, body } = parseFrontmatter(content);

    if (!meta.title || !meta.identifier) continue;

    const cleanedBody = cleanBodyForSearch(body).slice(0, 150);

    const ley: CompactLey = {
      id: meta.identifier,
      t: meta.title,
      r: meta.rank || "",
      f: meta.publication_date || "",
      j: meta.jurisdiction || "pe",
      b: cleanedBody,
    };

    const status = meta.status || "in_force";
    if (status !== "in_force") {
      ley.s = status;
    }

    leyes.push(ley);
  }

  return leyes.sort((a, b) => (b.f ?? "").localeCompare(a.f ?? ""));
}
