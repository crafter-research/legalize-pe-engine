# legalize-pe-engine

> Engine for [`crafter-research/legalize-pe`](https://github.com/crafter-research/legalize-pe).
> **Pre-1.0 — expect breaking changes.** Not production-ready.

Recon CLI, web app, and scraper packages that produce the public Peruvian legal corpus. Output follows [SPEC v0.2](https://github.com/legalize-dev/legalize/blob/main/SPEC.md) — interoperable with [legalize.dev](https://legalize.dev) federation.

Commits to the corpus repo are authored by `Crafternauta <the.crafter.station@gmail.com>` (bot identity). Engine repo commits use individual contributors' identities.

## Why two repos?

- **Corpus** lives at [`crafter-research/legalize-pe`](https://github.com/crafter-research/legalize-pe) — clean Markdown + git history, listable from the upstream hub.
- **Engine** (this repo) holds the code that produces the corpus. Monorepo (Turborepo) so CLI + web + packages share dependencies.

Korea pattern (`legalize-kr/legalize-kr` ↔ `legalize-kr/compiler`): same corpus/engine split.

## Layout

| Path | Role |
|---|---|
| `apps/cli/` | `legalize-pe-recon` CLI: `discover`, `fetch-all`, `parse`, `audit`, `migrate` |
| `apps/web/` | `legalize.crafter.ing` (Astro + Next.js, ingests from corpus repo) |
| `packages/core/` | Base classes, SPEC v0.2 types, frontmatter schema |
| `packages/parser/` | HTML → Markdown, PDF → text |
| `packages/git-publisher/` | `simple-git` wrapper that commits to corpus repo with SPEC trailers |
| `packages/recon/` | `agent-browser` runtime for scraping |
| `packages/jurisdictions/` | Per-jurisdiction declarations (3 fetcher classes + N declarations) |
| `recon/*.ir.json` | Persisted IRs, one per jurisdiction. Hand-written from `agent-browser` snapshots. |
| `data/catalog.json` | Catalog ingested from datos abiertos (El Peruano + SPIJ) |

## Quickstart

```bash
bun install
bun cli --help
```

## Status (V1)

| Slice | Status |
|---|---|
| V1.1 Monorepo bootstrap + corpus split | 🔄 in progress |
| V1.2 National corpus migration to SPEC v0.2 | ⏳ |
| V1.3 Cusco pioneer (5 ordenanzas) | ⏳ |
| V1.4 Web exposes `/regiones/cusco` | ⏳ |
| V1.5 PR to `legalize-dev/legalize` hub | ⏳ |

## Stack

- Bun 1.3+
- Turborepo 2.x
- Biome (no ESLint, no Prettier)
- TypeScript strict mode
- agent-browser 0.27+

## License

Code: [MIT](./LICENSE).
Generated content (in the corpus repo): public domain (DLeg 822 Art. 9 — Peruvian copyright law excludes official texts from copyright protection).
