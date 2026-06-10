# V2 Regional Fetcher Matrix

Evidence-based classification of the 26 regional-tier jurisdictions, produced by
`bun src/cli.ts discover-types --all` (live gob.pe probes, 2026-06-09).
Full data: `data/coverage-matrix.json`.

## Headline finding: the 3-fetcher cascade collapses to gob-pe for the regional tier

The V1 strategy assumed three fetcher classes split across the regional tier —
`GobPeFetcher` for Cusco/Lima, `StaticDirectoryFetcher` for Tumbes/Moquegua,
`CatalogCrossrefFetcher` for Áncash/Puno (which 403'd on their own portals).

Probing the **actual gob.pe type listings** (not the landing sample, not the
status code) shows **all 26 publish to gob.pe with content** — the institutions
that 403'd on their *own* portals still publish to the central gob.pe channel,
just under a different type code than `13-ordenanza`:

| Primary type code found | Jurisdictions |
|---|---|
| `79-acuerdo-regional` | Arequipa, Ayacucho, Cajamarca, Cusco, Huancavelica, Junín, La Libertad, Lambayeque, Piura, Puno, San Martín, Ucayali |
| `246-acuerdo-de-consejo-regional` | Amazonas, Áncash, Apurímac, Callao, Ica, Lima (GORE), Moquegua, Pasco, Tacna, Tumbes |
| `108-acuerdo-de-concejo` | Loreto, Madre de Dios, Lima Metropolitana |
| `40-ordenanza-regional` | Huánuco |

So **`GobPeFetcher` is the single primary fetcher** for the regional tier.
`CatalogCrossrefFetcher` demotes from "primary for some" to a **backfill +
cross-check** role (the catalog still holds the El Peruano PDF links and is the
coverage denominator). `StaticDirectoryFetcher` stays available for portals if a
gob.pe gap appears, but is not needed to start.

## Caveat: type code ≠ rank — fetch ALL norm types per jurisdiction

`primary_type` is whichever norm-class listing had the most entries — usually an
*acuerdo* (a lower-rank instrument), not an *ordenanza* (the highest-rank
regional norm). E.g. Huánuco shows only 1 `ordenanza-regional` vs many acuerdos.
A jurisdiction declaration should therefore enumerate **every** norm-class type
present (`norm_type_probes` in the matrix), not just the top one, and map each
gob.pe type to the right SPEC rank:

| gob.pe type | SPEC rank |
|---|---|
| `*-ordenanza`, `*-ordenanza-regional` | `ordenanza_regional` |
| `*-ordenanza-municipal` | `ordenanza_municipal` |
| `*-decreto-regional` | `decreto_regional` |
| `*-acuerdo-regional`, `*-acuerdo-de-consejo-regional` | `acuerdo_regional` |
| `*-acuerdo-de-concejo` | `acuerdo_de_concejo` |
| `*-decreto-de-alcaldia` | `decreto_de_alcaldia` |

## Listing depth

Every probed listing returned 25 detail links = gob.pe's first-page size, so
each type has more behind pagination. The GobPeFetcher's pagination strategy
(`page` query param) applies; the declaration sets the page size and walks pages.

## Next steps

1. Generate per-jurisdiction IRs from `data/coverage-matrix.json` (one
   `recon/{slug}.ir.json` each, listing every norm type + its SPEC rank).
2. Extend `GobPeFetcher` to accept a *set* of type codes per jurisdiction.
3. Pilot-fetch one jurisdiction end-to-end (Arequipa, the largest at 795 catalog
   rows) to validate the IR shape before fanning out to all 26.
