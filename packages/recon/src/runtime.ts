/**
 * Recon runtime — orchestrates agent-browser to fetch listings per IR.
 * Zero LLM at runtime. IR is hand-written from a one-shot snapshot.
 */

import type { ListingItem, ReconIR, RefPattern } from "@legalize-pe/core";
import * as browser from "./agent-browser.ts";

export class ReconRuntime {
  constructor(public ir: ReconIR) {}

  async ensureReady(): Promise<void> {
    await browser.ensureBrowser();
  }

  /**
   * Fetch listing page and parse items per IR ref_pattern.
   * Returns array of listing items found on the current page.
   */
  async fetchListingPage(pageNum = 1): Promise<ListingItem[]> {
    const url = this.buildListingUrl(pageNum);
    await browser.open(url);
    await browser.waitNetworkIdle();
    const snap = await browser.snapshot();
    // agent-browser JSON output omits URLs from refs map — they're inline in the snapshot text.
    // Augment refs with URLs parsed from snapshot text.
    const refsWithUrls = augmentRefsWithUrls(snap.refs, snap.snapshot);
    return this.parseListing(refsWithUrls);
  }

  /**
   * Fetch one page and rate-limit between requests.
   */
  async sleep(ms: number): Promise<void> {
    await new Promise((r) => setTimeout(r, ms));
  }

  buildListingUrl(pageNum: number): string {
    if (this.ir.listing.pagination_strategy === "page_query_param" && pageNum > 1) {
      const param = this.ir.listing.pagination_param ?? "page";
      const sep = this.ir.listing.url.includes("?") ? "&" : "?";
      return `${this.ir.listing.url}${sep}${param}=${pageNum}`;
    }
    return this.ir.listing.url;
  }

  parseListing(
    refs: Record<string, { name: string; role: string; url?: string }>,
  ): ListingItem[] {
    const titlePat = this.ir.listing.ref_pattern.title_link as RefPattern | undefined;
    const pdfPat = this.ir.listing.ref_pattern.pdf_link as RefPattern | undefined;
    if (!titlePat || !pdfPat) {
      throw new Error("IR missing required ref_pattern.title_link or pdf_link");
    }

    // Sort refs by numeric ref id (e1, e2, ..., e10, e11, ...) NOT by string
    // because Object.entries() returns refs in insertion order which is unreliable.
    const refEntries = Object.entries(refs).sort((a, b) => {
      const ai = Number.parseInt(a[0].slice(1), 10);
      const bi = Number.parseInt(b[0].slice(1), 10);
      return ai - bi;
    });

    const items: ListingItem[] = [];

    for (let i = 0; i < refEntries.length; i++) {
      const entry = refEntries[i];
      if (!entry) continue;
      const [, r] = entry;
      if (!matchesRefPattern(r, titlePat)) continue;
      if (!r.url) continue;

      // Look ahead up to 4 refs for the matching PDF link.
      let pdfUrl: string | undefined;
      for (let j = i + 1; j < Math.min(i + 5, refEntries.length); j++) {
        const nextEntry = refEntries[j];
        if (!nextEntry) continue;
        const [, n] = nextEntry;
        if (matchesRefPattern(n, pdfPat) && n.url) {
          pdfUrl = n.url;
          break;
        }
      }

      items.push({
        detail_url: r.url,
        title: r.name,
        ...(pdfUrl ? { pdf_url: pdfUrl } : {}),
      });
    }

    return items;
  }
}

/**
 * agent-browser's --json output omits URLs from refs map. URLs appear inline in
 * the snapshot text as `[ref=eN, url=...]`. Augment refs with their URLs.
 */
function augmentRefsWithUrls(
  refs: Record<string, { name: string; role: string }>,
  snapshotText: string,
): Record<string, { name: string; role: string; url?: string }> {
  const refToUrl = new Map<string, string>();
  // Match patterns like [ref=e44, url=https://...] OR [ref=e44, ... url=https://...]
  const re = /\[ref=(e\d+)(?:,[^[\]]*)?,\s*url=([^\]\s]+)/g;
  let m: RegExpExecArray | null;
  m = re.exec(snapshotText);
  while (m !== null) {
    if (m[1] && m[2]) {
      refToUrl.set(m[1], m[2]);
    }
    m = re.exec(snapshotText);
  }

  // Also handle [ref=eN, url=...] when url comes first
  const re2 = /\[url=([^\]\s,]+),\s*ref=(e\d+)/g;
  m = re2.exec(snapshotText);
  while (m !== null) {
    if (m[1] && m[2]) {
      refToUrl.set(m[2], m[1]);
    }
    m = re2.exec(snapshotText);
  }

  const result: Record<string, { name: string; role: string; url?: string }> = {};
  for (const [k, v] of Object.entries(refs)) {
    const url = refToUrl.get(k);
    result[k] = url ? { ...v, url } : { ...v };
  }
  return result;
}

function matchesRefPattern(
  ref: { name: string; role: string; url?: string },
  pattern: RefPattern,
): boolean {
  if (pattern.role && ref.role !== pattern.role) return false;
  if (pattern.name_equals && ref.name !== pattern.name_equals) return false;
  if (pattern.name_contains && !ref.name.includes(pattern.name_contains)) return false;
  if (pattern.url_pattern) {
    if (!ref.url) return false;
    const re = new RegExp(pattern.url_pattern);
    if (!re.test(ref.url)) return false;
  }
  return true;
}
