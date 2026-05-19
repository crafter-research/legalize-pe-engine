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
    return this.parseListing(snap.refs);
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

    const items: ListingItem[] = [];
    const refEntries = Object.entries(refs);

    for (let i = 0; i < refEntries.length; i++) {
      const entry = refEntries[i];
      if (!entry) continue;
      const [, r] = entry;
      if (!matchesRefPattern(r, titlePat)) continue;
      if (!r.url) continue;

      // Look for the next ref that matches pdf_link pattern (typically immediately after)
      let pdfUrl: string | undefined;
      for (let j = i + 1; j < Math.min(i + 3, refEntries.length); j++) {
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
        pdf_url: pdfUrl,
      });
    }

    return items;
  }
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
