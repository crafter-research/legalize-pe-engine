#!/usr/bin/env tsx

import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseNorm } from "@legalize-pe/parser";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS_REPO = process.env.LEGALIZE_PE_CORPUS ?? join(__dirname, "../../../../../legalize-pe");
const LEYES_DIR = join(CORPUS_REPO, "pe");

function stripMarkdown(body: string): string {
  return body
    .replace(/^#+\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/>\s*/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n{2,}/g, "\n");
}

async function importLaw(filePath: string): Promise<boolean> {
  const content = await readFile(filePath, "utf-8");
  const { frontmatter, body } = parseNorm(content);
  const plainText = stripMarkdown(body);

  const existing = await db
    .select()
    .from(schema.normas)
    .where(eq(schema.normas.identificador, frontmatter.identifier))
    .limit(1);

  const normaData = {
    identificador: frontmatter.identifier,
    titulo: frontmatter.title,
    pais: frontmatter.country,
    jurisdiccion: frontmatter.jurisdiction ?? "pe",
    rango: frontmatter.rank,
    sector: null,
    fechaPublicacion: frontmatter.publication_date,
    fechaPromulgacion: null,
    fechaVigencia: null,
    ultimaActualizacion: frontmatter.last_updated || null,
    estado: frontmatter.status,
    fuente: frontmatter.source || null,
    fuenteAlternativa: null,
    diarioOficial: frontmatter.official_journal || "El Peruano",
    sumilla: null,
    materias: null,
    spijId: frontmatter.el_peruano_id ? String(frontmatter.el_peruano_id) : null,
    contenido: body,
    contenidoTexto: plainText,
  };

  if (existing.length > 0) {
    await db
      .update(schema.normas)
      .set(normaData)
      .where(eq(schema.normas.identificador, frontmatter.identifier));
    console.log(`  ✓ Updated: ${frontmatter.identifier}`);
  } else {
    await db.insert(schema.normas).values(normaData);
    console.log(`  ✓ Inserted: ${frontmatter.identifier}`);
  }

  return true;
}

async function getMdFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = await stat(fullPath);

    if (stats.isDirectory()) {
      const subFiles = await getMdFiles(fullPath);
      files.push(...subFiles);
    } else if (entry.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  console.log("📚 Importing laws from markdown files...\n");

  const mdFiles = await getMdFiles(LEYES_DIR);

  console.log(`Found ${mdFiles.length} law files\n`);

  let success = 0;
  let failed = 0;

  for (const filePath of mdFiles) {
    const fileName = filePath.replace(`${LEYES_DIR}/`, "");
    try {
      await importLaw(filePath);
      success++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`  ✗ Failed: ${fileName} - ${msg}`);
      failed++;
    }
  }

  console.log("\n─────────────────────────");
  console.log(`✅ Imported: ${success}`);
  console.log(`❌ Failed: ${failed}`);
  console.log("─────────────────────────");
}

main().catch(console.error);
