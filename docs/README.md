# legalize-pe documentation

Design, architecture, and roadmap for the Peruvian legal corpus project.

| Document | Audience | What's in it |
|---|---|---|
| [vision.md](./vision.md) | Anyone | Why this project exists, who it's for, what makes it different |
| [architecture.md](./architecture.md) | Contributors, reviewers | Two-repo split (corpus + engine), 3-fetcher strategy, SPEC v0.2 conformance |
| [data-sources.md](./data-sources.md) | Contributors, govtech researchers | SPIJ, El Peruano, datos abiertos catalog, gob.pe per-institution |
| [roadmap.md](./roadmap.md) | Anyone | Current status (V1 shipped) and what's next (V2, V3) |
| [contributing.md](./contributing.md) | Contributors | How to add a jurisdiction, conventions, bot identity |
| [decisions.md](./decisions.md) | Anyone curious why | Architecture Decision Records (concise) |

## Quickstart

- Browse the corpus: https://legalize-pe.crafter.ing
- Clone the corpus: `git clone https://github.com/crafter-research/legalize-pe.git`
- Engine repo (this one): https://github.com/crafter-research/legalize-pe-engine

```bash
git clone https://github.com/crafter-research/legalize-pe-engine.git
cd legalize-pe-engine
bun install
bun cli --help
```

## Project status

| Slice | Status |
|---|---|
| V1.1 Monorepo bootstrap + corpus split | Shipped |
| V1.2 National corpus migration to SPEC v0.2 | Shipped, 1,622 national Markdown files |
| V1.3 Cusco pioneer fetcher (5 ordenanzas) | Shipped |
| V1.4 Web app migration (Astro + PWA) | Shipped, live at legalize-pe.crafter.ing |
| V1.5 PR to legalize-dev federation | Open, [PR #17](https://github.com/legalize-dev/legalize/pull/17) |
| Path Colombia for Constitution 1993 | Shipped, 32 commits timeline 1993 to 2024 |
| V2 Tier 1 (27 regional jurisdictions) | Planned |
| V3 Tier 2 (196 provincial) and Tier 3 (1,695 district) | Planned |

## Federation

This project participates in the [legalize.dev federation](https://github.com/legalize-dev/legalize) using the Korea pattern: corpus is published in an independent org (`crafter-research`) and listed in the federation hub. Output follows [SPEC v0.2](https://github.com/legalize-dev/legalize/blob/main/SPEC.md) and stays interoperable with the federation's tooling.

## License

Code (this repo): MIT.
Generated corpus content: public domain per Decreto Legislativo 822, Art. 9 (Peruvian copyright law explicitly excludes official state texts).
