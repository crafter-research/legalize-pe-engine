/**
 * SPIJ national crawler.
 *
 * Discovery for the national tier (~160K norms) via the free-access SPIJ API.
 * Contracts captured 2026-06-09 (recon/spij.ir.json):
 *   - POST {back}/authenticate {usuario:"spijext",clave:"password",tipo:0} -> JWT (24h)
 *   - GET  {back}/api/detallenorma/{id} -> full structured norm (real date + full text)
 *   - The "Legislacion por Materia" INDEX is itself a pseudo-norm (H682710) whose
 *     textoCompleto links to ~93 compendio norms; each compendio links to the real
 *     norms. So enumeration is a recursive detallenorma crawl, NOT api/buscar
 *     (which is paywalled for the anonymous tier).
 *
 * Two phases:
 *   crawl    -> walk the index, collect every reachable H-id into a registry JSON.
 *   fetch    -> for ids in the registry, GET detallenorma, build SPEC v0.2 Norm.
 *
 * Usage:
 *   bun src/cli.ts spij crawl --seed H682710 --max-depth 3 --out ../../data/spij-registry.json
 *   bun src/cli.ts spij fetch --registry ../../data/spij-registry.json --limit 20 --out /tmp/spij-norms
 *
 * Politeness: serial, ~1 req/s, resumable (registry is the checkpoint). Legal basis:
 * DLeg 822 Art.9 (official texts public domain); SPIJ free since Nov 2024.
 */

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { RANK_NORMALIZATIONS, USER_AGENT, type SpecFrontmatter } from "@legalize-pe/core";
import { htmlToMarkdown } from "@legalize-pe/parser";
import { GitPublisher } from "@legalize-pe/git-publisher";

const BACK = "https://spijwsii.minjus.gob.pe/spij-ext-back";

// Seeds (index pseudo-norms). Materia confirmed 2026-06-09; regional TBD (capture next).
export const SPIJ_SEEDS = {
  materia: "H682710", // "LEGISLACION POR MATERIA" index -> 93 compendios
  // regional: "H??????", // "GOBIERNOS LOCALES Y REGIONALES" index - capture seed id next session
};

const ID_RE = /[Hh]\d{6,}/g;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const RANK_TO_PREFIX: Record<string, string> = {
  constitucion: "CON",
  ley: "LEY",
  ley_de_reforma_constitucional: "LEY-REFORMA",
  decreto_legislativo: "DLEG",
  decreto_supremo: "DS",
  decreto_de_urgencia: "DU",
  decreto_ley: "DL",
  resolucion_legislativa: "RL",
  resolucion_ministerial: "RM",
};

interface DetalleNorma {
  id: string;
  codigoNorma: string | null;
  sumilla: string | null;
  titulo: string | null;
  fechaPublicacion: string | null; // YYYY-MM-DD (real)
  sector: string | null;
  dispositivoLegal: string | null; // e.g. "DECRETO LEGISLATIVO"
  ruta: string | null;
  textoCompleto: string | null;
  migrado: string | null;
}

async function authenticate(): Promise<string> {
  const res = await fetch(`${BACK}/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario: "spijext", clave: "password", tipo: 0 }),
  });
  if (!res.ok) throw new Error(`authenticate failed: HTTP ${res.status}`);
  const json = (await res.json()) as { success: boolean; value: string };
  if (!json.success || !json.value) throw new Error("authenticate: no token in response");
  return json.value;
}

async function getDetalle(id: string, token: string): Promise<DetalleNorma> {
  const res = await fetch(`${BACK}/api/detallenorma/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
  });
  if (!res.ok) throw new Error(`detallenorma ${id}: HTTP ${res.status}`);
  return (await res.json()) as DetalleNorma;
}

async function getDetalleWithRetry(id: string, state: { token: string }): Promise<DetalleNorma> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      return await getDetalle(id, state.token);
    } catch (err) {
      const message = String(err);
      if (message.includes("HTTP 401")) {
        state.token = await authenticate();
        lastError = err;
        continue;
      }
      if (message.includes("HTTP 404")) throw err;
      lastError = err;
      if (attempt < 4) await sleep(1000 * attempt);
    }
  }
  throw lastError;
}

