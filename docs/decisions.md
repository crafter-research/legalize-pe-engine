# Decisions

Architecture Decision Records. Concise. Each one captures a decision, the alternatives, and why this one won.

## 1. Korea pattern over UK pattern

**Decision**: corpus repo lives in `crafter-research/`, not `legalize-dev/`. Listed in the federation hub README under "Community".

**Alternatives considered**: UK pattern (transfer corpus to `legalize-dev/legalize-pe`, accept federation governance and the shared `legalize-pipeline` Python engine).

**Why this one**: the engine stack we want to use (TypeScript and Bun) differs from the upstream's Python pipeline. Korea (`legalize-kr/legalize-kr`, 1,348 stars) demonstrates that a separate org maintaining SPEC-compliant output works fine and gets listed in the hub.

## 2. Two-repo split: corpus and engine

**Decision**: corpus is a clean Markdown plus git repository. Engine is a separate Turborepo monorepo with CLI, web, and packages.

**Alternatives considered**: single repo with `apps/` and `leyes/` together (the original layout).

**Why this one**: the corpus needs to be cloneable as data, listable by the federation, and free of code dependencies. Mixing code and data made `git clone` heavy and the federation listing awkward.

## 3. Bot identity (Crafternauta) for all corpus commits

**Decision**: all corpus commits are authored by `Crafternauta <the.crafter.station@gmail.com>`. Human contributors author commits in the engine repo.

**Alternatives considered**: human author for everything (mixes pipeline-generated commits with human work and floods individual GitHub contribution graphs with thousands of bot commits).

**Why this one**: clear audit trail. `git log --author=Crafternauta -- pe/` shows pipeline output. `git log --author=<human>` shows hand corrections. Engine repo keeps individual contribution credit.

## 4. agent-browser as the recon engine, webctl deferred

**Decision**: scraping uses `agent-browser` (snapshot to JSON, hand-tuned IR persisted, zero-LLM runtime).

**Alternatives considered**: webctl (designed for interactive SaaS apps, classifies pages by accessibility tree state).

**Why this one**: webctl v0 classifies the four legal portal profiles we tested as "Inconclusive (low confidence)" and produces 1 to 7 trivial operations. Static document listings are outside its current sweet spot. agent-browser snapshots are 12 KB JSON, structured, and trivially parsed.

We will reconsider webctl when it ships a static-listing classifier.

## 5. Three fetcher classes, not 27 uniform scrapers

**Decision**: `packages/jurisdictions/` declares per-jurisdiction parameters on top of three reusable fetcher classes: `GobPeFetcher`, `StaticDirectoryFetcher`, `CatalogCrossrefFetcher`.

**Alternatives considered**: one scraper per regional government (27 separate code paths).

**Why this one**: empirical work on five regional governments showed that they classify their norms differently in `gob.pe` and have heterogeneous portal patterns. A single uniform scraper would not work, and 27 hand-written scrapers would be unmaintainable.

## 6. SPEC v0.2 strict conformance, English frontmatter

**Decision**: frontmatter fields are in English per SPEC v0.2. Commit messages and trailers are in English.

**Alternatives considered**: Spanish frontmatter (`titulo`, `identificador`, `rango`, etc.) for local readability, English-only for federation interop.

**Why this one**: interop with `legalize.dev` tools requires English. SPEC v0.2 is explicit about this. The norm body remains in Spanish (it is legally normative text), and rank labels are rendered in Spanish in the web UI via `rangoLabels`. Best of both: machine-readable English, human-readable Spanish display.

## 7. Path Colombia V1: timeline only, text reconstruction deferred

**Decision**: the Constitution timeline is 32 git commits (one `[bootstrap]` plus 31 `[reform]`), each bumping `last_updated` and `applied_reforms` to produce real diffs. The article body is the current consolidated text, not the post-each-reform text.

**Alternatives considered**: (a) ship without a timeline, single `[bootstrap]` commit; (b) source the original 1993 text and apply reforms forward.

**Why this one**: option (a) loses the differentiating feature. Option (b) requires sourcing the original 1993 text from a verifiable archive, which is a substantial separate effort. V1 ships the timeline. V2 will reconstruct text.

## 8. No backward compatibility

**Decision**: V1 broke the previous parser, frontmatter language, layout (`leyes/pe/`), and commit message convention. No shim, no dual-format support.

**Alternatives considered**: keep both Spanish and English parsers, both layouts, for a transition period.

**Why this one**: the project was not publicly used yet. The cost of running two parallel systems would have outweighed any benefit. The clean cut took one evening and produced a coherent V1.

## 9. Pre-1970 epoch hack

**Decision**: norms published before 1970 use `1970-01-02T00:00:00Z` as the git author date. The real date stays in the frontmatter `publication_date` and the `Source-Date` trailer.

**Alternatives considered**: skip pre-1970 norms entirely, or use creative date encoding.

**Why this one**: git rejects author dates before the Unix epoch. Colombia (`legalize-co`) hit the same issue and uses the same workaround. The trailer carries the real date, so no information is lost.

## 10. Accept legacy date imprecision in the inherited corpus

**Decision**: ~197 national norms (12 percent of the V1 corpus) have a `publication_date` in 2026 that reflects the day they were scraped, not the day the norm was actually published. V1 ships them as-is; V2 will re-scrape from authoritative sources to recover the real dates.

**Context**: the original `crafter-research/legalize-pe` corpus was assembled by Shiara in early 2026 via ad-hoc scrapers that did not consistently capture the real `publication_date` from source pages. The V1.2 migration faithfully preserved whatever date the legacy frontmatter had, including these placeholders. Examples found during the V1 web review:

- `pe/DLEG-563-2026.md` has `publication_date: 2026-04-07` but the title itself reads "4 de abril de 1990". The norm is from 1990.
- `pe/LEY-11585-2026.md` has `publication_date: 2026-04-07` but the title says "El Distrito de Pazos fue creado el 31 de enero del 1951".
- `pe/DU-019-2023.md` has `publication_date: 1825-10-22` (Peruvian Independence Day used as a sentinel by the original scraper).

**Alternatives considered**:

- (a) Block V1 release until every legacy date is verified. Rejected - would push the federation listing back weeks for a documentation quality issue, not a corpus integrity issue. The text of each norm is still correct; only the metadata date is suspect.
- (b) Re-derive dates from the source URL via OCR on the original PDF. Rejected for V1 - most gov.pe PDFs are scans (verified during V1.4 detail-page work), so OCR would require Tesseract + per-source post-processing, which is V2 scope.
- (c) Strip the questionable dates and ship `publication_date: null`. Rejected - SPEC v0.2 requires `publication_date`, and "null" is worse than "best-effort" for downstream consumers who can flag and verify.

**Why this one**: the corpus is a snapshot, not a claim of authority. Downstream consumers can grep `publication_date: '2026-` and decide for themselves. The V2 re-scrape will rewrite the affected norms with a `[correction]` commit each, preserving the audit trail.

**Tracked**: github.com/crafter-research/legalize-pe-engine issue (filed 2026-05-19).

## 11. Vercel deploy from local prebuilt, not CI build

**Decision**: V1 deploy uses `vercel build` and `vercel deploy --prebuilt` from the engineer's machine. CI builds will come in a follow-up.

**Alternatives considered**: full CI deploy via GitHub Actions or Vercel's git integration with a build step.

**Why this one**: CI builds require the corpus repo to be available at build time. Options are submodule (heavy), build-time clone via GitHub API (network dependency), or shipping with the build already done. For V1 the prebuilt option ships now. CI will be added when daily updates require it.
