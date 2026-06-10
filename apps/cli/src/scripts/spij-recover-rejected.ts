/**
 * Recover SPIJ norms wrongly rejected by the crawl's date filter.
 *
 * The crawl's `hasUsablePublicationDate` rejects ALL `2026-*` dates to dodge the
 * legacy ADR-10 placeholder debt. But that debt came from the OLD ad-hoc scraper;
 * SPIJ's `detallenorma` returns the AUTHORITATIVE publication date. It is now
 * 2026, so genuine 2026 norms exist — notably the JNE reglamentos for the 2026
 * elections — and the blanket rule drops them.
 *
 * This recovers the `date_rejected_ids` from the registry: publishes any with a
 * real ISO date (any year, incl. 2026) and a non-empty body; skips only the
 * truly date-less ones (e.g. CAN/Andean DECISIONs with no fechaPublicacion).
 *
 * Usage:
 *   bun src/cli.ts  (not wired — run directly)
 *   bun apps/cli/src/scripts/spij-recover-rejected.ts <registry> <corpusRoot>
 */

import { access } from "node:fs/promises";
import { join } from "node:path";
import { GitPublisher } from "@legalize-pe/git-publisher";
import { fetchNorm } from "./spij-crawl.ts";

const BACK = "https://spijwsii.minjus.gob.pe/spij-ext-back";
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function authenticate(): Promise<string> {
  const res = await fetch(`${BACK}/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario: "spijext", clave: "password", tipo: 0 }),
  });
  const j = (await res.json()) as { value: string };
  return j.value;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const registryPath = process.argv[2] ?? "data/spij-registry.json";
  const corpusRoot = process.argv[3] ?? "../legalize-pe";
  const reg = JSON.parse(await Bun.file(registryPath).text()) as { date_rejected_ids?: string[] };
  const ids = reg.date_rejected_ids ?? [];
  console.log(`[recover] ${ids.length} date-rejected ids; corpus=${corpusRoot}`);

  const publisher = new GitPublisher(corpusRoot);
  let token = await authenticate();

  let recovered = 0;
  let noDate = 0;
  let emptyBody = 0;
  let existing = 0;
  let failed = 0;
  const noDateIds: string[] = [];

  for (const id of ids) {
    try {
      let norm: Awaited<ReturnType<typeof fetchNorm>>;
      try {
        norm = await fetchNorm(id, token);
      } catch (e) {
        if (String(e).includes("HTTP 401")) {
          token = await authenticate();
          norm = await fetchNorm(id, token);
        } else throw e;
      }
      const date = norm.frontmatter.publication_date;
      if (!ISO.test(date)) {
        noDate++;
        noDateIds.push(id);
      } else if (norm.body.trim().length === 0) {
        emptyBody++;
      } else {
        const relativePath = `pe/${norm.frontmatter.identifier}.md`;
        if (await fileExists(join(corpusRoot, relativePath))) {
          existing++;
        } else {
          await publisher.commitNorm({
            corpusRoot,
            relativePath,
            frontmatter: norm.frontmatter,
            body: norm.body,
            commit: {
              type: "new",
              title: norm.frontmatter.title,
              trailers: {
                "Source-Id": norm._spij_id,
                "Source-Date": date,
                "Norm-Id": norm._norm_id,
              },
            },
          });
          recovered++;
        }
      }
    } catch (e) {
      failed++;
      console.error(`  ${id} failed: ${e}`);
    }
    process.stdout.write(`\r[recover] recovered=${recovered} no_date=${noDate} existing=${existing} empty=${emptyBody} failed=${failed}`);
    await sleep(800);
  }
  console.log(`\n[recover] done. recovered=${recovered} no_date=${noDate} existing=${existing} empty=${emptyBody} failed=${failed}`);
  if (noDateIds.length) console.log(`[recover] date-less ids (left out, no fechaPublicacion): ${noDateIds.join(", ")}`);
}

main();
