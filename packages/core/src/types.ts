/**
 * SPEC v0.2 types. https://github.com/legalize-dev/legalize/blob/main/SPEC.md
 */

export type SpecStatus = "in_force" | "repealed" | "partially_repealed" | "annulled" | "expired";

export type CommitType = "bootstrap" | "reform" | "new" | "repeal" | "correction" | "fix-pipeline";

/**
 * The 8 mandatory frontmatter fields per SPEC v0.2.
 * All other fields are country-specific extensions and live flat (not under `extra:`).
 */
export interface SpecFrontmatter {
  title: string;
  identifier: string;
  country: "pe";
  rank: string;
  publication_date: string; // ISO date YYYY-MM-DD
  last_updated: string; // ISO date
  status: SpecStatus;
  source: string; // URL

  // Peru-specific extensions (flat)
  jurisdiction?: string; // "pe" | "pe-ama" | ... | "pe-uca" | "pe-lim" | "pe-cal"
  scope?: "Nacional" | "Regional" | "Provincial" | "Distrital";
  issuing_entity?: string;
  official_journal?: string;
  gazette_reference?: string;
  affected_articles?: string[];
  gob_pe_slug?: string;
  pdf_url?: string;
  el_peruano_id?: number;
}

export interface SpecTrailers {
  "Source-Id": string;
  "Source-Date": string; // ISO date
  "Norm-Id": string;
}

export interface SpecCommit {
  type: CommitType;
  title: string;
  articles_affected?: string[];
  trailers: SpecTrailers;
  author_date: Date; // real publication date; pre-1970 hack handled by publisher
}

/**
 * A norm is a single legal document. Composed of frontmatter + Markdown body.
 */
export interface Norm {
  frontmatter: SpecFrontmatter;
  body: string;
}

/**
 * Listing item returned by a fetcher during discovery.
 */
export interface ListingItem {
  detail_url: string;
  title: string;
  pdf_url?: string;
  publication_date?: string;
  identifier_hint?: string;
}

/**
 * Recon IR — Intermediate Representation persisted at recon/{slug}.ir.json.
 * Hand-written from agent-browser snapshots. Zero LLM at runtime.
 */
export interface ReconIR {
  ir_version: "0.1.0";
  jurisdiction: string;
  iso_code: string; // "pe-cus", "pe-lim", etc.
  fetcher_type: "gob-pe" | "static-directory" | "catalog-crossref";
  listing: {
    url: string;
    pagination_strategy?: "page_query_param" | "offset_query_param" | "infinite_scroll" | "none";
    pagination_param?: string;
    items_per_page?: number;
    ref_pattern: Record<string, RefPattern>;
  };
  detail?: {
    url_pattern?: string;
    ref_pattern?: Record<string, RefPattern>;
  };
  rate_limit: { rps: number; max_concurrent: number };
  user_agent: string;
  respects_robots_txt: boolean;
}

export interface RefPattern {
  role?: string;
  name_equals?: string;
  name_contains?: string;
  url_pattern?: string;
  follows?: string;
  extracts?: string[];
  regex?: string;
  post_process?: string;
}
