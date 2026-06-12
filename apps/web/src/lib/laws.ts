import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import matter from "gray-matter";
import { shouldSkipFile } from "./constants";

/**
 * SPEC v0.2 frontmatter (English) — produced by the engine migration script.
 * Source of truth: `~/Programming/crafter-research/legalize-pe-engine/packages/core/src/types.ts`.
 */
export interface LeyFrontmatter {
  title: string;
  identifier: string;
  country: "pe";
  rank: string;
  publication_date: string;
  last_updated: string;
  status: "in_force" | "repealed" | "partially_repealed" | "annulled" | "expired";
  source: string;
  jurisdiction?: string;
  scope?: "Nacional" | "Regional" | "Provincial" | "Distrital";
  issuing_entity?: string;
  official_journal?: string;
  gazette_reference?: string;
  affected_articles?: string[];
  applied_reforms?: string[];
  date_precision?: "day" | "month" | "year";
  notes?: string;
  gob_pe_slug?: string;
  pdf_url?: string;
  el_peruano_id?: number;
}

export function parseFrontmatter(content: string): {
  meta: LeyFrontmatter;
  body: string;
} {
  const { data, content: body } = matter(content);
  return { meta: data as LeyFrontmatter, body };
}

export function getAllMdFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (shouldSkipFile(entry)) continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...getAllMdFiles(fullPath, baseDir));
    } else if (entry.endsWith(".md")) {
      files.push(relative(baseDir, fullPath));
    }
  }
  return files;
}

/**
 * Globally-unique id for a norm, derived from its path relative to the corpus root
 * (jurisdiction dir + file). Paths are unique, so ids never collide — unlike the
 * human `identifier`, which recurs across jurisdictions (e.g. 001-2026).
 *
 *   pe-are/001-2026.md            → pe-are-001-2026
 *   pe/DECRETO_LEGISLATIVO-295.md → pe-decreto-legislativo-295
 *
 * The full relative path is `<jurisdictionDir>/<relativePath>` so the jurisdiction
 * prefix is part of the id. Output always matches `^[a-z0-9-]+$`.
 */
export function normUniqueId(relativePath: string): string {
  return relativePath
    .replace(/\.md$/, "")
    .replace(/\//g, "-")
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Build a map of `unique id → absolute path to the .md file` across ALL jurisdictions
 * (national pe/ + each pe-{iso}/ regional dir). Keyed ONLY by `normUniqueId`, which is
 * unique per file — so colliding human identifiers no longer drop pages.
 *
 * For Astro routes, use it like:
 *   const map = buildIdToFileMap()
 *   const absPath = map.get(id)
 *   const content = readFileSync(absPath)
 */
export function buildIdToFileMap(_dirOrUnused?: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const { absDir, relativePath } of collectAllNormFiles()) {
    const absPath = join(absDir, relativePath);
    const jurisdiction = absDir.split("/").pop() ?? "";
    const id = normUniqueId(`${jurisdiction}/${relativePath}`);
    map.set(id, absPath);
  }
  return map;
}

/**
 * Build a map of `unique id → corpus-relative path` across ALL jurisdictions.
 *
 * The value is the path relative to the corpus repo root, with original case
 * preserved (GitHub raw URLs are case-sensitive):
 *
 *   pe-are-148-2026-gra-cr-arequipa → pe-are/148-2026-GRA-CR-AREQUIPA.md
 *   pe-con-1993                     → pe/CON-1993.md
 *
 * Consumed at build time to emit `public/id-path-map.json`, which the on-demand
 * detail page imports to resolve a route id to its raw GitHub path WITHOUT
 * scanning the corpus at request time. Keyed by `normUniqueId` (same scheme as
 * `buildIdToFileMap`), so ids match existing links.
 */
export function buildIdToRelativePathMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const { absDir, relativePath } of collectAllNormFiles()) {
    const jurisdiction = absDir.split("/").pop() ?? "";
    const id = normUniqueId(`${jurisdiction}/${relativePath}`);
    map[id] = `${jurisdiction}/${relativePath}`;
  }
  return map;
}

/**
 * Path to the corpus repo root.
 *
 * Layout assumption:
 *   ~/Programming/crafter-research/legalize-pe-engine/apps/web   ← process.cwd() during build
 *   ~/Programming/crafter-research/legalize-pe                   ← corpus repo root
 *
 * Override with LEGALIZE_PE_CORPUS env var.
 */
