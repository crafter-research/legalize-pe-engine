# AGENTS.md

Operational guide for AI coding agents working on this repo (Claude, Codex, Cursor, Aider, Continue, etc.).

This is the single source of truth for agent conventions. Tool-specific files (`CLAUDE.md`, `.cursorrules`, etc.) should point here, not duplicate.

## TL;DR for any agent in 10 lines

1. This is the engine for `crafter-research/legalize-pe` (corpus). Two repos, one project. See [docs/architecture.md](./docs/architecture.md).
2. Engine commits use Hunter's normal git identity. Corpus commits MUST use `Crafternauta <the.crafter.station@gmail.com>` with real publication date.
3. Output (corpus files) MUST follow [SPEC v0.2](https://github.com/legalize-dev/legalize/blob/main/SPEC.md). English frontmatter, English commit types, Spanish norm body.
4. Stack: Bun 1.3+, Turborepo, Biome (no ESLint, no Prettier), TypeScript strict.
5. Scraping uses `agent-browser` (not webctl, deferred). One IR per jurisdiction in `recon/{slug}.ir.json`. Zero-LLM at runtime.
6. Three fetcher classes in `packages/jurisdictions/fetchers/`. Never write a fourth unless you have empirical evidence the existing three do not fit.
7. Never use em dashes (`—`) in commit messages, PR descriptions, READMEs, or external text.
8. Never add `Co-Authored-By: Claude` (or any AI) to git commits.
9. Always probe data sources empirically before designing. Do not assume schema.
10. When in doubt: read [docs/](./docs/). Spec answers live there.

## Repository layout

```
apps/
├── cli/                Bun + Commander CLI: discover / fetch-all / migrate / bootstrap-corpus / path-colombia
└── web/                Astro 5 + PWA. Reads corpus from ../../../legalize-pe/pe/*.md
packages/
├── core/               SPEC v0.2 types, identifier helpers, bot identity
├── parser/             HTML to Markdown, PDF text extraction
├── recon/              agent-browser wrapper + runtime IR engine
├── git-publisher/      simple-git wrapper that commits to corpus with Crafternauta identity
├── git-reader/         read-only git ops for web API routes
└── jurisdictions/      per-GR declarations + 3 fetcher classes
recon/                  persisted IRs (one .json per jurisdiction)
data/                   datos abiertos CSV catalog ingest
audit/                  migration mapping + recovery reports
docs/                   external-facing design + decisions
```

Corpus repo lives at `crafter-research/legalize-pe`. Default working assumption: it is cloned as a sibling directory at `../legalize-pe/`.

## Identity rules (critical)

| Context | Author | Email |
|---|---|---|
| Engine repo commits | Your normal git identity | Same |
| Corpus repo commits (any push from engine) | `Crafternauta` | `the.crafter.station@gmail.com` |
| Pull request descriptions, README author lines | `Railly Hugo` (full legal name) | n/a |
| GitHub mentions | `@Railly` | n/a |

**Never** write "Hunter Quispe" anywhere external-facing. "Hunter" is an internal nickname; the public name is Railly Hugo.

## Corpus commit format

Subject line:

```
[<type>] <Title>[ arts. <comma-separated>]
```

Trailers (required):

```
Source-Id: <reform-id-or-norm-id>
Source-Date: YYYY-MM-DD
Norm-Id: <norm-id-the-commit-affects>
```

Types per SPEC v0.2: `bootstrap`, `reform`, `new`, `repeal`, `correction`, `fix-pipeline`.

Author date and committer date = real publication date. For norms before 1970-01-01 (git's epoch lower bound), use `1970-01-02T00:00:00Z` as the git date but keep the real date in `publication_date` (frontmatter) and `Source-Date` (trailer). Example: Código Civil de 1936 → git date 1970-01-02, `publication_date: 1936-XX-XX`.

Programmatic example:

```typescript
const env = {
  PATH: process.env.PATH ?? "",
  HOME: process.env.HOME ?? "",
  GIT_AUTHOR_NAME: "Crafternauta",
  GIT_AUTHOR_EMAIL: "the.crafter.station@gmail.com",
  GIT_AUTHOR_DATE: gitSafeAuthorDate(publicationDate),
  GIT_COMMITTER_NAME: "Crafternauta",
  GIT_COMMITTER_EMAIL: "the.crafter.station@gmail.com",
  GIT_COMMITTER_DATE: gitSafeAuthorDate(publicationDate),
};
```

`gitSafeAuthorDate` lives in `@legalize-pe/core` (`packages/core/src/bot.ts`).

**Do NOT** include the full env (`...process.env`) when calling `simple-git`'s `.env()`. It inherits `GIT_EDITOR` which simple-git rejects as unsafe. Allowlist `PATH` and `HOME` only.

## SPEC v0.2 frontmatter

Mandatory 8 fields, English keys:

```yaml
---
title: "Full official title"
identifier: "ID-UPPERCASE-WITH-YEAR"
country: "pe"
rank: "rank_in_snake_case"
publication_date: "YYYY-MM-DD"
last_updated: "YYYY-MM-DD"
status: "in_force | repealed | partially_repealed | annulled | expired"
source: "https://official-source-url"
---
```

Peru-specific extensions are flat (no nesting under `extra:`): `jurisdiction`, `scope`, `issuing_entity`, `official_journal`, `gazette_reference`, `affected_articles[]`, `gob_pe_slug`, `pdf_url`, `el_peruano_id`.

Identifier conventions:

| Rank | Pattern | Example |
|---|---|---|
| Constitution | `CON-YYYY` | `CON-1993` |
| Reforma constitucional | `LEY-REFORMA-NNNNN-YYYY` | `LEY-REFORMA-30305-2015` |
| Ley | `LEY-NNNNN-YYYY` | `LEY-30220-2014` |
| Decreto Legislativo | `DLEG-NNNN-YYYY` | `DLEG-295-1984` |
| Decreto Supremo | `DS-NNN-YYYY-SECTOR` | `DS-006-2014-MINEDU` |
| Ordenanza Regional | `OR-NNN-YYYY-ISO3CHAR` | `OR-158-2018-CUS` |
| Ordenanza Municipal | `OM-NNN-YYYY-MUNI` | `OM-045-2024-MDV` |

Status mapping ES → EN (used by migration script):
- `vigente` → `in_force`
- `modificada` → `in_force` (still in force, just amended)
- `derogada` → `repealed`
- `abrogada` → `repealed`
- `anulada` → `annulled`
- `expirada` → `expired`

## Adding a jurisdiction

The full guide is at [docs/contributing.md](./docs/contributing.md). Short version:

1. `bun cli discover "https://www.gob.pe/institucion/{slug}/normas-legales/tipos/13-ordenanza"`
2. Inspect the agent-browser snapshot. Identify URL patterns for listing, detail, PDF.
3. Pick one of three fetcher classes:
   - `GobPeFetcher` if institution publishes to `gob.pe` with the expected type code
   - `StaticDirectoryFetcher` for Apache or WordPress with public uploads
   - `CatalogCrossrefFetcher` for portals returning 403 (driven by datos abiertos CSV)
4. Write `recon/{slug}.ir.json` by hand. See `recon/regioncusco.ir.json` as reference.
5. Add `packages/jurisdictions/{slug}.ts` (target ~50 LOC).
6. `bun cli fetch-all --jurisdiction {slug} --limit 5 --corpus ../legalize-pe`
7. `./apps/cli/src/scripts/run-bootstrap.sh ../legalize-pe ./fetch-plan.tsv`
8. Verify in `../legalize-pe/pe-{iso}/`.

Different regional governments classify their norms differently on `gob.pe`. Lima and Cusco use type 13 (`ordenanza`); Áncash and Tumbes use type 41 (`decreto-regional`); Puno uses type 79 (`acuerdo-regional`). Always probe before assuming.

## Scraping etiquette

- User agent: `legalize-bot/1.0 (+https://github.com/crafter-research/legalize-pe)`. Live in `@legalize-pe/core` as `USER_AGENT` constant.
- Rate limit: at most 2 requests per second per portal (most are tolerant of higher; benchmark before raising).
- Respect `robots.txt`.
- Cache aggressively. Each norm should be fetched once.

## Pipeline performance lessons

The bootstrap step (one git commit per norm, 1,617 commits for the national corpus) takes ~84 seconds when the loop is a bash `while` driving raw `git` commands. The same loop driven by `simple-git`'s `.env().commit()` from TypeScript took >30 minutes in our tests due to per-iteration process spawn overhead. For bulk commit operations, generate a TSV plan in TypeScript and consume it from `./apps/cli/src/scripts/run-bootstrap.sh`.

## Things that have already failed (do not retry without new info)

| Attempt | What failed | Reason |
|---|---|---|
| `webctl recon` on 4 portals | All returned "Inconclusive (low confidence)" | webctl v0 targets interactive SaaS, not static document listings |
| `simple-git` with `...process.env` | Hangs or rejects with "unsafe `GIT_EDITOR`" | simple-git refuses inherited `GIT_EDITOR`. Allowlist `PATH` + `HOME` only. |
| `Object.entries(refs)` in IR runtime | Wrong sibling matching | JavaScript preserves insertion order which is unreliable across snapshots. Sort by numeric ref id. |
| Vercel `vercel deploy` from `apps/web/` | `apps/web/apps/web` path error | Vercel project has `rootDirectory: "apps/web"` and applies it relative to cwd. Deploy from engine root. |
| Plan TSV with shared dates | Second commit fails "nothing to commit" | Reformas on the same date produce identical diffs. Frontmatter must change between commits (we use `applied_reforms[]` array). |
| Migrating ordinary laws with JS Date frontmatter | 5 norms skipped silently | gray-matter parses some YAML dates into Date objects. `normalizeDate` must accept `Date` instances, not only strings. |

## What NOT to do

- Do not write a fourth fetcher class. Three already cover the observed patterns.
- Do not transfer the corpus to `legalize-dev/`. Korea pattern, separate org, listed in hub README. Decided in ADR-1.
- Do not migrate the engine to Python. TS/Bun stack is decided. The engine's job is producing SPEC v0.2 output; how it does that is our choice. Decided in ADR-4.
- Do not add backward compatibility shims for Spanish frontmatter or the old `leyes/pe/` layout. The cut was clean in V1.4. Decided in ADR-8.
- Do not commit em dashes (`—`) in any external text (commit messages, PR descriptions, READMEs).
- Do not add `Co-Authored-By: Claude` (or other AI tags) to commits.
- Do not invent identifiers without the year suffix. See identifier conventions above.

## Local development

```bash
bun install
bun cli --help

# Web dev server (requires sibling corpus repo at ../legalize-pe)
bun --cwd apps/web dev

# Lint
bun run lint
bun run lint:fix
```

For Vercel deploy: see [docs/architecture.md#web-app](./docs/architecture.md) and the entry "Vercel deploy from local prebuilt" in [docs/decisions.md](./docs/decisions.md).

## When in doubt

- Architecture, why-decisions: [docs/](./docs/)
- SPEC questions: https://github.com/legalize-dev/legalize/blob/main/SPEC.md
- Federation: https://github.com/legalize-dev/legalize
- Active maintainer: [@Railly](https://github.com/Railly)
