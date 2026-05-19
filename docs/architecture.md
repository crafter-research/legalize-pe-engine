# Architecture

## Two-repo split

```
crafter-research/legalize-pe              crafter-research/legalize-pe-engine
(corpus, public, listed in hub)           (engine, public pre-1.0)

pe/*.md                                   apps/
pe-{iso}/*.md                             ├── cli/    legalize-pe-recon CLI
audit-trail/                              └── web/    legalize-pe.crafter.ing
                                          packages/
                                          ├── core/             SPEC v0.2 types
                                          ├── parser/           HTML/PDF to MD
                                          ├── recon/            agent-browser runtime
                                          ├── git-publisher/    Crafternauta bot commits
                                          ├── git-reader/       read git history
                                          └── jurisdictions/    per-GR declarations
                                          recon/
                                          └── {slug}.ir.json    persisted IRs
                                          data/
                                          └── catalog.json      datos abiertos ingest
```

Why two repos: the corpus stays a clean Markdown plus git repository so the [legalize.dev hub](https://github.com/legalize-dev/legalize) can link to it and anyone can `git clone` to get just the data. The engine holds all the code, infra, and intermediate artifacts. This mirrors the Korea pattern (`legalize-kr/legalize-kr` corpus and `legalize-kr/compiler` engine).

## SPEC v0.2 conformance

Every file in the corpus follows [SPEC v0.2](https://github.com/legalize-dev/legalize/blob/main/SPEC.md):

### Mandatory frontmatter (8 fields)

```yaml
---
title: "Full official title of the norm"
identifier: "ID-IN-UPPERCASE-WITH-YEAR"
country: "pe"
rank: "rank_in_snake_case"
publication_date: "YYYY-MM-DD"
last_updated: "YYYY-MM-DD"
status: "in_force | repealed | partially_repealed | annulled | expired"
source: "https://official-source-url"
---
```

Peru-specific extensions live flat (not under an `extra:` map):

```yaml
jurisdiction: "pe-cus"           # ISO 3166-2:PE code
scope: "Regional"
issuing_entity: "Gobierno Regional de Cusco"
gazette_reference: "..."
affected_articles: ["191", "194"]
gob_pe_slug: "regioncusco"
pdf_url: "https://cdn.www.gob.pe/uploads/..."
```

### Commit conventions

```
[<type>] <Title>[ arts. <list>]

Source-Id: <reform-or-norm-id>
Source-Date: YYYY-MM-DD
Norm-Id: <norm-id>
```

Types: `bootstrap`, `reform`, `new`, `repeal`, `correction`, `fix-pipeline`.

Author date is the real publication date. Pre-1970 norms use `1970-01-02` as the git author date (git rejects earlier dates) while keeping the real date in the `Source-Date` trailer.

### Bot identity

All commits to the corpus are authored by:

```
Crafternauta <the.crafter.station@gmail.com>
```

Engine commits use individual contributor identities.

## The three fetcher classes

Empirical work on five regional governments (Áncash, Cusco, Tumbes, Puno, Lima Metropolitana) revealed that a single uniform scraper does not work. Each fetcher targets a different access pattern.

### GobPeFetcher

For institutions that publish to `gob.pe/institucion/{slug}/normas-legales/tipos/{type_id}-{type_slug}`. Confirmed working for Lima Metropolitana (type 13 ordenanza, 8+ visible) and Cusco (type 13 ordenanza, 25+ visible).

Listing URL pattern: `https://www.gob.pe/institucion/{slug}/normas-legales/tipos/{type_id}-{type_slug}`
Detail URL pattern: `https://www.gob.pe/institucion/{slug}/normas-legales/{numeric_id}-{slug}`
PDF URL pattern: `https://cdn.www.gob.pe/uploads/document/file/{id}/{filename}.pdf`

### StaticDirectoryFetcher

For institutions that expose Apache directory listings or WordPress upload paths. Confirmed working for Tumbes (Apache static, files like `ORDENANZA_REGIONAL_013_2025.pdf`) and Moquegua (WordPress, `/wp-content/uploads/YYYY/MM/`).

### CatalogCrossrefFetcher

For institutions that return HTTP 403 on directory listing (e.g., Áncash, Puno). Discovery is driven by the El Peruano monthly CSV catalog at [datosabiertos.gob.pe](https://www.datosabiertos.gob.pe/dataset/dispositivos-legales). Per-norm scraping then targets known URL patterns even when the institution does not expose a public listing.

## Recon and runtime

The recon step happens once per jurisdiction:

1. `agent-browser open <listing-url>`
2. `agent-browser wait --load networkidle`
3. `agent-browser snapshot -i -u --json`
4. A human (or LLM) reads the snapshot and writes `recon/{slug}.ir.json` by hand. This IR captures listing URL, pagination strategy, detail URL pattern, PDF URL pattern, rate limit, and user agent.

Runtime extraction is then zero-LLM:

1. CLI reads the IR.
2. `packages/recon/runtime.ts` orchestrates `agent-browser` to fetch each listing page.
3. The IR's `ref_pattern` declares which refs to extract as `(title_link, pdf_link)` pairs.
4. The fetcher class produces SPEC v0.2 frontmatter and body.
5. `packages/git-publisher/` writes the file to the corpus repo and commits it with Crafternauta identity and historical author date.

The webctl tool was considered as the recon engine but does not currently classify static legal document listings (its design targets interactive SaaS apps). We use `agent-browser` for now and may revisit webctl as it matures.

## Web app

`apps/web/` is Astro 5 with the Vercel adapter and a PWA layer (`@vite-pwa/astro`). It reads the corpus from a sibling directory (`../../../legalize-pe/pe/*.md` and `../../../legalize-pe/pe-{iso}/*.md`) and pre-renders one page per norm at build time. The `LEGALIZE_PE_CORPUS` environment variable overrides the corpus path for CI builds.

Search uses `fuse.js` against a build-time index (`public/search-index.json`).

API routes for git history (`/api/normas/{id}/history`, `/diff`, `/at/{commit}`) use `packages/git-reader/`.

## Frontmatter timeline for the Constitution

`pe/CON-1993.md` is special. The file has 32 commits in git history: one `[bootstrap]` at 1993-12-30 and 31 `[reform]` commits, one per amendment, sorted chronologically. Each commit bumps `last_updated` and appends to an `applied_reforms` array in the frontmatter. The current implementation does not reconstruct pre-reform text (the source we have is the consolidated current Constitution); a follow-up will source the original 1993 text and apply reforms forward.

This is unique in the federation: no other country has this level of versioning on its Constitution.
