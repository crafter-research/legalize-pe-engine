/**
 * gob.pe type-code discovery + fetcher classification.
 *
 * Empirically, Peruvian institutions classify their legislation under different
 * gob.pe `tipos/{id}-{slug}` codes (13 ordenanza, 40 ordenanza-regional, 41
 * decreto-regional, 79 acuerdo-regional, 246 acuerdo-de-consejo-regional, ...),
 * and the landing page only *samples* the types. Worse, a type listing can
 * return HTTP 200 with ZERO entries (La Libertad's `13-ordenanza`). So we cannot
 * classify a jurisdiction from the landing or the status code alone — we must
 * probe the actual norm-class type listings and count detail links.
 *
 * For each jurisdiction this:
 *   1. GETs the normas-legales landing -> extracts every `tipos/{id}-{slug}`.
 *   2. Probes the norm-class types (ordenanza family) -> counts detail links.
 *   3. Recommends a fetcher:
 *        gob-pe          -> a norm-class type listing has content
 *        catalog-crossref-> norm types exist on gob.pe but listings 403/empty,
 *                           OR the landing has no norm-class type at all
 *        (static-directory is assigned by hand when a portal is Apache/WordPress)
 *
 * Usage:
 *   bun src/cli.ts discover-types --slug regionarequipa
 *   bun src/cli.ts discover-types --all --out data/coverage-matrix.json
 *
 * Polite: serial, ~1 req/s. Read-only GETs against public pages.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const UA = "Mozilla/5.0 (legalize-pe research; +https://github.com/crafter-research/legalize-pe)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Norm-class gob.pe type slugs we care about (actual legislation, not actas/agendas). */
const NORM_TYPE_PATTERNS = [
  /\d+-ordenanza$/,
  /\d+-ordenanza-regional$/,
  /\d+-ordenanza-municipal$/,
  /\d+-decreto-regional$/,
  /\d+-acuerdo-regional$/,
  /\d+-acuerdo-de-consejo-regional$/,
  /\d+-acuerdo-de-concejo$/,
  /\d+-decreto-de-alcaldia$/,
];

/** The 26 regional-tier jurisdictions: gob.pe slug -> pe-{iso}. */
export const REGIONAL_SLUGS: { slug: string; iso: string; name: string }[] = [
  { slug: "regionamazonas", iso: "pe-ama", name: "Amazonas" },
  { slug: "regionancash", iso: "pe-anc", name: "Áncash" },
  { slug: "regionapurimac", iso: "pe-apu", name: "Apurímac" },
  { slug: "regionarequipa", iso: "pe-are", name: "Arequipa" },
  { slug: "regionayacucho", iso: "pe-aya", name: "Ayacucho" },
  { slug: "regioncajamarca", iso: "pe-caj", name: "Cajamarca" },
  { slug: "regioncallao", iso: "pe-cal", name: "Callao" },
  { slug: "regioncusco", iso: "pe-cus", name: "Cusco" },
  { slug: "regionhuancavelica", iso: "pe-huv", name: "Huancavelica" },
  { slug: "regionhuanuco", iso: "pe-huc", name: "Huánuco" },
  { slug: "regionica", iso: "pe-ica", name: "Ica" },
  { slug: "regionjunin", iso: "pe-jun", name: "Junín" },
  { slug: "regionlalibertad", iso: "pe-lal", name: "La Libertad" },
  { slug: "regionlambayeque", iso: "pe-lam", name: "Lambayeque" },
  { slug: "regionlima", iso: "pe-lim", name: "Lima (GORE)" },
  { slug: "regionloreto", iso: "pe-lor", name: "Loreto" },
  { slug: "regionmadrededios", iso: "pe-mdd", name: "Madre de Dios" },
  { slug: "regionmoquegua", iso: "pe-moq", name: "Moquegua" },
  { slug: "regionpasco", iso: "pe-pas", name: "Pasco" },
  { slug: "regionpiura", iso: "pe-piu", name: "Piura" },
  { slug: "regionpuno", iso: "pe-pun", name: "Puno" },
  { slug: "regionsanmartin", iso: "pe-sam", name: "San Martín" },
  { slug: "regiontacna", iso: "pe-tac", name: "Tacna" },
  { slug: "regiontumbes", iso: "pe-tum", name: "Tumbes" },
  { slug: "regionucayali", iso: "pe-uca", name: "Ucayali" },
  { slug: "munilima", iso: "pe-lim-met", name: "Lima Metropolitana" },
];

