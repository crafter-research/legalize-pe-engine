# legalize-pe-engine

> Engine for [`crafter-research/legalize-pe`](https://github.com/crafter-research/legalize-pe).
> **Pre-1.0: expect breaking changes.** Not production-ready.

CLI, web app, API, MCP server, and scraper packages that produce and serve the
public Peruvian legal corpus — **21,244 norms** (11,045 national + 10,199
regional across 26 jurisdictions). Output follows [SPEC v0.2](https://github.com/legalize-dev/legalize/blob/main/SPEC.md)
and stays interoperable with the [legalize.dev](https://legalize.dev) federation.

Commits to the corpus repo are authored by `Crafternauta <the.crafter.station@gmail.com>` (bot identity), with the norm's real publication date. Engine repo commits use individual contributors' identities.

## Why two repos?

- **Corpus** lives at [`crafter-research/legalize-pe`](https://github.com/crafter-research/legalize-pe): clean Markdown plus git history, listable from the upstream hub.
- **Engine** (this repo) holds the code that produces the corpus. Monorepo (Turborepo) so CLI + web + API + MCP + packages share dependencies.

Korea pattern (`legalize-kr/legalize-kr` ↔ `legalize-kr/compiler`): same corpus/engine split.

## Layout

| Path | Role |
|---|---|
| `apps/cli/` | `legalize-pe-recon` CLI — the corpus-building toolchain (see Commands) |
| `apps/web/` | [legalize-pe.crafter.ing](https://legalize-pe.crafter.ing) (Astro + PWA, ingests from the corpus repo; routes laws by a unique path-derived id) |
| `apps/api/` | API routes for corpus history and norm lookup |
| `apps/mcp/` | MCP server exposing the corpus to LLM clients (Claude, Cursor, Codex) over stdio |
| `packages/core/` | Base classes, SPEC v0.2 types, frontmatter schema, bot identity |
| `packages/parser/` | HTML to Markdown, PDF to text |
| `packages/git-publisher/` | `simple-git` wrapper that commits to the corpus repo with SPEC trailers |
| `packages/git-reader/` | Reads corpus git history (local + GitHub fallback) for the history API |
| `packages/recon/` | `agent-browser` runtime for scraping |
| `packages/jurisdictions/` | Per-jurisdiction declarations |
| `recon/*.ir.json` | Persisted IRs, one per jurisdiction. Hand-drafted from `agent-browser` snapshots. |

## Quickstart

```bash
bun install
bun cli --help
bun run test        # vitest across packages
bun run lint        # biome (CI-gated)
bun run typecheck
```

## Commands

```bash
# National tier — SPIJ free-access API (real dates, no OCR)
bun cli spij crawl --corpus ../legalize-pe        # recursive materia-index crawl -> corpus
bun cli spij fetch <normId>                       # one structured norm

# Regional tier — gob.pe (26 jurisdictions)
bun cli discover-types --all                      # classify each jurisdiction's listing types
bun cli regional fanout --corpus ../legalize-pe   # publish all 26 jurisdictions' norms
bun cli regional fulltext --iso pe-tac --corpus ../legalize-pe  # enrich bodies from gob.pe PDFs

# Constitution timeline + catalog
bun cli path-colombia --corpus ../legalize-pe     # 32-commit history of pe/CON-1993.md
bun cli catalog ingest                            # El Peruano dispositivos-legales -> SQLite (coverage denominator)

# Serve / expose
bun --cwd apps/web dev                            # web app
LEGALIZE_PE_CORPUS=../legalize-pe bun apps/mcp/src/server.ts   # MCP server (see apps/mcp/README.md)
```

## Status

| Slice | Status |
|---|---|
| Monorepo bootstrap + corpus split | Shipped |
| National corpus — SPIJ free-tier crawl | Shipped, **11,045** norms, real publication dates |
| Regional tier — gob.pe fanout, 26 jurisdictions | Shipped, **10,199** norms (metadata + source) |
| Regional full-text | In progress — born-digital PDFs via `pdftotext`; scanned PDFs need an OCR pass |
| Web app | Shipped at [legalize-pe.crafter.ing](https://legalize-pe.crafter.ing) |
| MCP server | Shipped (`apps/mcp/`) — search / get / history / jurisdictions |
| Constitution 1993 timeline | Shipped, 32-commit history |
| Verification baseline (lint + vitest + CI) | Shipped — green gate on every push |
| Federation PR to `legalize-dev/legalize` hub | Open, [PR #17](https://github.com/legalize-dev/legalize/pull/17) |

## Stack

- Bun 1.3+ (never npm)
- Turborepo 2.x
- Biome (no ESLint, no Prettier)
- TypeScript strict mode
- Astro 5 (web), `@modelcontextprotocol/sdk` (MCP), `agent-browser` 0.27+ (recon)

## License

Code: [MIT](./LICENSE).
Generated content (in the corpus repo): public domain under DLeg 822 Art. 9 — Peruvian copyright law excludes official texts from copyright protection.
