#!/usr/bin/env bun
/**
 * Pre-generate the id → corpus-relative-path map at build time.
 *
 * The on-demand law detail page (`src/pages/laws/[id].astro`, prerender=false)
 * imports this JSON to resolve a route id to its raw GitHub path without
 * scanning the corpus at request time.
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildIdToRelativePathMap } from "../src/lib/laws";

const PUBLIC_DIR = join(process.cwd(), "public");
const OUTPUT_FILE = join(PUBLIC_DIR, "id-path-map.json");

console.log("🗺️  Generating id → path map...");

const map = buildIdToRelativePathMap();
const count = Object.keys(map).length;

writeFileSync(OUTPUT_FILE, JSON.stringify(map), "utf-8");

console.log(`✅ Generated map with ${count} entries`);
console.log(`✅ Written to ${OUTPUT_FILE}`);
console.log(`📊 File size: ${(JSON.stringify(map).length / 1024).toFixed(2)} KB`);
