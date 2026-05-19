/**
 * Migration script: convert legacy ES frontmatter to SPEC v0.2 EN.
 *
 * Reads from $CORPUS/leyes/pe/*.md and $CORPUS/leyes/pe/reformas-constitucionales/*.md
 * Writes to $CORPUS/pe/*.md (flat at root, SPEC v0.2 frontmatter + new identifier).
 *
 * Does NOT commit. Caller runs migration → then bootstraps git history with
 * Crafternauta identity in a second pass.
 *
 * Run via:
 *   bun cli migrate --corpus ../legalize-pe
 *   bun cli migrate --corpus ../legalize-pe --dry-run
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import {
  RANK_NORMALIZATIONS,
  SPECIAL_IDENTIFIERS,
  STATUS_MAP,
  type SpecFrontmatter,
  type SpecStatus,
  buildNewIdentifier,
} from "@legalize-pe/core";
import matter from "gray-matter";

interface OldFrontmatter {
  titulo?: string;
  identificador?: string;
  pais?: string;
  jurisdiccion?: string;
  rango?: string;
  fechaPublicacion?: string;
  ultimaActualizacion?: string;
  estado?: string;
  fuente?: string;
  diarioOficial?: string;
  articulosModificados?: string[];
  [key: string]: unknown;
}

export interface MigrateOptions {
  corpusRoot: string;
  dryRun?: boolean;
}

export async function migrateNational(opts: MigrateOptions): Promise<void> {
  const sourceDir = join(opts.corpusRoot, "leyes/pe");
  const sourceReformsDir = join(sourceDir, "reformas-constitucionales");
  const targetDir = join(opts.corpusRoot, "pe");
  const targetReformsDir = join(targetDir, "reformas-constitucionales");
  const mappingPath = join(opts.corpusRoot, "migration-mapping.json");
  const unparseablePath = join(opts.corpusRoot, "migration-unparseable.json");

  if (!existsSync(sourceDir)) {
    throw new Error(`Source dir not found: ${sourceDir}`);
  }

  if (!opts.dryRun) {
    await mkdir(targetDir, { recursive: true });
    await mkdir(targetReformsDir, { recursive: true });
  }

  const mapping: Record<string, string> = {};
  const unparseable: Array<{ file: string; reason: string }> = [];
  let migrated = 0;
  let skipped = 0;

  // Main pe/ files
  const topFiles = (await readdir(sourceDir)).filter((f) => f.endsWith(".md"));
  for (const f of topFiles) {
    const result = await migrateOne(join(sourceDir, f), targetDir, opts.dryRun);
    if (result.kind === "ok") {
      mapping[f] = result.relativeNewPath;
      migrated++;
    } else {
      unparseable.push({ file: f, reason: result.reason });
      skipped++;
    }
  }

  // reformas-constitucionales/ subfolder
  if (existsSync(sourceReformsDir)) {
    const reformaFiles = (await readdir(sourceReformsDir)).filter((f) => f.endsWith(".md"));
    for (const f of reformaFiles) {
      const result = await migrateOne(
        join(sourceReformsDir, f),
        targetReformsDir,
        opts.dryRun,
        "reformas-constitucionales",
      );
      if (result.kind === "ok") {
        mapping[`reformas-constitucionales/${f}`] = result.relativeNewPath;
        migrated++;
      } else {
        unparseable.push({ file: `reformas-constitucionales/${f}`, reason: result.reason });
        skipped++;
      }
    }
  }

  if (!opts.dryRun) {
    await writeFile(mappingPath, JSON.stringify(mapping, null, 2), "utf-8");
    if (unparseable.length > 0) {
      await writeFile(unparseablePath, JSON.stringify(unparseable, null, 2), "utf-8");
    }
  }

  console.log(`\n=== Migration ${opts.dryRun ? "DRY RUN" : "COMPLETE"} ===`);
  console.log(`Migrated: ${migrated}`);
  console.log(`Skipped:  ${skipped}`);
  if (!opts.dryRun) {
    console.log(`Mapping:  ${mappingPath}`);
    if (unparseable.length > 0) {
      console.log(`Issues:   ${unparseablePath}`);
    }
  }
}

type MigrateResult = { kind: "ok"; relativeNewPath: string } | { kind: "skip"; reason: string };

async function migrateOne(
  sourcePath: string,
  targetBaseDir: string,
  dryRun: boolean | undefined,
  subdirRelative?: string,
): Promise<MigrateResult> {
  const raw = await readFile(sourcePath, "utf-8");
  let parsed: ReturnType<typeof matter>;
  try {
    parsed = matter(raw);
  } catch (e) {
    return { kind: "skip", reason: `matter parse error: ${(e as Error).message}` };
  }
  const oldFm = parsed.data as OldFrontmatter;

  const oldId = oldFm.identificador?.trim();
  if (!oldId) {
    return { kind: "skip", reason: "missing identificador" };
  }

  const oldRank = oldFm.rango?.trim() ?? "";
  const publicationDate = normalizeDate(oldFm.fechaPublicacion);
  if (!publicationDate) {
    return { kind: "skip", reason: `missing/invalid fechaPublicacion: ${oldFm.fechaPublicacion}` };
  }

  const newId = buildNewIdentifier({ oldId, rank: oldRank, publicationDate });

  const newRank = RANK_NORMALIZATIONS[oldRank] ?? oldRank.replace(/-/g, "_");
  const newStatus = (STATUS_MAP[oldFm.estado ?? "vigente"] ?? "in_force") as SpecStatus;

  const lastUpdated = normalizeDate(oldFm.ultimaActualizacion) ?? publicationDate;

  const newFm: SpecFrontmatter = {
    title: oldFm.titulo ?? "",
    identifier: newId,
    country: "pe",
    rank: newRank,
    publication_date: publicationDate,
    last_updated: lastUpdated,
    status: newStatus,
    source: oldFm.fuente ?? `https://spij.minjus.gob.pe/normas/${newId.toLowerCase()}`,
  };

  if (oldFm.jurisdiccion && oldFm.jurisdiccion !== "pe") {
    newFm.jurisdiction = oldFm.jurisdiccion;
  }
  if (oldFm.diarioOficial) {
    newFm.official_journal = oldFm.diarioOficial;
  }
  if (oldFm.articulosModificados && Array.isArray(oldFm.articulosModificados)) {
    newFm.affected_articles = oldFm.articulosModificados.map((s) => String(s));
  }

  const filename = `${newId}.md`;
  const targetPath = join(targetBaseDir, filename);
  const newContent = matter.stringify(parsed.content, newFm as unknown as Record<string, unknown>);

  if (!dryRun) {
    await writeFile(targetPath, newContent, "utf-8");
  }

  const rel = subdirRelative ? `pe/${subdirRelative}/${filename}` : `pe/${filename}`;
  return { kind: "ok", relativeNewPath: rel };
}

function normalizeDate(input: unknown): string | null {
  if (!input || typeof input !== "string") return null;
  // Accept ISO YYYY-MM-DD, or Date-like
  const trimmed = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}
