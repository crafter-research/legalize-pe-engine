/**
 * Regional-tier fetcher (gob.pe, fetch-based).
 *
 * V1 drove agent-browser per page (heavyweight, single-type). Probes
 * (2026-06-09) prove gob.pe serves the listing as server-rendered HTML — plain
 * fetch yields each norm's detail URL, title, and a real `datetime` per card —
 * so this path is HTTP-only, multi-type, and far faster.
 *
 * Per jurisdiction it walks every norm-class type code that `discover-types`
 * found (data/coverage-matrix.json), paginates `?page=N` until empty, maps each
 * gob.pe type to its SPEC rank, and builds SPEC v0.2 frontmatter from listing
 * data (title + detail URL + real date). PDF + full body live on the detail page
 * (a follow-up fetch; not needed for the pilot).
 *
 * Usage:
 *   bun src/cli.ts regional pilot --iso pe-are --out /tmp/regional-are
 *   bun src/cli.ts regional pilot --iso pe-are --max-pages 2   # bounded smoke test
 *
 * Polite: serial, ~1 req/s. Read-only GETs.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SpecFrontmatter } from "@legalize-pe/core";

const GOBPE = "https://www.gob.pe";
const UA = "Mozilla/5.0 (legalize-pe research; +https://github.com/crafter-research/legalize-pe)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** gob.pe type slug -> SPEC rank. */
export function typeToRank(typeSlug: string): string {
  const t = typeSlug.replace(/^\d+-/, "");
  const map: Record<string, string> = {
    ordenanza: "ordenanza_regional",
    "ordenanza-regional": "ordenanza_regional",
    "ordenanza-municipal": "ordenanza_municipal",
    "decreto-regional": "decreto_regional",
    "acuerdo-regional": "acuerdo_regional",
    "acuerdo-de-consejo-regional": "acuerdo_regional",
    "acuerdo-de-concejo": "acuerdo_de_concejo",
    "decreto-de-alcaldia": "decreto_de_alcaldia",
  };
  return map[t] ?? t.replace(/-/g, "_");
}

export interface RegionalItem {
  detail_url: string;
  title: string;
  publication_date: string; // YYYY-MM-DD (real, from the card datetime)
  type_slug: string;
}

/** Parse one listing page: 1:1 ordered (detail link, title, datetime) per card. */
export function parseListingPage(html: string, slug: string, typeSlug: string): RegionalItem[] {
  // Title cards carry class card__mock; capture href + visible title text.
  const cardRe = new RegExp(
    `card__mock[^>]*href="(/institucion/${slug}/normas-legales/\\d+-[^"]+)"[^>]*>([^<]+)`,
    "g",
  );
  const dateRe = /datetime="(\d{4}-\d{2}-\d{2})/g;

  const cards = [...html.matchAll(cardRe)];
  const dates = [...html.matchAll(dateRe)].map((m) => m[1]);

  const items: RegionalItem[] = [];
  for (let i = 0; i < cards.length; i++) {
    const href = cards[i]?.[1];
    const title = cards[i]?.[2]?.replace(/&nbsp;/g, " ").trim();
    const date = dates[i]; // positional 1:1 (verified 25/25 on gob.pe cards)
    if (!href || !title) continue;
    items.push({
      detail_url: `${GOBPE}${href}`,
      title,
      publication_date: date ?? "",
      type_slug: typeSlug,
    });
  }
  return items;
}

async function fetchPage(slug: string, typeSlug: string, sheet: number): Promise<string> {
  // gob.pe paginates via `&sheet=N` (with page=1 constant). `?page=N` alone is IGNORED.
  const url = `${GOBPE}/institucion/${slug}/normas-legales/tipos/${typeSlug}?page=1&sheet=${sheet}`;
  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(25000) });
  return res.ok ? res.text() : "";
}

/** Read the max `sheet=N` from the pagination links on a listing page (total page count). */
export function maxSheet(html: string): number {
  // hrefs are HTML-encoded (`?page=1&amp;sheet=121`), so match `sheet=N` regardless of the
  // preceding char (a bare `[?&]sheet=` misses `&amp;sheet=`, where the prefix is `;`).
  const sheets = [...html.matchAll(/sheet=(\d+)/g)].map((m) => Number(m[1]));
  return sheets.length ? Math.max(...sheets) : 1;
}