function extractIds(html: string | null): string[] {
  if (!html) return [];
  return [...new Set((html.match(ID_RE) ?? []).map((s) => s.toUpperCase()))];
}

/** Map SPIJ dispositivoLegal label -> SPEC rank (snake_case). */
export function rankFromDispositivo(dispositivo: string | null): string {
  if (!dispositivo) return "norma";
  const slug = dispositivo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return RANK_NORMALIZATIONS[slug] ?? slug.replace(/-/g, "_");
}

/** HTML -> Markdown via the engine's shared turndown parser. */
function htmlToBody(html: string | null): string {
  if (!html) return "";
  return htmlToMarkdown(html);
}

/** Plain-text strip for titles (sumilla/titulo carry inline HTML). */
function stripTags(html: string | null): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeIdentifierPart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^\s*N[º°o.]?\s*/i, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function identifierFromDetalle(d: DetalleNorma, rank: string, publicationDate: string): string {
  const prefix = RANK_TO_PREFIX[rank] ?? rank.toUpperCase().replace(/_/g, "-");
  const raw = normalizeIdentifierPart(d.codigoNorma ?? d.id);
  const body = raw || d.id.toUpperCase();
  if (rank === "constitucion" && body.includes("1993")) return "CON-1993";
  const year = publicationDate.slice(0, 4);
  if (new RegExp(`(^|-)${year}($|-)`).test(body)) return `${prefix}-${body}`;
  return `${prefix}-${body}-${year}`;
}

function hasUsablePublicationDate(value: string): boolean {
  return ISO_DATE_RE.test(value) && !value.startsWith("2026-");
}

