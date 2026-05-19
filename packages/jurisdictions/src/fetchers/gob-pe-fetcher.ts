/**
 * GobPeFetcher — fetches Ordenanzas (and other rank types) from gob.pe.
 *
 * URL pattern: https://www.gob.pe/institucion/{slug}/normas-legales/tipos/{N}-{slug}
 * Detail URL pattern: https://www.gob.pe/institucion/{slug}/normas-legales/{id}-{title-slug}
 * PDF: https://cdn.www.gob.pe/uploads/document/file/{id}/...pdf
 */

import type { ListingItem, ReconIR, SpecFrontmatter } from "@legalize-pe/core";
import { ReconRuntime } from "@legalize-pe/recon";

export interface GobPeFetcherOptions {
  ir: ReconIR;
  rankCode: string; // SPEC v0.2 rank value, e.g. "ordenanza_regional"
}

export class GobPeFetcher {
  private runtime: ReconRuntime;

  constructor(private options: GobPeFetcherOptions) {
    if (options.ir.fetcher_type !== "gob-pe") {
      throw new Error(
        `GobPeFetcher requires IR with fetcher_type=gob-pe, got ${options.ir.fetcher_type}`,
      );
    }
    this.runtime = new ReconRuntime(options.ir);
  }

  async ensureReady(): Promise<void> {
    await this.runtime.ensureReady();
  }

  /**
   * Discover listing items. Each item has detail URL + PDF URL + title.
   * Caller can request a limit (V1: fetch only first N).
   */
  async discoverListing(limit = 10): Promise<ListingItem[]> {
    const items = await this.runtime.fetchListingPage(1);
    return items.slice(0, limit);
  }

  /**
   * Build SPEC v0.2 frontmatter from a listing item.
   * V1 uses only listing data (title + URL + pdf_url). V2 will fetch detail page
   * for full text + signatory + gazette ref.
   */
  buildFrontmatter(item: ListingItem, publicationDate: string): SpecFrontmatter {
    const identifier = this.deriveIdentifier(item);
    return {
      title: item.title,
      identifier,
      country: "pe",
      rank: this.options.rankCode,
      publication_date: publicationDate,
      last_updated: publicationDate,
      status: "in_force",
      source: item.detail_url,
      jurisdiction: this.options.ir.iso_code,
      scope: "Regional",
      issuing_entity: `Gobierno Regional de ${this.options.ir.jurisdiction.replace(/^region/, "").toUpperCase()}`,
      ...(item.pdf_url ? { pdf_url: item.pdf_url } : {}),
      gob_pe_slug: this.options.ir.jurisdiction,
    };
  }

  /**
   * Derive a SPEC v0.2 identifier from the detail URL.
   *
   * Detail URL example: https://www.gob.pe/institucion/regioncusco/normas-legales/12345-OR-001-2025-GRC-CR
   * → returns "OR-001-2025-GRC-CR"
   *
   * Fallback: extract the trailing slug after the numeric id.
   */
  private deriveIdentifier(item: ListingItem): string {
    const m = item.detail_url.match(/\/normas-legales\/\d+-([A-Za-z0-9-]+)/);
    if (m && m[1]) {
      return m[1].toUpperCase();
    }
    // Last-ditch: use whole path tail
    const path = item.detail_url.split("/").pop() ?? "";
    return path.toUpperCase();
  }
}
