/**
 * Regional full-text enrichment.
 *
 * The regional fanout published metadata-only "skeleton" norms (title + date +
 * source link). This pipeline fills in the body: for each regional norm it
 * fetches the gob.pe detail page, extracts the CDN PDF link, downloads the PDF,
 * and extracts text. Most gob.pe regional PDFs are born-digital El Peruano
 * gazette pages, so `pdftotext` works (no OCR). PDFs with no text layer are
 * counted as needs_ocr and left as skeleton for a later OCR pass.
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
import { readFileSync, readdirSync } from "node:fs";
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
  const m = detailHtml.match(/cdn\.www\.gob\.pe\/uploads\/document\/file\/\d+\/[^"'\s]+\.pdf/);
  return m ? `https://${m[0]}` : null;
}

/** Clean pdftotext output of El Peruano gazette boilerplate into a readable body. */
export function cleanPdfText(raw: string): string {
  return raw
    .replace(/Firmado (digitalmente )?por:[^\n]*/gi, "")
    .replace(/Fecha:\s*\d{2}\/\d{2}\/\d{4}[^\n]*/gi, "")
    .replace(/^\s*NORMAS LEGALES\s*$/gim, "")
    .replace(/El Peruano\s*\/?[^\n]*\d{4}[^\n]*/gi, "")
    .replace(/^\s*\d{1,4}\s*$/gm, "") // standalone page numbers
    .replace(/([a-záéíóúñ])-\n([a-záéíóúñ])/gi, "$1$2") // de-hyphenate line breaks
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface Stats {
  enriched: number;
  skippedReal: number;
  needsOcr: number;
  noPdf: number;
  failed: number;
}

export async function runRegionalFulltext(opts: {
  iso: string;
  corpus: string;
  max?: number;
  minChars?: number;
}) {
  const dir = join(opts.corpus, opts.iso);
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort();
  const minChars = opts.minChars ?? 500;
  const publisher = new GitPublisher(opts.corpus);
  const stats: Stats = { enriched: 0, skippedReal: 0, needsOcr: 0, noPdf: 0, failed: 0 };
  const needsOcrIds: string[] = [];
  const tmp = join(tmpdir(), `legalize-pdf-${opts.iso}.pdf`);

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
        await sleep(1000);
        continue;
      }
      await sleep(1000);
      const dl = spawnSync("curl", ["-sL", "-A", UA, "-m", "60", "-o", tmp, pdfUrl]);
      if (dl.status !== 0) {
        stats.failed++;
        continue;
      }
      const out = spawnSync("pdftotext", ["-q", tmp, "-"], {
        encoding: "utf-8",
        maxBuffer: 64 * 1024 * 1024,
      });
      const text = cleanPdfText(out.stdout ?? "");
      if (text.replace(/\s/g, "").length < minChars) {
        stats.needsOcr++;
        needsOcrIds.push(fm.identifier ?? file);
        await sleep(1000);
        continue;
      }
      const body = `# ${fm.title}\n\n${text}\n\n---\n\n*Fuente:* ${fm.source}${fm.pdf_url ? "" : `\n*PDF:* ${pdfUrl}`}\n`;
      await publisher.commitNorm({
        corpusRoot: opts.corpus,
        relativePath: relPath,
        frontmatter: fm,
        body,
        commit: {
          type: "correction",
          title: `${fm.title} — texto completo`,
          trailers: {
            "Source-Id": pdfUrl.split("/file/")[1]?.split("/")[0] ?? fm.identifier ?? file,
            "Source-Date": fm.publication_date || "unknown",
            "Norm-Id": fm.identifier ?? file,
          },
        },
      });
      stats.enriched++;
      process.stdout.write(
        `\r[fulltext] ${opts.iso} enriched=${stats.enriched} needs_ocr=${stats.needsOcr} no_pdf=${stats.noPdf} failed=${stats.failed}  `,
      );
      await sleep(1000);
    } catch (err) {
      stats.failed++;
      console.error(`\n[fulltext] ${relPath} failed: ${err instanceof Error ? err.message : err}`);
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
