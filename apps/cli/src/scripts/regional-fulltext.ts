/**
 * Regional full-text enrichment.
 *
 * The regional fanout published metadata-only "skeleton" norms (title + date +
 * source link). This pipeline fills in the body: for each regional norm it
 * fetches the gob.pe detail page, extracts the CDN PDF link, downloads the PDF,
 * and extracts text. Born-digital PDFs use `pdftotext`; scanned PDFs are
 * rasterized with `pdftoppm` and transcribed with local OCR.
 *
 * Idempotent: skips norms whose body is already real (not a "*Fuente:*" skeleton).
 * Commits each enriched norm to the corpus as a [correction] with the norm's
 * real publication date (Crafternauta identity, via GitPublisher).
 *
 * Usage:
 *   bun src/cli.ts regional fulltext --iso pe-tac --corpus ../legalize-pe
 *   bun src/cli.ts regional fulltext --iso pe-tac --max 20   # bounded pilot
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SpecFrontmatter } from "@legalize-pe/core";
import { GitPublisher } from "@legalize-pe/git-publisher";
import matter from "gray-matter";

const UA = "Mozilla/5.0 (legalize-pe research; +https://github.com/crafter-research/legalize-pe)";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A body is a "skeleton" (metadata-only) if it's essentially just the source line. */
export function isSkeletonBody(body: string): boolean {
  return /\*Fuente:\*/.test(body) && body.replace(/[#*\s]/g, "").length < 400;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(30000),
  });
  return res.ok ? res.text() : "";
}