/**
 * Walk all sheets of one type until a sheet yields zero NEW cards (true end),
 * capped at maxPages. Note: the pagination widget *windows* its sheet links
 * (page 1 shows ~1-10, hiding the real last page), so maxSheet() is only a hint —
 * the loop must terminate on an empty/all-duplicate sheet, not on maxSheet.
 */
export async function fetchType(slug: string, typeSlug: string, maxPages: number): Promise<RegionalItem[]> {
  const out: RegionalItem[] = [];
  const seen = new Set<string>();
  for (let sheet = 1; sheet <= maxPages; sheet++) {
    const html = await fetchPage(slug, typeSlug, sheet);
    const items = parseListingPage(html, slug, typeSlug).filter((it) => {
      if (seen.has(it.detail_url)) return false;
      seen.add(it.detail_url);
      return true;
    });
    if (items.length === 0) break; // no new cards = past the last sheet
    out.push(...items);
    await sleep(1000);
  }
  return out;
}

function deriveIdentifier(detailUrl: string, rank: string): string {
  const m = detailUrl.match(/\/normas-legales\/\d+-([A-Za-z0-9-]+)/);
  const tail = (m?.[1] ?? detailUrl.split("/").pop() ?? "").toUpperCase();
  return tail;
}

export function buildRegionalFrontmatter(item: RegionalItem, iso: string, slug: string): SpecFrontmatter {
  const rank = typeToRank(item.type_slug);
  const isMunicipal = rank.includes("municipal") || rank === "acuerdo_de_concejo" || rank === "decreto_de_alcaldia";
  return {
    title: item.title,
    identifier: deriveIdentifier(item.detail_url, rank),
    country: "pe",
    rank,
    publication_date: item.publication_date,
    last_updated: item.publication_date,
    status: "in_force",
    source: item.detail_url,
    jurisdiction: iso,
    scope: isMunicipal ? "Provincial" : "Regional",
    gob_pe_slug: slug,
  };
}

interface MatrixJurisdiction {
  slug: string;
  iso: string;
  name: string;
  norm_type_probes: { type: string; status: number; detail_links: number }[];
}

export async function runRegionalPilot(opts: {
  iso: string;
  matrix: string;
  out: string;
  maxPages: number;
}) {
  const matrix = JSON.parse(await readFile(opts.matrix, "utf8")) as { jurisdictions: MatrixJurisdiction[] };
  const j = matrix.jurisdictions.find((x) => x.iso === opts.iso);
  if (!j) throw new Error(`iso ${opts.iso} not in matrix`);

  const types = j.norm_type_probes.filter((p) => p.detail_links > 0).map((p) => p.type);
  if (types.length === 0) {
    console.log(`[regional] ${opts.iso}: no norm types with content; skip (catalog fallback).`);
    return;
  }
  console.log(`[regional] ${j.name} (${opts.iso}) slug=${j.slug} types=${types.join(", ")}`);

  await mkdir(opts.out, { recursive: true });
  let total = 0;
  let dateMissing = 0;
  const byType: Record<string, number> = {};
  for (const t of types) {
    const items = await fetchType(j.slug, t, opts.maxPages);
    byType[t] = items.length;
    for (const item of items) {
      const fm = buildRegionalFrontmatter(item, opts.iso, j.slug);
      if (!fm.publication_date) dateMissing++;
      const body = `# ${fm.title}\n\n*Fuente:* ${item.detail_url}\n`;
      await writeFile(join(opts.out, `${fm.identifier}.json`), JSON.stringify({ frontmatter: fm, body }, null, 2));
      total++;
    }
    console.log(`  ${t}: ${items.length} norms`);
  }
  console.log(`[regional] ${opts.iso} done. total=${total} date_missing=${dateMissing} -> ${opts.out}`);
  console.log(`[regional] by type: ${JSON.stringify(byType)}`);
}
