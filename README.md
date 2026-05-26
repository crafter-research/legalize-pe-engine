# legalize-pe-engine

> Engine for [`crafter-research/legalize-pe`](https://github.com/crafter-research/legalize-pe).
> **Pre-1.0: expect breaking changes.** Not production-ready.

Recon CLI, web app, API, and scraper packages that produce the public Peruvian legal corpus. Output follows [SPEC v0.2](https://github.com/legalize-dev/legalize/blob/main/SPEC.md) and stays interoperable with the [legalize.dev](https://legalize.dev) federation.

Commits to the corpus repo are authored by `Crafternauta <the.crafter.station@gmail.com>` (bot identity). Engine repo commits use individual contributors' identities.

## Why two repos?

- **Corpus** lives at [`crafter-research/legalize-pe`](https://github.com/crafter-research/legalize-pe): clean Markdown plus git history, listable from the upstream hub.
- **Engine** (this repo) holds the code that produces the corpus. Monorepo (Turborepo) so CLI + web + packages share dependencies.

Korea pattern (`legalize-kr/legalize-kr` ↔ `legalize-kr/compiler`): same corpus/engine split.

## Layout

| Path | Role |
|---|---|
| `apps/cli/` | `legalize-pe-recon` CLI: `discover`, `fetch-all`, `parse`, `audit`, `migrate` |
| `apps/web/` | `legalize-pe.crafter.ing` (Astro + PWA, ingests from corpus repo) |
| `apps/api/` | Next.js API routes for corpus history and norm lookup |
| `packages/core/` | Base classes, SPEC v0.2 types, frontmatter schema |
| `packages/parser/` | HTML to Markdown, PDF to text |
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
| V1.1 Monorepo bootstrap + corpus split | Shipped |
| V1.2 National corpus migration to SPEC v0.2 | Shipped, 1,622 national Markdown files |
| V1.3 Cusco pioneer | Shipped, 5 ordenanzas |
| V1.4 Web app | Shipped at https://legalize-pe.crafter.ing |
| V1.5 PR to `legalize-dev/legalize` hub | Open, [PR #17](https://github.com/legalize-dev/legalize/pull/17) |
| Path Colombia for Constitution 1993 | Shipped, 32 commits timeline |

## Stack

- Bun 1.3+
- Turborepo 2.x
- Biome (no ESLint, no Prettier)
- TypeScript strict mode
- agent-browser 0.27+

## License

Code: [MIT](./LICENSE).
Generated content (in the corpus repo): public domain under DLeg 822 Art. 9 because Peruvian copyright law excludes official texts from copyright protection.
