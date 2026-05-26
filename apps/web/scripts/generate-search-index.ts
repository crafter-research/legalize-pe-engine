#!/usr/bin/env tsx
/**
 * Pre-generate static search index for build time
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildCompactSearchIndex } from "../src/lib/search-index";

const PUBLIC_DIR = join(process.cwd(), "public");
const OUTPUT_FILE = join(PUBLIC_DIR, "search-index.json");

console.log("📦 Generating search index...");

const searchIndex = buildCompactSearchIndex();

console.log(`✅ Generated index with ${searchIndex.length} entries`);

writeFileSync(OUTPUT_FILE, JSON.stringify(searchIndex), "utf-8");

console.log(`✅ Written to ${OUTPUT_FILE}`);
console.log(`📊 File size: ${(JSON.stringify(searchIndex).length / 1024).toFixed(2)} KB`);
