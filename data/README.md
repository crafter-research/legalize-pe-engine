# data/

Generated artifacts for the SPIJ national-tier pipeline.

## spij-materia-index.json

The national crawl backbone: seed `H682710` ("Legislación por Materia") →
93 compendio norms. This is the depth-1 frontier produced by:

```bash
bun apps/cli/src/cli.ts spij crawl --max-depth 1 --out data/spij-materia-index.json
```

## Full national crawl (overnight)

Expanding every compendio to its leaf norms is the full enumeration. At the
polite ~1 req/s rate this is a multi-hour job — run it detached:

```bash
# 1. Enumerate all national norm ids (resumable; registry is the checkpoint)
bun apps/cli/src/cli.ts spij crawl --max-depth 3 --out data/spij-registry.json

# 2a. Smoke-test the fetch path to JSON (no corpus writes)
bun apps/cli/src/cli.ts spij fetch --registry data/spij-registry.json --limit 20

# 2b. Publish to the corpus (one Crafternauta commit per norm, SPEC v0.2 Markdown)
bun apps/cli/src/cli.ts spij fetch --registry data/spij-registry.json --corpus ../legalize-pe
```

Notes:
- National norms need **no OCR** — SPIJ serves structured text + real dates via
  `api/detallenorma/{id}`.
- SPIJ free-access covers the **national tier only**. Regional + municipal tiers
  come from gob.pe fetchers + the datos abiertos catalog (see
  `docs/full-coverage-strategy.md` and `recon/spij.ir.json`).
- The catalog backfill CSV (186,282 rows, 2013–2022) is the post-2013
  cross-check + coverage denominator; ingest it here as `catalog.json` / SQLite.