export const CORPUS_REPO = process.env.LEGALIZE_PE_CORPUS
  ? process.env.LEGALIZE_PE_CORPUS
  : process.env.VERCEL
    ? join(process.cwd(), ".cache/legalize-pe")
    : join(process.cwd(), "../../../legalize-pe");

/** Path to national pe/ directory (for back-compat — most builds read all jurisdictions via collectAllNormFiles). */
export const LAWS_DIR = join(CORPUS_REPO, "pe");

/**
 * Returns absolute paths to all jurisdiction directories that contain norms:
 *   pe/   (national)
 *   pe-ama/, pe-anc/, ..., pe-uca/, pe-lim/, pe-cal/
 */
export function getAllJurisdictionDirs(): string[] {
  const dirs: string[] = [];
  for (const entry of readdirSync(CORPUS_REPO)) {
    if (entry === "pe" || entry.startsWith("pe-")) {
      const full = join(CORPUS_REPO, entry);
      try {
        if (statSync(full).isDirectory()) dirs.push(full);
      } catch {
        // ignore
      }
    }
  }
  return dirs;
}

/**
 * Returns all norm files across all jurisdictions as `{absDir, relativePath}` tuples.
 * absDir is the jurisdiction root, relativePath is the file relative to it.
 */
export function collectAllNormFiles(): Array<{ absDir: string; relativePath: string }> {
  const out: Array<{ absDir: string; relativePath: string }> = [];
  for (const dir of getAllJurisdictionDirs()) {
    for (const rel of getAllMdFiles(dir)) {
      out.push({ absDir: dir, relativePath: rel });
    }
  }
  return out;
}

/** Display labels per SPEC v0.2 rank. */
export const rankLabels: Record<string, string> = {
  constitucion: "Constitución",
  ley: "Ley",
  decreto_legislativo: "Decreto Legislativo",
  decreto_supremo: "Decreto Supremo",
  decreto_de_urgencia: "Decreto de Urgencia",
  decreto_urgencia: "Decreto de Urgencia",
  decreto_ley: "Decreto Ley",
  resolucion_legislativa: "Resolución Legislativa",
  resolucion_ministerial: "Resolución Ministerial",
  resolucion_suprema: "Resolución Suprema",
  ley_de_reforma_constitucional: "Ley de Reforma Constitucional",
  ordenanza_regional: "Ordenanza Regional",
  ordenanza_municipal: "Ordenanza Municipal",
  // Regional-tier ranks (gob.pe fanout, 2026-06)
  decreto_regional: "Decreto Regional",
  acuerdo_regional: "Acuerdo Regional",
  acuerdo_de_concejo: "Acuerdo de Concejo",
  decreto_de_alcaldia: "Decreto de Alcaldía",
};

/**
 * ISO 3166-2:PE jurisdiction display names — keyed by the actual corpus directory
 * names. The corpus distinguishes pe-lim (Gobierno Regional de Lima, Huacho)
 * from pe-lim-met (Municipalidad Metropolitana de Lima).
 */
export const jurisdictionLabels: Record<string, string> = {
  pe: "Nacional",
  "pe-ama": "Amazonas",
  "pe-anc": "Áncash",
  "pe-apu": "Apurímac",
  "pe-are": "Arequipa",
  "pe-aya": "Ayacucho",
  "pe-caj": "Cajamarca",
  "pe-cal": "Callao",
  "pe-cus": "Cusco",
  "pe-huc": "Huánuco",
  "pe-huv": "Huancavelica",
  "pe-ica": "Ica",
  "pe-jun": "Junín",
  "pe-lal": "La Libertad",
  "pe-lam": "Lambayeque",
  "pe-lim": "Lima (Región)",
  "pe-lim-met": "Lima Metropolitana",
  "pe-lor": "Loreto",
  "pe-mdd": "Madre de Dios",
  "pe-moq": "Moquegua",
  "pe-pas": "Pasco",
  "pe-piu": "Piura",
  "pe-pun": "Puno",
  "pe-sam": "San Martín",
  "pe-tac": "Tacna",
  "pe-tum": "Tumbes",
  "pe-uca": "Ucayali",
};

/** Regional jurisdictions (25 GORE + Lima Met) in canonical order, derived from jurisdictionLabels. */
export const REGIONAL_JURISDICTIONS: Array<{ iso: string; name: string }> = Object.entries(
  jurisdictionLabels,
)
  .filter(([iso]) => iso !== "pe")
  .map(([iso, name]) => ({ iso, name }));
