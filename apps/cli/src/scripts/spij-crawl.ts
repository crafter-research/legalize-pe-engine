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

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { RANK_NORMALIZATIONS, buildNewIdentifier } from "@legalize-pe/core";
import { htmlToMarkdown } from "@legalize-pe/parser";
import { GitPublisher } from "@legalize-pe/git-publisher";

const BACK = "https://spijwsii.minjus.gob.pe/spij-ext-back";

// Seeds (index pseudo-norms). Materia confirmed 2026-06-09; regional TBD (capture next).
export const SPIJ_SEEDS = {
  materia: "H682710", // "LEGISLACION POR MATERIA" index -> 93 compendios
  // regional: "H??????", // "GOBIERNOS LOCALES Y REGIONALES" index — capture seed id next session
};

const ID_RE = /[Hh]\d{6,}/g;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`detallenorma ${id}: HTTP ${res.status}`);
  return (await res.json()) as DetalleNorma;
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

interface Registry {
  seeds: string[];
  crawled_at: string;
  index_ids: string[]; // compendios / index nodes (have children)
  norm_ids: string[]; // leaf norms (no children, or terminal)
  edges: Record<string, string[]>; // id -> child ids
}

/** Phase 1: recursive crawl from seed(s), collecting all reachable ids. */
export async function crawl(opts: {
  seeds: string[];
  maxDepth: number;
  rps: number;
  onProgress?: (seen: number, queued: number) => void;
}): Promise<Registry> {
  const token = await authenticate();
  const edges: Record<string, string[]> = {};
  const depth = new Map<string, number>();
  const seen = new Set<string>();
  const indexIds = new Set<string>();
  const queue: string[] = [];

  for (const s of opts.seeds) {
    queue.push(s);
    depth.set(s, 0);
  }

  const delay = Math.max(0, Math.round(1000 / opts.rps));
  while (queue.length > 0) {
    const id = queue.shift();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const d = depth.get(id) ?? 0;

    let children: string[] = [];
    try {
      const detalle = await getDetalle(id, token);
      children = extractIds(detalle.textoCompleto).filter((c) => c !== id);
    } catch (err) {
      // 401 => token expired; re-auth once and retry this id
      if (String(err).includes("HTTP 401")) {
        const fresh = await authenticate();
        const detalle = await getDetalle(id, fresh);
        children = extractIds(detalle.textoCompleto).filter((c) => c !== id);
      } else {
        children = [];
      }
    }

    if (children.length > 0) indexIds.add(id);
    edges[id] = children;

    if (d < opts.maxDepth) {
      for (const c of children) {
        if (!seen.has(c) && !depth.has(c)) {
          depth.set(c, d + 1);
          queue.push(c);
        }
      }
    }
    opts.onProgress?.(seen.size, queue.length);
    if (delay > 0) await sleep(delay);
  }

  const normIds = [...seen].filter((id) => !indexIds.has(id));
  return {
    seeds: opts.seeds,
    crawled_at: new Date().toISOString(),
    index_ids: [...indexIds].sort(),
    norm_ids: normIds.sort(),
    edges,
  };
}

/** Phase 2: fetch a norm and build SPEC v0.2 frontmatter + body. */
export async function fetchNorm(id: string, token: string) {
  const d = await getDetalle(id, token);
  const title = stripTags(d.sumilla) || stripTags(d.titulo) || d.codigoNorma || id;
  const rank = rankFromDispositivo(d.dispositivoLegal);
  const pub = d.fechaPublicacion ?? null;
  // Best-effort SPEC identifier from "Nº 295" + rank + year. Falls back to SPIJ id.
  const rawId = (d.codigoNorma ?? id).replace(/^N[ºo°]\s*/i, "").trim();
  const identifier = buildNewIdentifier({
    oldId: `${rank}-${rawId}`,
    rank,
    ...(pub ? { publicationDate: pub } : {}),
  });
  return {
    frontmatter: {
      title,
      identifier,
      country: "pe" as const,
      rank,
      publication_date: pub ?? "",
      last_updated: pub ?? "",
      status: "in_force" as const,
      source: `https://spij.minjus.gob.pe/spij-ext-web/#/detallenorma/${id}`,
      scope: "Nacional" as const,
      official_journal: "El Peruano",
    },
    body: htmlToBody(d.textoCompleto),
    _spij_id: id,
    _norm_id: d.codigoNorma ?? id,
    _date_missing: !pub,
  };
}

// ---- CLI wiring ---------------------------------------------------------

export async function runCrawl(opts: { seed?: string; maxDepth: string; out: string }) {
  const seeds = opts.seed ? [opts.seed.toUpperCase()] : [SPIJ_SEEDS.materia];
  console.log(`[spij] crawl seeds=${seeds.join(",")} maxDepth=${opts.maxDepth}`);
  const reg = await crawl({
    seeds,
    maxDepth: Number(opts.maxDepth),
    rps: 1,
    onProgress: (seen, queued) => {
      if (seen % 25 === 0) process.stdout.write(`\r[spij] crawled=${seen} queued=${queued}   `);
    },
  });
  await mkdir(dirname(opts.out), { recursive: true });
  await writeFile(opts.out, JSON.stringify(reg, null, 2));
  console.log(
    `\n[spij] done. index_nodes=${reg.index_ids.length} norms=${reg.norm_ids.length} -> ${opts.out}`,
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
