import { readFileSync, readdirSync, statSync } from "node:fs";
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
 * Build a map of `identifier → absolute path to the .md file` across ALL jurisdictions
 * (national pe/ + each pe-{iso}/ regional dir).
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
    const content = readFileSync(absPath, "utf-8");
    const { data } = matter(content);
    const fm = data as LeyFrontmatter;
    if (fm.identifier) {
      map.set(fm.identifier, absPath);
    }
    const idFromFilename = relativePath.replace(/\.md$/, "").replace(/\//g, "-");
    if (!map.has(idFromFilename)) {
      map.set(idFromFilename, absPath);
    }
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
};

/** ISO 3166-2:PE jurisdiction display names. */
export const jurisdictionLabels: Record<string, string> = {
  pe: "Nacional",
  "pe-cus": "Cusco",
  "pe-lim": "Lima Metropolitana",
  "pe-cal": "Callao",
  "pe-ama": "Amazonas",
  "pe-anc": "Áncash",
  "pe-apu": "Apurímac",
  "pe-are": "Arequipa",
  "pe-aya": "Ayacucho",
  "pe-caj": "Cajamarca",
  "pe-hva": "Huancavelica",
  "pe-hco": "Huánuco",
  "pe-ica": "Ica",
  "pe-jun": "Junín",
  "pe-lal": "La Libertad",
  "pe-lam": "Lambayeque",
  "pe-lir": "Lima (Región)",
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
