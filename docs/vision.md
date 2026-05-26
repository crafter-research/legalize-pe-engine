# Vision

## The problem

Peruvian legislation is published, but it is not accessible as machine-readable, version-controlled data.

A citizen, lawyer, journalist, or AI agent that needs to know **which legal rules apply to them** faces five barriers:

1. **No single place to search.** SPIJ (the state's legal information system) covers national legislation reasonably well, but sub-national norms are opaque. El Peruano gazette publishes only what is sent to it (partial). Each of the 1,919 issuing authorities has its own portal with its own schema.
2. **No unified schema.** Every regional government and municipality publishes PDFs with its own conventions. Cross-jurisdictional full-text search is impossible.
3. **No verifiable history.** "When did this ordinance change?" has no answer. Reforms are new PDFs unlinked to the previous version.
4. **No API.** What exists is per-portal scraping. Commercial providers (e.g., `normaslegalesonline.pe`) charge for what is legally public domain (Decreto Legislativo 822, Art. 9).
5. **Peru is absent from the global movement.** [legalize.dev](https://legalize.dev) has 36 countries; Brazil has an open issue; Peru was a blank space.

## What we are building

A two-repo system:

- **Corpus** ([`crafter-research/legalize-pe`](https://github.com/crafter-research/legalize-pe)) - every Peruvian legal norm as a Markdown file with YAML frontmatter, following [SPEC v0.2](https://github.com/legalize-dev/legalize/blob/main/SPEC.md). Every reform is a git commit with the real publication date.
- **Engine** (this repo) - the CLI, web app, scrapers, and recon IRs that produce and publish the corpus.

The corpus is interoperable with the [legalize.dev federation](https://github.com/legalize-dev/legalize) (Korea-style listing). Anyone can:

- `git clone` to get the full corpus offline
- `git log pe/CON-1993.md` to see the Constitution's reform timeline
- `git diff <commit1>..<commit2>` to compare versions
- Use the corpus as training data, research input, or LLM context

## Who it is for

| Audience | Use |
|---|---|
| Citizens | Read what laws apply, with their amendment history visible |
| Lawyers and researchers | Reproducible references with exact version pinning via commit hashes |
| Journalists | Compare legal regimes across time and across regions |
| AI agents and tooling | Structured input that does not require scraping per query |
| Civic-tech developers | Build on top of a clean corpus instead of re-scraping |
| Other Global South projects | Reuse the methodology and 3-fetcher strategy for their country |

## What makes it different

### Sub-national coverage

Peru has **1,919 legally distinct issuing authorities**: 25 regional governments, Lima Metropolitana, Callao, 196 provincial municipalities, and 1,695 district municipalities. Existing solutions (SPIJ included) cover national legislation decently and almost nothing below it. A 2020 study found only 1 of 25 regional governments meets open-data principles. This project is the first attempt at a cohesive sub-national legal corpus aggregation for a Global South country.

### Full Constitution timeline

The Peruvian Constitution of 1993 has been amended 31 times. Each reform is a separate law published on a specific date. In this project, `git log pe/CON-1993.md` returns 32 commits with real author dates from 1993-12-30 to 2024-12-11. No other country in the federation has a constitution this granularly versioned.

### Three-fetcher cascade

Empirical work shows that Peruvian institutions classify their norms differently in `gob.pe`. A single uniform scraper does not work. The engine ships three fetcher classes:

| Fetcher | When to use |
|---|---|
| `GobPeFetcher` | Institutions that publish to `gob.pe/institucion/{slug}/normas-legales/tipos/{type_id}-{slug}` (confirmed: Lima Metropolitana, Cusco) |
| `StaticDirectoryFetcher` | Apache directory listings or WordPress uploads with predictable PDF paths (confirmed: Tumbes, Moquegua) |
| `CatalogCrossrefFetcher` | Portals returning HTTP 403 - discovery comes from the El Peruano CSV catalog (confirmed: Áncash, Puno) |

### Agent-first engineering

Every step of the pipeline is invocable from a CLI:

```bash
bun cli discover <url>                                    # snapshot a portal listing
bun cli fetch-all --jurisdiction regioncusco --limit 5    # extract via persisted IR
bun cli migrate --corpus ../legalize-pe                   # batch transform legacy data
bun cli path-colombia --corpus ../legalize-pe             # rebuild Constitution timeline
```

The recon step writes an IR (`recon/{slug}.ir.json`) that is hand-tuned once per jurisdiction. Runtime extraction is then zero-LLM and reproducible.

## Non-goals

This project does not aim to:

- Replace SPIJ or El Peruano as authoritative sources.
- Provide legal advice.
- Cover the 1,695 district municipalities in V1.
- Auto-translate legislation to other languages.
- Build a commercial product. The corpus is and will remain public domain.
