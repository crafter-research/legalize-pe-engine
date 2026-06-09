/**
 * Datos Abiertos catalog ingest.
 *
 * Loads the El Peruano "dispositivos legales" CSV (datosabiertos.gob.pe) into a
 * queryable SQLite DB. The catalog is two things at once:
 *   1. The COVERAGE DENOMINATOR — "how many norms exist per entity" — so the
 *      /audit dashboard can report corpus-files / catalog-rows per jurisdiction.
 *   2. The data layer behind CatalogCrossrefFetcher — for portals that 403 on
 *      listings (Áncash, Puno…), the catalog is how we know what to fetch and
 *      carries the per-norm El Peruano PDF link.
 *
 * CSV schema (header row):
 *   FECHA_PUBLICACION,OP,ENTIDAD,DISPOSITIVO,NUMERO,SUMILLA,LINK,FECHA_CORTE
 *
 * Source files (monthly + a 2013–2022 backfill):
 *   https://www.datosabiertos.gob.pe/sites/default/files/DatosAbiertos_Periodo_YYYYMMDD_YYYYMMDD.CSV
 *
 * Usage:
 *   bun src/cli.ts catalog ingest --csv /path/to/backfill.csv --db data/catalog.db
 *   bun src/cli.ts catalog coverage --db data/catalog.db --corpus ../legalize-pe
 *
 * The .db is large and gitignored; the compact coverage summary (data/catalog-coverage.json)
 * is the committable artifact.
 */

import { Database } from "bun:sqlite";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/** ISO 3166-2:PE region codes -> legalize-pe `pe-xxx` jurisdiction slugs (lowercase). */
const GORE_ISO: Record<string, string> = {
  AMAZONAS: "pe-ama",
  ANCASH: "pe-anc",
  APURIMAC: "pe-apu",
  AREQUIPA: "pe-are",
  AYACUCHO: "pe-aya",
  CAJAMARCA: "pe-caj",
  CALLAO: "pe-cal",
  CUSCO: "pe-cus",
  HUANCAVELICA: "pe-huv",
  HUANUCO: "pe-huc",
  ICA: "pe-ica",
  JUNIN: "pe-jun",
  "LA LIBERTAD": "pe-lal",
  LAMBAYEQUE: "pe-lam",
  LIMA: "pe-lim",
  LORETO: "pe-lor",
  "MADRE DE DIOS": "pe-mdd",
  MOQUEGUA: "pe-moq",
  PASCO: "pe-pas",
  PIURA: "pe-piu",
  PUNO: "pe-pun",
  "SAN MARTIN": "pe-sam",
  TACNA: "pe-tac",
  TUMBES: "pe-tum",
  UCAYALI: "pe-uca",
};

type Tier = "nacional" | "regional" | "municipal";

