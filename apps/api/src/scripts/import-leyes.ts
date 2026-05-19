#!/usr/bin/env tsx
/**
 * Import laws from markdown files into the database
 */

import { readFile, readdir, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseFrontmatter } from '@legalize-pe/parser'
import type { LawMetadata } from '@legalize-pe/parser'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LEYES_DIR = join(__dirname, '../../../../leyes/pe')

async function importLaw(filePath: string): Promise<boolean> {
  const content = await readFile(filePath, 'utf-8')
  const { frontmatter, body } = parseFrontmatter(content) as {
    frontmatter: LawMetadata
    body: string
  }

  // Check if law already exists
  const existing = await db
    .select()
    .from(schema.normas)
    .where(eq(schema.normas.identificador, frontmatter.identificador))
    .limit(1)

  // Strip markdown for plain text search
  const plainText = body
    .replace(/^#+\s+/gm, '') // Remove headings
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic
    .replace(/>\s*/g, '') // Remove blockquotes
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
    .replace(/\n{2,}/g, '\n') // Collapse newlines

  // Handle materias as JSON
  const materias = Array.isArray(frontmatter.materias)
    ? JSON.stringify(frontmatter.materias)
    : frontmatter.materias || null

  const normaData = {
    identificador: frontmatter.identificador,
    titulo: frontmatter.titulo,
    pais: frontmatter.pais || 'pe',
    jurisdiccion: frontmatter.jurisdiccion,
    rango: frontmatter.rango,
    sector: frontmatter.sector || null,
    fechaPublicacion: frontmatter.fechaPublicacion,
    fechaPromulgacion: frontmatter.fechaPromulgacion || null,
    fechaVigencia: frontmatter.fechaVigencia || null,
    ultimaActualizacion: frontmatter.ultimaActualizacion || null,
    estado: frontmatter.estado || 'vigente',
    fuente: frontmatter.fuente || null,
    fuenteAlternativa: frontmatter.fuenteAlternativa || null,
    diarioOficial: frontmatter.diarioOficial || 'El Peruano',
    sumilla: frontmatter.sumilla || null,
    materias,
    spijId: frontmatter.spijId || null,
    contenido: body,
    contenidoTexto: plainText,
  }

  if (existing.length > 0) {
    // Update existing
    await db
      .update(schema.normas)
      .set(normaData)
      .where(eq(schema.normas.identificador, frontmatter.identificador))
    console.log(`  ✓ Updated: ${frontmatter.identificador}`)
  } else {
    // Insert new
    await db.insert(schema.normas).values(normaData)
    console.log(`  ✓ Inserted: ${frontmatter.identificador}`)
  }

  return true
}

async function getMdFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir)
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stats = await stat(fullPath)

    if (stats.isDirectory()) {
      const subFiles = await getMdFiles(fullPath)
      files.push(...subFiles)
    } else if (entry.endsWith('.md')) {
      files.push(fullPath)
    }
  }

  return files
}

async function main() {
  console.log('📚 Importing laws from markdown files...\n')

  const mdFiles = await getMdFiles(LEYES_DIR)

  console.log(`Found ${mdFiles.length} law files\n`)

  let success = 0
  let failed = 0

  for (const filePath of mdFiles) {
    const fileName = filePath.replace(`${LEYES_DIR}/`, '')
    try {
      await importLaw(filePath)
      success++
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(`  ✗ Failed: ${fileName} - ${msg}`)
      failed++
    }
  }

  console.log('\n─────────────────────────')
  console.log(`✅ Imported: ${success}`)
  console.log(`❌ Failed: ${failed}`)
  console.log('─────────────────────────')
}

main().catch(console.error)