/** Extract the first gob.pe CDN PDF URL from a detail page. */
export function extractPdfUrl(detailHtml: string): string | null {
  const m = detailHtml.match(
    /(?:https?:\/\/)?cdn\.www\.gob\.pe\/uploads\/document\/file\/\d+\/[^"'\s<>]+?\.pdf_?(?:\?[^"'\s<>]+)?/i,
  );
  if (!m) return null;
  const url = m[0].replace(/&amp;/g, "&");
  return url.startsWith("http") ? url : `https://${url}`;
}

/** Clean pdftotext output of El Peruano gazette boilerplate into a readable body. */
export function cleanPdfText(raw: string): string {
  return raw
    .replace(/Firmado (digitalmente )?por:[^\n]*/gi, "")
    .replace(/Fecha:\s*\d{2}\/\d{2}\/\d{4}[^\n]*/gi, "")
    .replace(/^\s*NORMAS LEGALES\s*$/gim, "")
    .replace(/El Peruano\s*\/?[^\n]*\d{4}[^\n]*/gi, "")
    .replace(/\f/g, "\n")
    .replace(/^\s*\d{1,4}\s*$/gm, "") // standalone page numbers
    .replace(/([a-záéíóúñ])-\n([a-záéíóúñ])/gi, "$1$2") // de-hyphenate line breaks
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface Stats {
  enriched: number;
  bornDigital: number;
  ocrEnriched: number;
  skippedReal: number;
  needsOcr: number;
  ocrFailed: number;
  ocrPageLimited: number;
  noPdf: number;
  failed: number;
}

function isLegalText(text: string, minChars: number): boolean {
  const compactLength = text.replace(/\s/g, "").length;
  if (compactLength < minChars) return false;
  return /\b(art[ií]culo|ordenanza|acuerdo|decreto|resuelve|gobierno regional|consejo regional|gerencia|aprobar|aprueba|dispone|resoluci[oó]n)\b/i.test(
    text,
  );
}

function listRasterPages(dir: string, prefix: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.startsWith(prefix) && f.endsWith(".png"))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((f) => join(dir, f));
}

function ocrPdf(
  pdfPath: string,
  opts: { maxPages: number; dpi: number; lang: string; timeoutMs: number },
): string {
  const dir = mkdtempSync(join(tmpdir(), "legalize-ocr-"));
  try {
    const prefix = "page";
    const raster = spawnSync(
      "pdftoppm",
      [
        "-png",
        "-r",
        String(opts.dpi),
        "-f",
        "1",
        "-l",
        String(opts.maxPages),
        pdfPath,
        join(dir, prefix),
      ],
      { timeout: opts.timeoutMs },
    );
    if (raster.status !== 0) return "";

    const pages = listRasterPages(dir, prefix);
    const texts: string[] = [];
    for (const page of pages) {
      const out = spawnSync("tesseract", [page, "stdout", "-l", opts.lang, "--psm", "1"], {
        encoding: "utf-8",
        maxBuffer: 64 * 1024 * 1024,
        timeout: opts.timeoutMs,
      });
      if (out.status === 0 && out.stdout) texts.push(out.stdout);
    }
    return cleanPdfText(texts.join("\n\n"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export async function runRegionalFulltext(opts: {
  iso: string;
  corpus: string;
  max?: number;
  minChars?: number;
  maxPages?: number;
  ocrDpi?: number;
  ocrLang?: string;
  ocrTimeoutMs?: number;
}) {
  const dir = join(opts.corpus, opts.iso);
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort();
  const minChars = opts.minChars ?? 500;
  const maxPages = opts.maxPages ?? 15;
  const ocrDpi = opts.ocrDpi ?? 200;
  const ocrLang = opts.ocrLang ?? "spa+eng";
  const ocrTimeoutMs = opts.ocrTimeoutMs ?? 120_000;
  const publisher = new GitPublisher(opts.corpus);
  const stats: Stats = {
    enriched: 0,
    bornDigital: 0,
    ocrEnriched: 0,
    skippedReal: 0,
    needsOcr: 0,
    ocrFailed: 0,
    ocrPageLimited: 0,
    noPdf: 0,
    failed: 0,
  };
  const needsOcrIds: string[] = [];
  const tmp = join(tmpdir(), `legalize-pdf-${opts.iso}.pdf`);
  const writeProgress = () => {
    process.stdout.write(
      `\r[fulltext] ${opts.iso} enriched=${stats.enriched} born_digital=${stats.bornDigital} ocr=${stats.ocrEnriched} needs_ocr=${stats.needsOcr} ocr_failed=${stats.ocrFailed} ocr_limited=${stats.ocrPageLimited} no_pdf=${stats.noPdf} failed=${stats.failed}  `,
    );
  };

  let processed = 0;
  for (const file of files) {
    if (opts.max && processed >= opts.max) break;
    const relPath = `${opts.iso}/${file}`;
    const abs = join(dir, file);
    const { data, content } = matter(readFileSync(abs, "utf-8"));
    const fm = data as SpecFrontmatter;
    if (!isSkeletonBody(content)) {
      stats.skippedReal++;
      continue;
    }
    processed++;
    try {
      const detail = fm.source ? await fetchText(fm.source) : "";
      const pdfUrl = extractPdfUrl(detail);
      if (!pdfUrl) {
        stats.noPdf++;
        writeProgress();
        await sleep(1000);
        continue;
      }
      await sleep(1000);
      const dl = spawnSync("curl", ["-sL", "-A", UA, "-m", "60", "-o", tmp, pdfUrl]);
      if (dl.status !== 0) {
        stats.failed++;
        writeProgress();
        continue;
      }
      const out = spawnSync("pdftotext", ["-q", tmp, "-"], {
        encoding: "utf-8",
        maxBuffer: 64 * 1024 * 1024,
      });
      let text = cleanPdfText(out.stdout ?? "");
      let sourceKind: "born-digital" | "ocr" = "born-digital";
      if (!isLegalText(text, minChars)) {
        stats.needsOcr++;
        const normId = fm.identifier ?? file;
        const pageInfo = spawnSync("pdfinfo", [tmp], { encoding: "utf-8" });
        const pageMatch = pageInfo.stdout?.match(/^Pages:\s+(\d+)/m);
        const pageCount = pageMatch ? Number(pageMatch[1]) : 0;
        if (pageCount > maxPages) {
          stats.ocrPageLimited++;
          needsOcrIds.push(normId);
          writeProgress();
          await sleep(1000);
          continue;
        }
        text = ocrPdf(tmp, { maxPages, dpi: ocrDpi, lang: ocrLang, timeoutMs: ocrTimeoutMs });
        sourceKind = "ocr";
        if (!isLegalText(text, minChars)) {
          stats.ocrFailed++;
          needsOcrIds.push(normId);
          writeProgress();
          await sleep(1000);
          continue;
        }
      }
      const body = `# ${fm.title}\n\n${text}\n\n---\n\nFuente: ${fm.source}\nPDF: ${pdfUrl}\n`;
      await publisher.commitNorm({
        corpusRoot: opts.corpus,
        relativePath: relPath,
        frontmatter: fm,
        body,
        commit: {
          type: "correction",
          title: `${fm.title} - texto completo`,
          trailers: {
            "Source-Id": pdfUrl.split("/file/")[1]?.split("/")[0] ?? fm.identifier ?? file,
            "Source-Date": fm.publication_date || "unknown",
            "Norm-Id": fm.identifier ?? file,
          },
        },
      });
      stats.enriched++;
      if (sourceKind === "born-digital") stats.bornDigital++;
      else stats.ocrEnriched++;
      writeProgress();
      await sleep(1000);
    } catch (err) {
      stats.failed++;
      console.error(`\n[fulltext] ${relPath} failed: ${err instanceof Error ? err.message : err}`);
      writeProgress();
    }
  }
  console.log(`\n[fulltext] ${opts.iso} DONE. ${JSON.stringify(stats)}`);
  if (needsOcrIds.length) {
    console.log(
      `[fulltext] needs OCR (${needsOcrIds.length}): ${needsOcrIds.slice(0, 20).join(", ")}${needsOcrIds.length > 20 ? " …" : ""}`,
    );
  }
  return stats;
}
