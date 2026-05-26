# Roadmap

Volume and scope grow in concentric tiers. Each tier ships when the previous one is stable.

## V1 (shipped, May 2026)

Pioneer slice with one regional government and the full national corpus migrated to SPEC v0.2.

| Component | Status |
|---|---|
| Monorepo bootstrap (Turborepo + Bun + Biome) | Shipped |
| National corpus migration to SPEC v0.2 | Shipped, 1,622 national Markdown files |
| Cusco pioneer fetcher (5 ordenanzas regionales) | Shipped |
| Web app live at https://legalize-pe.crafter.ing | Shipped |
| PR to legalize-dev federation | Open, [PR #17](https://github.com/legalize-dev/legalize/pull/17) |
| Constitution timeline (32 commits, 1993 to 2024) | Shipped |

## V2 (planned)

Tier 1 expansion: cover all 27 regional jurisdictions (25 regional governments plus Lima Metropolitana plus Callao).

Outline:

- `GobPeFetcher` extended to the regional governments that classify ordenanzas under type 13 in `gob.pe` (Lima Metropolitana plus 4 to 6 others to be confirmed).
- `StaticDirectoryFetcher` for Apache and WordPress portals (Tumbes, Moquegua, plus others).
- `CatalogCrossrefFetcher` for institutions returning HTTP 403 on listings (Áncash, Puno, plus others). Discovery driven by the El Peruano CSV catalog.
- Web `/regiones` page with a clickable Peru map colored by coverage.
- Per-jurisdiction declarations in `packages/jurisdictions/{slug}.ts` (target ~50 lines of code per jurisdiction).
- Audit dashboard at `/audit` showing coverage percentage per jurisdiction vs catalog ground truth.
- GitHub Actions cron (`daily.yml`) that downloads the latest catalog CSV, detects new norms, and commits them via Crafternauta.

Expected output: 27 regional jurisdictions covered, each with at least 10 ordenanzas in `pe-{iso}/`.

## V3 (planned)

Tier 2 expansion: 196 provincial municipalities.

Most provincial municipalities publish to `gob.pe`. Discovery is by enumeration plus catalog cross-reference. Adapter reuse means each provincial muni is a thin declaration on top of `GobPeFetcher` or `StaticDirectoryFetcher`.

Expected output: an additional ~30,000 to 60,000 norms in `pe-{iso}/{muni-slug}/`.

## V4 (long tail)

Tier 3 expansion: 1,695 district municipalities.

Many smaller districts only expose a Portal de Transparencia Estándar with PDFs. Coverage will be partial and community-supported. The system supports this naturally because each jurisdiction is an independent declaration.

Expected output: an additional ~150,000 to 300,000 norms.

## Cross-cutting

These run alongside the tier expansion and are not blocked by it.

- **Path Colombia V2**: source the original 1993 text of the Constitution from a verifiable archive (Banco Central de Reserva, El Peruano archive, or printed gazette). Apply the 31 reformas forward to reproduce intermediate texts and replace the V1 implementation, which currently bumps `last_updated` without reconstructing pre-reform article text.
- **Per-article history for ordinary laws**: extend Path Colombia to laws with documented amendments (Código Civil, Código Penal, etc.).
- **Webctl re-evaluation**: webctl was considered for V1 recon and deferred because its v0 classifier targets interactive SaaS apps. Re-test when webctl ships a static-listing classifier.
- **Search and AI tooling**: full-text search beyond fuse.js, semantic search via embeddings, MCP server exposing the corpus to LLM clients.
- **English mirror**: machine-translated frontmatter (`title_en` extension field) for cross-jurisdictional research.

## Non-roadmap

We do not plan to:

- Build a paid product.
- Replicate this work for other countries directly. We will share methodology and tooling, but the per-country instance is up to local maintainers.
- Provide legal advice or interpretation. The corpus is data, not counsel.
