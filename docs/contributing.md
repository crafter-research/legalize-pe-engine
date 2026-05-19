# Contributing

We welcome contributions, especially adding new jurisdictions.

## How to add a regional government

1. **Probe the institution's portal**. Look for `gob.pe/institucion/{slug}/normas-legales/tipos/{N}-{type-slug}` first.

   ```bash
   bun cli discover "https://www.gob.pe/institucion/{slug}/normas-legales/tipos/13-ordenanza"
   ```

   The CLI prints the agent-browser snapshot. Inspect:
   - Does the listing return at least one matching norm?
   - What is the URL pattern for detail pages?
   - Where are the PDFs hosted (CDN, same domain, attachment)?

2. **Decide which fetcher class to use**. See [data-sources.md](./data-sources.md) for the three patterns.

   | Pattern | Fetcher |
   |---|---|
   | Institution publishes to `gob.pe` with the expected type code | `GobPeFetcher` |
   | Apache directory listing or WordPress uploads | `StaticDirectoryFetcher` |
   | HTTP 403 on listing | `CatalogCrossrefFetcher` |

3. **Write the IR**. Create `recon/{slug}.ir.json` based on what you saw in the snapshot. See `recon/regioncusco.ir.json` as a reference.

4. **Declare the jurisdiction**. Add `packages/jurisdictions/{slug}.ts` (target ~50 lines). It declares which fetcher class to use and any per-institution parameters.

5. **Run a small extraction**.

   ```bash
   bun cli fetch-all --jurisdiction {slug} --limit 5 --corpus ../legalize-pe
   ./apps/cli/src/scripts/run-bootstrap.sh ../legalize-pe ./fetch-plan.tsv
   ```

   Verify the resulting files in `../legalize-pe/pe-{iso}/`.

6. **Open a PR** to this repo. Include:
   - `recon/{slug}.ir.json`
   - `packages/jurisdictions/{slug}.ts`
   - Sample output (one or two `.md` files) in the PR description

## Conventions

### Frontmatter

Every file in the corpus follows [SPEC v0.2](https://github.com/legalize-dev/legalize/blob/main/SPEC.md). Eight mandatory fields, plus Peru-specific extensions flat (no nesting under `extra:`). See [architecture.md](./architecture.md) for details.

### Identifiers

Uppercase, with year suffix:

| Type | Pattern | Example |
|---|---|---|
| Constitution | `CON-YYYY` | `CON-1993` |
| Constitutional reform | `LEY-REFORMA-NNNNN-YYYY` | `LEY-REFORMA-30305-2015` |
| Law | `LEY-NNNNN-YYYY` | `LEY-30220-2014` |
| Legislative decree | `DLEG-NNNN-YYYY` | `DLEG-295-1984` |
| Supreme decree | `DS-NNN-YYYY-SECTOR` | `DS-006-2014-MINEDU` |
| Regional ordinance | `OR-NNN-YYYY-ISO` | `OR-158-2018-CUS` |

### Bot identity

When the engine commits to the corpus repository, the author and committer are always:

```
Crafternauta <the.crafter.station@gmail.com>
```

Author date is the real publication date. For norms published before 1970 (git's epoch lower bound), use `1970-01-02T00:00:00Z` as the git author date and keep the real date in the `Source-Date` trailer.

When you commit to this engine repository, use your own identity.

### Commit messages

Subject line: `[<type>] <Title>[ arts. <list>]`

Trailers (required for corpus commits):

```
Source-Id: <reform-or-norm-id>
Source-Date: YYYY-MM-DD
Norm-Id: <norm-id-the-commit-affects>
```

Types per SPEC v0.2: `bootstrap`, `reform`, `new`, `repeal`, `correction`, `fix-pipeline`.

### Scraping etiquette

- User agent: `legalize-bot/1.0 (+https://github.com/crafter-research/legalize-pe)`
- Rate limit: at most 2 requests per second per portal
- Respect `robots.txt`
- Cache aggressively. Re-scraping the same listing should hit a local cache, not the origin.

### Languages

Frontmatter and commit messages are in English (SPEC v0.2 requirement). Norm bodies stay in their original language (Spanish). Code, comments, and documentation in English.

## Where to ask questions

- [GitHub issues](https://github.com/crafter-research/legalize-pe-engine/issues) for the engine
- [GitHub issues](https://github.com/crafter-research/legalize-pe/issues) for the corpus (data corrections, missing norms)
- [legalize-dev/legalize](https://github.com/legalize-dev/legalize) for SPEC questions or federation-wide discussions

## What we do not accept

- Engine integration into upstream `legalize-pipeline` (our stack is TypeScript and Bun, not Python). This is by design.
- Changes that break SPEC v0.2 conformance. The corpus must remain interoperable with the federation.
- Co-authored-by trailers naming AI assistants. Human contributors get author credit; bot identity (Crafternauta) gets the rest.