function deaccent(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Classify a catalog row's ENTIDAD into a tier + (for regional) an ISO code. */
export function classifyEntity(entidad: string): { tier: Tier; iso: string | null } {
  const e = deaccent(entidad).toUpperCase().trim();
  if (e.startsWith("GOBIERNO REGIONAL")) {
    const name = e.replace(/^GOBIERNO REGIONAL (DE |DEL |DE LA )?/, "").trim();
    return { tier: "regional", iso: GORE_ISO[name] ?? null };
  }
  if (e.includes("MUNICIPALIDAD")) return { tier: "municipal", iso: null };
  return { tier: "nacional", iso: null };
}

/** Minimal CSV line splitter that respects double-quoted fields. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

export async function runCatalogIngest(opts: { csv: string; db: string }) {
  await mkdir(dirname(opts.db), { recursive: true });
  const db = new Database(opts.db);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;");
  db.exec(`
    DROP TABLE IF EXISTS norms;
    CREATE TABLE norms (
      fecha_publicacion TEXT,
      op TEXT,
      entidad TEXT,
      dispositivo TEXT,
      numero TEXT,
      sumilla TEXT,
      link TEXT,
      fecha_corte TEXT,
      tier TEXT,
      iso TEXT
    );
  `);

  const text = await Bun.file(opts.csv).text();
  const lines = text.split(/\r?\n/);
  const header = splitCsvLine(lines[0] ?? "");
  const col = (name: string) => header.indexOf(name);
  const iF = col("FECHA_PUBLICACION");
  const iOp = col("OP");
  const iEnt = col("ENTIDAD");
  const iDisp = col("DISPOSITIVO");
  const iNum = col("NUMERO");
  const iSum = col("SUMILLA");
  const iLink = col("LINK");
  const iCorte = col("FECHA_CORTE");

  const insert = db.prepare(
    "INSERT INTO norms (fecha_publicacion,op,entidad,dispositivo,numero,sumilla,link,fecha_corte,tier,iso) VALUES (?,?,?,?,?,?,?,?,?,?)",
  );
  const tx = db.transaction((rows: string[][]) => {
    for (const f of rows) {
      const entidad = f[iEnt] ?? "";
      const { tier, iso } = classifyEntity(entidad);
      const raw = f[iF] ?? "";
      // CSV dates are YYYYMMDD; normalize to ISO
      const fecha = /^\d{8}$/.test(raw) ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw;
      insert.run(
        fecha,
        f[iOp] ?? "",
        entidad,
        f[iDisp] ?? "",
        f[iNum] ?? "",
        f[iSum] ?? "",
        f[iLink] ?? "",
        f[iCorte] ?? "",
        tier,
        iso,
      );
    }
  });

  const BATCH = 5000;
  let batch: string[][] = [];
  let n = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    batch.push(splitCsvLine(line));
    if (batch.length >= BATCH) {
      tx(batch);
      n += batch.length;
      batch = [];
      process.stdout.write(`\r[catalog] ingested ${n.toLocaleString()} rows`);
    }
  }
  if (batch.length) {
    tx(batch);
    n += batch.length;
  }
  db.exec("CREATE INDEX idx_tier ON norms(tier); CREATE INDEX idx_iso ON norms(iso); CREATE INDEX idx_ent ON norms(entidad);");

  const byTier = db.query("SELECT tier, COUNT(*) c FROM norms GROUP BY tier ORDER BY c DESC").all();
  const distinctEnt = (db.query("SELECT COUNT(DISTINCT entidad) c FROM norms").get() as { c: number }).c;
  const goreRows = db.query("SELECT COUNT(*) c FROM norms WHERE tier='regional'").get() as { c: number };
  console.log(`\n[catalog] done. rows=${n.toLocaleString()} -> ${opts.db}`);
  console.log(`[catalog] tiers: ${JSON.stringify(byTier)}`);
  console.log(`[catalog] distinct entities: ${distinctEnt}; regional rows: ${goreRows.c}`);
  db.close();
}

export async function runCatalogCoverage(opts: { db: string; corpus: string }) {
  const db = new Database(opts.db, { readonly: true });

  // Numerator: corpus files per jurisdiction dir.
  async function countMd(dir: string): Promise<number> {
    try {
      const entries = await readdir(join(opts.corpus, dir));
      return entries.filter((e) => e.endsWith(".md")).length;
    } catch {
      return 0;
    }
  }

  const isoDirs = [...new Set(Object.values(GORE_ISO))];
  const regional = [];
  for (const iso of isoDirs) {
    const denom = (db.query("SELECT COUNT(*) c FROM norms WHERE iso=?").get(iso) as { c: number }).c;
    const have = await countMd(iso);
    regional.push({ iso, corpus: have, catalog_2013_22: denom, pct: denom ? +((have / denom) * 100).toFixed(1) : null });
  }
  regional.sort((a, b) => (b.catalog_2013_22 ?? 0) - (a.catalog_2013_22 ?? 0));

  const nacionalCatalog = (db.query("SELECT COUNT(*) c FROM norms WHERE tier='nacional'").get() as { c: number }).c;
  const nacionalCorpus = await countMd("pe");

  const summary = {
    generated_at: new Date().toISOString(),
    note: "Numerator = corpus *.md files. Denominator = El Peruano catalog rows 2013-2022 (a FLOOR — pre-2013 and post-2022 norms exist beyond this). Use as a directional coverage gauge, not an absolute %.",
    nacional: { corpus: nacionalCorpus, catalog_2013_22: nacionalCatalog },
    regional,
  };

  await mkdir(dirname(join(opts.corpus, "..")), { recursive: true }).catch(() => {});
  const out = "data/catalog-coverage.json";
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, JSON.stringify(summary, null, 2));
  console.log(`[coverage] nacional: corpus=${nacionalCorpus} / catalog(13-22)=${nacionalCatalog}`);
  console.table(regional);
  console.log(`[coverage] summary -> ${out}`);
  db.close();
}