async function getText(url: string): Promise<{ status: number; body: string }> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(25000),
    });
    const body = res.ok ? await res.text() : "";
    return { status: res.status, body };
  } catch (err) {
    return { status: 0, body: "" };
  }
}

function extractTypeSlugs(html: string): string[] {
  return [...new Set(html.match(/tipos\/\d+-[a-z-]+/g) ?? [])].map((s) => s.replace("tipos/", ""));
}

function countDetailLinks(html: string): number {
  return new Set(html.match(/normas-legales\/\d+-[a-z0-9-]+/g) ?? []).size;
}

export interface JurisdictionProbe {
  slug: string;
  iso: string;
  name: string;
  landing_status: number;
  landing_types: string[];
  norm_type_probes: { type: string; status: number; detail_links: number }[];
  recommended_fetcher: "gob-pe" | "catalog-crossref" | "unknown";
  primary_type: string | null;
}

export async function probeJurisdiction(j: {
  slug: string;
  iso: string;
  name: string;
}): Promise<JurisdictionProbe> {
  const landing = await getText(`https://www.gob.pe/institucion/${j.slug}/normas-legales`);
  const types = extractTypeSlugs(landing.body);
  const normTypes = types.filter((t) => NORM_TYPE_PATTERNS.some((re) => re.test(t)));

  const probes: JurisdictionProbe["norm_type_probes"] = [];
  for (const t of normTypes.slice(0, 5)) {
    await sleep(1000);
    const r = await getText(`https://www.gob.pe/institucion/${j.slug}/normas-legales/tipos/${t}`);
    probes.push({ type: t, status: r.status, detail_links: countDetailLinks(r.body) });
  }

  const withContent = probes
    .filter((p) => p.detail_links > 0)
    .sort((a, b) => b.detail_links - a.detail_links);
  let recommended: JurisdictionProbe["recommended_fetcher"];
  let primary: string | null = null;
  if (withContent.length > 0) {
    recommended = "gob-pe";
    primary = withContent[0]?.type ?? null;
  } else if (landing.status === 200) {
    // Landing resolves but no norm-type listing yielded content -> catalog fallback.
    recommended = "catalog-crossref";
  } else {
    recommended = "unknown";
  }

  return {
    slug: j.slug,
    iso: j.iso,
    name: j.name,
    landing_status: landing.status,
    landing_types: types,
    norm_type_probes: probes,
    recommended_fetcher: recommended,
    primary_type: primary,
  };
}

export async function runDiscoverTypes(opts: { slug?: string; all?: boolean; out?: string }) {
  if (opts.slug) {
    const j = REGIONAL_SLUGS.find((x) => x.slug === opts.slug) ?? {
      slug: opts.slug,
      iso: "?",
      name: opts.slug,
    };
    const p = await probeJurisdiction(j);
    console.log(JSON.stringify(p, null, 2));
    return;
  }
  if (!opts.all) {
    console.error("Pass --slug <slug> or --all");
    return;
  }

  const results: JurisdictionProbe[] = [];
  for (const j of REGIONAL_SLUGS) {
    const p = await probeJurisdiction(j);
    results.push(p);
    const tag =
      p.recommended_fetcher === "gob-pe" ? `gob-pe (${p.primary_type})` : p.recommended_fetcher;
    console.log(`${j.iso.padEnd(10)} ${j.name.padEnd(20)} -> ${tag}`);
    await sleep(1000);
  }

  const byFetcher = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.recommended_fetcher] = (acc[r.recommended_fetcher] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`\nfetcher distribution: ${JSON.stringify(byFetcher)}`);

  if (opts.out) {
    await mkdir(dirname(opts.out), { recursive: true });
    await writeFile(
      opts.out,
      JSON.stringify(
        { generated_at: new Date().toISOString(), summary: byFetcher, jurisdictions: results },
        null,
        2,
      ),
    );
    console.log(`coverage matrix -> ${opts.out}`);
  }
}