function hasPublicationDate(detalle: DetalleNorma): boolean {
  return ISO_DATE_RE.test(detalle.fechaPublicacion ?? "");
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

interface Registry {
  seeds: string[];
  crawled_at: string;
  index_ids: string[]; // compendios / index nodes (have children)
  norm_ids: string[]; // leaf norms (no children, or terminal)
  edges: Record<string, string[]>; // id -> child ids
  published_ids?: string[];
  skipped_existing_ids?: string[];
  date_rejected_ids?: string[];
  empty_body_ids?: string[];
  failed_ids?: Record<string, string>;
}

interface CrawlStats {
  fetched: number;
  published: number;
  skippedExisting: number;
  dateRejected: number;
  emptyBody: number;
  failed: number;
}

interface CrawlRun {
  registry: Registry;
  stats: CrawlStats;
}

function buildRegistry(input: {
  seeds: string[];
  indexIds: Set<string>;
  normIds: Set<string>;
  edges: Record<string, string[]>;
  publishedIds: Set<string>;
  skippedExistingIds: Set<string>;
  dateRejectedIds: Set<string>;
  emptyBodyIds: Set<string>;
  failedIds: Record<string, string>;
}): Registry {
  return {
    seeds: input.seeds,
    crawled_at: new Date().toISOString(),
    index_ids: [...input.indexIds].sort(),
    norm_ids: [...input.normIds].sort(),
    edges: input.edges,
    published_ids: [...input.publishedIds].sort(),
    skipped_existing_ids: [...input.skippedExistingIds].sort(),
    date_rejected_ids: [...input.dateRejectedIds].sort(),
    empty_body_ids: [...input.emptyBodyIds].sort(),
    failed_ids: input.failedIds,
  };
}

/** Phase 1: recursive crawl from seed(s), collecting all reachable ids. */
export async function crawl(opts: {
  seeds: string[];
  maxDepth: number;
  rps: number;
  onProgress?: (seen: number, queued: number) => void;
}): Promise<Registry> {
  const result = await crawlInternal(opts);
  return result.registry;
}

async function crawlInternal(opts: {
  seeds: string[];
  maxDepth: number;
  rps: number;
  corpus?: string;
  onProgress?: (seen: number, queued: number, stats: CrawlStats) => void;
  onCheckpoint?: (registry: Registry) => Promise<void>;
  checkpointEvery?: number;
}): Promise<CrawlRun> {
  const authState = { token: await authenticate() };
  const publisher = opts.corpus ? new GitPublisher(opts.corpus) : null;
  const edges: Record<string, string[]> = {};
  const depth = new Map<string, number>();
  const seen = new Set<string>();
  const indexIds = new Set<string>();
  const normIds = new Set<string>();
  const publishedIds = new Set<string>();
  const skippedExistingIds = new Set<string>();
  const dateRejectedIds = new Set<string>();
  const emptyBodyIds = new Set<string>();
  const failedIds: Record<string, string> = {};
  const stats: CrawlStats = {
    fetched: 0,
    published: 0,
    skippedExisting: 0,
    dateRejected: 0,
    emptyBody: 0,
    failed: 0,
  };
  const queue: string[] = [];

  for (const s of opts.seeds) {
    queue.push(s);
    depth.set(s, 0);
  }

  const delay = Math.max(0, Math.round(1000 / opts.rps));
  const checkpointEvery = opts.checkpointEvery ?? 25;
  while (queue.length > 0) {
    const id = queue.shift();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const d = depth.get(id) ?? 0;

    let children: string[] = [];
    let detalle: DetalleNorma | null = null;
    let publishCandidate = false;
    try {
      detalle = await getDetalleWithRetry(id, authState);
      stats.fetched++;
      children = extractIds(detalle.textoCompleto).filter((c) => c !== id);
      publishCandidate = hasPublicationDate(detalle);
    } catch (err) {
      failedIds[id] = String(err);
      stats.failed++;
      children = [];
    }

    if (!publishCandidate && children.length > 0) indexIds.add(id);
    if (publishCandidate || children.length === 0) normIds.add(id);
    edges[id] = children;

    if (!publishCandidate && d < opts.maxDepth) {
      for (const c of children) {
        if (!seen.has(c) && !depth.has(c)) {
          depth.set(c, d + 1);
          queue.push(c);
        }
      }
    }

    if (publisher && opts.corpus && detalle && (publishCandidate || children.length === 0)) {
      const norm = buildNormFromDetalle(detalle);
      const relativePath = `pe/${norm.frontmatter.identifier}.md`;
      if (!hasUsablePublicationDate(norm.frontmatter.publication_date)) {
        dateRejectedIds.add(id);
        stats.dateRejected++;
      } else if (norm.body.trim().length === 0) {
        emptyBodyIds.add(id);
        stats.emptyBody++;
      } else if (await fileExists(join(opts.corpus, relativePath))) {
        skippedExistingIds.add(id);
        stats.skippedExisting++;
      } else {
        await publisher.commitNorm({
          corpusRoot: opts.corpus,
          relativePath,
          frontmatter: norm.frontmatter,
          body: norm.body,
          commit: {
            type: "new",
            title: norm.frontmatter.title,
            trailers: {
              "Source-Id": norm._spij_id,
              "Source-Date": norm.frontmatter.publication_date,
              "Norm-Id": norm._norm_id,
            },
          },
        });
        publishedIds.add(id);
        stats.published++;
      }
    }

    opts.onProgress?.(seen.size, queue.length, stats);
    if (opts.onCheckpoint && seen.size % checkpointEvery === 0) {
      await opts.onCheckpoint(
        buildRegistry({
          seeds: opts.seeds,
          indexIds,
          normIds,
          edges,
          publishedIds,
          skippedExistingIds,
          dateRejectedIds,
          emptyBodyIds,
          failedIds,
        }),
      );
    }
    if (delay > 0) await sleep(delay);
  }

  const registry = buildRegistry({
    seeds: opts.seeds,
    indexIds,
    normIds,
    edges,
    publishedIds,
    skippedExistingIds,
    dateRejectedIds,
    emptyBodyIds,
    failedIds,
  });
  return {
    registry,
    stats,
  };
}

/** Phase 2: fetch a norm and build SPEC v0.2 frontmatter + body. */
export async function fetchNorm(id: string, token: string) {
  const d = await getDetalle(id, token);
  return buildNormFromDetalle(d);
}

function buildNormFromDetalle(d: DetalleNorma) {
  const title = stripTags(d.sumilla) || stripTags(d.titulo) || d.codigoNorma || d.id;
  const rank = rankFromDispositivo(d.dispositivoLegal);
  const pub = d.fechaPublicacion ?? null;
  const identifier = pub ? identifierFromDetalle(d, rank, pub) : d.id.toUpperCase();
  const frontmatter: SpecFrontmatter = {
    title,
    identifier,
    country: "pe",
    rank,
    publication_date: pub ?? "",
    last_updated: pub ?? "",
    status: "in_force",
    source: `https://spij.minjus.gob.pe/spij-ext-web/#/detallenorma/${d.id}`,
    scope: "Nacional",
    official_journal: "El Peruano",
  };
  return {
    frontmatter,
    body: htmlToBody(d.textoCompleto),
    _spij_id: d.id,
    _norm_id: d.codigoNorma ?? d.id,
    _date_missing: !pub,
  };
}

// ---- CLI wiring ---------------------------------------------------------

export async function runCrawl(opts: {
  seed?: string;
  maxDepth: string;
  out: string;
  corpus?: string;
}) {
  const seeds = opts.seed ? [opts.seed.toUpperCase()] : [SPIJ_SEEDS.materia];
  console.log(
    `[spij] crawl seeds=${seeds.join(",")} maxDepth=${opts.maxDepth}${opts.corpus ? ` corpus=${opts.corpus}` : ""}`,
  );
  await mkdir(dirname(opts.out), { recursive: true });
  const result = await crawlInternal({
    seeds,
    maxDepth: Number(opts.maxDepth),
    rps: 1,
    ...(opts.corpus ? { corpus: opts.corpus } : {}),
    onProgress: (seen, queued, stats) => {
      if (seen % 25 === 0) {
        process.stdout.write(
          `\r[spij] crawled=${seen} queued=${queued} published=${stats.published} skipped=${stats.skippedExisting} date_rejected=${stats.dateRejected} failed=${stats.failed}   `,
        );
      }
    },
    onCheckpoint: async (registry) => {
      await writeFile(opts.out, JSON.stringify(registry, null, 2));
    },
  });
  const reg = result.registry;
  await writeFile(opts.out, JSON.stringify(reg, null, 2));
  console.log(
    `\n[spij] done. index_nodes=${reg.index_ids.length} norms=${reg.norm_ids.length} published=${result.stats.published} skipped_existing=${result.stats.skippedExisting} date_rejected=${result.stats.dateRejected} empty_body=${result.stats.emptyBody} failed=${result.stats.failed} -> ${opts.out}`,
  );
}

export async function runFetch(opts: {
  registry: string;
  limit?: string;
  out: string;
  corpus?: string; // if set: publish SPEC Markdown to corpus via GitPublisher (one commit/norm)
}) {
  const reg = JSON.parse(await readFile(opts.registry, "utf8")) as Registry;
  const limit = opts.limit ? Number(opts.limit) : reg.norm_ids.length;
  const ids = reg.norm_ids.slice(0, limit);
  let token = await authenticate();
  const publisher = opts.corpus ? new GitPublisher(opts.corpus) : null;
  if (!publisher) await mkdir(opts.out, { recursive: true });

  let ok = 0;
  let dateMissing = 0;
  for (const id of ids) {
    try {
      let norm: Awaited<ReturnType<typeof fetchNorm>>;
      try {
        norm = await fetchNorm(id, token);
      } catch (err) {
        if (String(err).includes("HTTP 401")) {
          token = await authenticate();
          norm = await fetchNorm(id, token);
        } else throw err;
      }
      if (norm._date_missing) dateMissing++;

      if (publisher) {
        await publisher.commitNorm({
          corpusRoot: opts.corpus as string,
          relativePath: `pe/${norm.frontmatter.identifier}.md`,
          frontmatter: norm.frontmatter,
          body: norm.body,
          commit: {
            type: "new",
            title: norm.frontmatter.title,
            trailers: {
              "Source-Id": norm._spij_id,
              "Source-Date": norm.frontmatter.publication_date || "unknown",
              "Norm-Id": norm._norm_id,
            },
          },
        });
      } else {
        await writeFile(
          join(opts.out, `${id}.json`),
          JSON.stringify({ frontmatter: norm.frontmatter, body: norm.body }, null, 2),
        );
      }
      ok++;
      process.stdout.write(`\r[spij] fetched=${ok}/${ids.length} date_missing=${dateMissing}   `);
    } catch (err) {
      console.error(`\n[spij] ${id} failed: ${err}`);
    }
    await sleep(1000);
  }
  const dest = publisher ? `corpus ${opts.corpus}/pe/` : opts.out;
  console.log(`\n[spij] fetch done. ok=${ok} date_missing=${dateMissing} -> ${dest}`);
}
