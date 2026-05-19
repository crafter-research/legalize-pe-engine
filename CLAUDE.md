# legalize-pe-engine

Engine for `crafter-research/legalize-pe`. Produces corpus following [SPEC v0.2](https://github.com/legalize-dev/legalize/blob/main/SPEC.md).

## Identity & commit conventions

- **Engine repo commits**: use Hunter's normal git identity (or whoever runs).
- **Corpus repo commits** (any push from this engine to `crafter-research/legalize-pe`): MUST use Crafternauta bot identity:
  - `GIT_AUTHOR_NAME="Crafternauta"`
  - `GIT_AUTHOR_EMAIL="the.crafter.station@gmail.com"`
  - `GIT_AUTHOR_DATE`: real publication date of the norm
  - Same for `GIT_COMMITTER_*`
- **Pre-1970 epoch hack**: git rejects dates before 1970. For pre-1970 norms (e.g., Código Civil 1936) use `GIT_AUTHOR_DATE=1970-01-02` but keep real `publication_date` in frontmatter and `Source-Date` trailer.

## Commit message format (corpus)

```
[<type>] <Title> — <articles affected or "versión original YYYY">

Source-Id: <reform-id-or-norm-id>
Source-Date: YYYY-MM-DD
Norm-Id: <norm-id>
```

Types per SPEC v0.2: `bootstrap`, `reform`, `new`, `repeal`, `correction`, `fix-pipeline`.

## Stack

- Bun 1.3+
- Turborepo 2.x
- Biome (no ESLint, no Prettier)
- TypeScript strict mode
- agent-browser 0.27+ for scraping

## Conventions

- Frontmatter & commit messages in English (SPEC v0.2)
- Filenames: official identifier in UPPERCASE with year suffix (`DLEG-295-1984.md`, `LEY-30220-2014.md`, `CON-1993.md`)
- Layout flat at corpus root: `pe/`, `pe-ama/` ... `pe-uca/` (25 ISO 3166-2 regional codes + `pe-lim/` Lima Metro + `pe-cal/` Callao)
- All scraping respects robots.txt + UA `legalize-bot/1.0 (+https://github.com/crafter-research/legalize-pe)` + ≤2 rps/portal
- Path-Colombia for Constitution (32 commits reconstruidos from 31 reformas). Single-snapshot for ordinary laws V1.

## Three fetcher classes (V2 target, V1 only GobPeFetcher)

| Class | When to use | Used by |
|---|---|---|
| `GobPeFetcher` | GR publishes to `gob.pe/institucion/{slug}/normas-legales/tipos/{N}-{slug}` | Cusco, Lima Metro |
| `StaticDirectoryFetcher` | Apache directory listing or WP uploads with predictable PDF paths | Tumbes, Moquegua |
| `CatalogCrossrefFetcher` | Portal returns 403 — must use El Peruano CSV catalog as discovery | Áncash, Puno |

Each `packages/jurisdictions/{slug}.ts` declares which fetcher class to use + parameters (~50 LOC).

## SPEC v0.2 frontmatter (mandatory 8 fields)

```yaml
---
title: "<official title>"
identifier: "<UPPERCASE-ID-YEAR>"
country: "pe"
rank: "<rank-string-country-specific>"
publication_date: "YYYY-MM-DD"
last_updated: "YYYY-MM-DD"
status: "in_force | repealed | partially_repealed | annulled | expired"
source: "<url>"
---
```

Extension fields are welcome (flat, not under `extra:`): `jurisdiction`, `scope`, `issuing_entity`, `gazette_reference`, etc.

## References

- Shaping docs: `/Users/raillyhugo/hunter-brain/04_Projects/_active/legalize-pe-v2/`
- SPEC: https://github.com/legalize-dev/legalize/blob/main/SPEC.md
- ADDING_A_COUNTRY: https://github.com/legalize-dev/legalize-pipeline/blob/main/ADDING_A_COUNTRY.md
- Bot identity: Crafternauta (`the.crafter.station@gmail.com`)
