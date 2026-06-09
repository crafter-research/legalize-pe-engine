---
type: strategy
created: 2026-06-09
project: legalize-pe
themes: [legalize-pe, govtech, civic-tech, scraping, corpus]
status: draft-v1
evidence: live probes 2026-06-09 (~27 requests), GitHub API, datos abiertos CSV download
---

# Legalize-PE: Full Coverage Strategy — Mapping ALL of Peru's Laws

Goal: take the corpus from **1,627 Markdown files** to **~200K+ norms** across Peru's **1,919 issuing authorities** (national + 25 GORE + Lima Metropolitana + 196 provincial + 1,695 district), SPEC v0.2, git-versioned, federation-listed.

All load-bearing claims below are backed by live evidence gathered 2026-06-09 (HTTP probes, CSV download, GitHub API) or by the engine repo's own docs. Evidence markers: `[probe]` = checked this session, `[catalog]` = computed from downloaded CSV, `[gh]` = GitHub API, `[docs]` = engine repo docs (prior empirical work).

---

## 1. Current state

| Metric | Value | Source |
|---|---:|---|
| Corpus files | 1,627 (1,622 national + 5 Cusco) | `find pe pe-cus -name '*.md'` on local clone |
| National coverage vs SPIJ (~160K claimed) | **~1%** | docs/data-sources.md |
| Regional jurisdictions with any coverage | 1 of 26 (Cusco, 5 ordenanzas) | corpus |
| Provincial / district coverage | 0 | corpus |
| Date-quality debt | ~197 norms with scrape-day placeholder dates (ADR-10) | docs/decisions.md, engine issue #1 |
| Catalog ingest (`data/catalog.json`) | **empty** — CatalogCrossrefFetcher has no data behind it yet | local engine repo |
| Recon IRs | 1 (`regioncusco.ir.json`) | local engine repo |
| CI pipeline | none (V1 deployed prebuilt from laptop, ADR-11) | engine issue #2 |
| Federation listing | PR legalize-dev/legalize#17 still open, quiet since 2026-05-26 | GitHub |

**Key structural insight:** the roadmap's V2–V4 tiers grow *breadth* (regional → provincial → district), but the dominant *depth* gap is national: 1,622 of ~160K SPIJ norms. The regional expansion (V2) adds maybe 3–6K norms; the SPIJ backfill adds ~150K+. Both matter, but they're different machines: V2 is fetcher engineering, the SPIJ backfill is one big API integration. They should run as parallel tracks, not sequential tiers.

---

## 2. Coverage matrix — all regional-tier jurisdictions → fetcher class

Probes this session: `GET https://www.gob.pe/institucion/{slug}/normas-legales` (landing shows a *sample* of norm types — absence of a type on the landing is NOT proof of absence; presence is proof of presence). Spot-probes hit the type listing directly. Catalog counts = rows in El Peruano CSV 2013-01→2022-03.

**Enumeration note (finding):** the project counts "27 regional jurisdictions (25 GR + Lima Met + Callao)" but Callao IS one of the 25 gobiernos regionales — distinct regional-tier jurisdictions = **26** (25 GORE incl. Callao + Lima Metropolitana). The catalog confirms exactly 25 distinct `GOBIERNO REGIONAL *` entities `[catalog]`. Fix the count in vision.md/roadmap.md.

| # | Jurisdiction | gob.pe slug | Probe result (this session) | Catalog norms 2013–22 | Fetcher class |
|---|---|---|---|---:|---|
| 1 | Arequipa | regionarequipa | 200; types incl. 41-decreto-regional, 79-acuerdo-regional; **spot: `13-ordenanza` live, 25 detail links** `[probe]` | 795 | **GobPeFetcher** (confirmed) |
| 2 | La Libertad | regionlalibertad | 200; **spot: `13-ordenanza` returns 200 but EMPTY (0 links)** `[probe]` | 454 | **CatalogCrossrefFetcher** (gob.pe ordenanza type empty) |
| 3 | Piura | regionpiura | 200; 79-acuerdo-regional, 246-acuerdo-de-consejo-regional `[probe]` | 366 | GobPeFetcher-candidate (type discovery needed) |
| 4 | Huánuco | regionhuanuco | 200; **has dedicated `40-ordenanza-regional` (spot: live, sparse — 1 link page 1)** `[probe]` | 311 | **GobPeFetcher** (type 40, confirmed sparse) |
| 5 | San Martín | regionsanmartin | 200; 79-acuerdo-regional `[probe]` | 304 | GobPeFetcher-candidate |
| 6 | Tacna | regiontacna | not probed | 286 | unknown → catalog default |
| 7 | Ucayali | regionucayali | not probed | 265 | unknown → catalog default |
| 8 | Lima (GORE, Huacho) | regionlima | 200; 41-decreto-regional, 246-acuerdo `[probe]` | 263 | GobPeFetcher-candidate |
| 9 | Callao | regioncallao | 200; 79-acuerdo-regional, 246-acuerdo `[probe]` | 259 | GobPeFetcher-candidate |
| 10 | Junín | regionjunin | 200; 79-acuerdo-regional, 246-acuerdo `[probe]` | 253 | GobPeFetcher-candidate |
| 11 | Moquegua | regionmoquegua | (prior) WordPress uploads `[docs]` | 236 | **StaticDirectoryFetcher** (V1-confirmed) |
| 12 | Lambayeque | regionlambayeque | 200; 79-acuerdo-regional `[probe]` | 232 | GobPeFetcher-candidate |
| 13 | Amazonas | regionamazonas | not probed | 231 | unknown → catalog default |
| 14 | Ica | regionica | 200; 41-decreto-regional, 246-acuerdo `[probe]` | 190 | GobPeFetcher-candidate |
| 15 | Cajamarca | regioncajamarca | 200; 41-decreto-regional, 79-acuerdo-regional `[probe]` | 187 | GobPeFetcher-candidate |
| 16 | Cusco | regioncusco | (prior) type 13-ordenanza, 25+ visible `[docs]`; IR exists | 160 | **GobPeFetcher** (shipped V1) |
| 17 | Loreto | regionloreto | 200; 79-acuerdo-regional, acta types `[probe]` | 155 | GobPeFetcher-candidate |
| 18 | Pasco | regionpasco | not probed | 151 | unknown → catalog default |
| 19 | Ayacucho | regionayacucho | 200; 79-acuerdo-regional, 246-acuerdo `[probe]` | 149 | GobPeFetcher-candidate |
| 20 | Madre de Dios | regionmadrededios | not probed | 138 | unknown → catalog default |
| 21 | Tumbes | regiontumbes | (prior) Apache static dir `[docs]` | 119 | **StaticDirectoryFetcher** (V1-confirmed) |
| 22 | Áncash | regionancash | (prior) 403 on listings, PDFs reachable by URL `[docs]` | 103 | **CatalogCrossrefFetcher** (V1-confirmed) |
| 23 | Huancavelica | regionhuancavelica | not probed | 100 | unknown → catalog default |
| 24 | Puno | regionpuno | (prior) 403 on listings `[docs]` | 95 | **CatalogCrossrefFetcher** (V1-confirmed) |
| 25 | Apurímac | regionapurimac | not probed | 63 | unknown → catalog default |
| 26 | Lima Metropolitana | munilima | 200; 96-decreto-de-alcaldia, 108-acuerdo-de-concejo (type 13 confirmed in V1 `[docs]`) `[probe]` | (in MUNICIPALIDAD bucket) | **GobPeFetcher** (V1-confirmed) |

What the sweep proved:

1. **Every probed slug resolves (14/14 HTTP 200)** — the `region{name}` slug convention holds across the board; no jurisdiction is missing from gob.pe `[probe]`.
2. **Type-code heterogeneity is worse than documented.** The 3-fetcher thesis assumed type 13/41/79 variance; reality adds 40-ordenanza-regional (Huánuco), 246-acuerdo-de-consejo-regional, and the landing page only samples types. The fetch pipeline needs a **per-jurisdiction type-discovery step**: enumerate `tipos/*` per slug once, persist in the IR.
3. **gob.pe 200 ≠ data.** La Libertad's `13-ordenanza` returns 200 with zero entries `[probe]`. Classification requires probing the *content*, not the status code. gob.pe is a publishing channel institutions opt into per-type; the catalog remains ground truth for "what should exist."
4. **All 25 GOREs publish to El Peruano** (63–795 norms each, 5,865 total 2013–22) `[catalog]` — so CatalogCrossrefFetcher is a universal fallback for the regional tier even where portals fail.

V2 engineering consequence: add a `bun cli discover-types <slug>` step that walks gob.pe type listings per institution and writes the type map into `recon/{slug}.ir.json`. ~50-line declarations per jurisdiction stay realistic only if type discovery is automated.

---

## 3. SPIJ national backfill (~160K norms) — verified observations

Probed this session `[probe]`:

- `https://spij.minjus.gob.pe/` → meta-refresh to `/spij-ext-web/#/inicio` — **Angular SPA** (`<app-root>`, `main.429dd95f476a75e07648.js`, 3.0 MB bundle).
- Bundle extraction revealed the backend: **`https://spijwsii.minjus.gob.pe/spij-ext-back/`** with REST endpoints: `api/buscar` (search), `api/detallenorma/` (norm detail), `api/maestros` (taxonomies), `api/sector`, `api/ultimo/registro`, `api/login`, `api/validarSesion`, `api/procesarpdf/`, `api/procesarword/`.
- `GET api/ultimo/registro` → **405 Method Not Allowed** ("Request method 'GET' not supported") — Spring Boot error envelope, endpoint is POST-based.
- `POST api/ultimo/registro {}` → **500** — reachable **without authentication** (no 401/403 at gateway), but expects a structured payload.

Strategy (in order):

1. **Capture the request contracts** with agent-browser network interception: drive the SPA through a search + detail view, record the POST bodies for `api/buscar` and `api/detallenorma/`. One afternoon of recon; persist as `recon/spij.ir.json` with payload templates.
2. **Enumerate via `api/buscar`** — paginated search over the norm taxonomy (`api/maestros` likely returns rank/sector enums to iterate). Target: a registry of all norm IDs before fetching any full text.
3. **Fetch full text via `api/detallenorma/{id}`** — JSON/HTML detail → `packages/parser` HTML-to-Markdown path (already exists).
4. **Politeness**: SPIJ is free since Nov 2024 and public domain (DLeg 822 Art. 9), but it's a MINJUS production system. 1 req/s sustained = ~160K detail fetches in ~2 days of runtime; run at off-peak hours, identify with a contact UA string, checkpoint per-page so the job is resumable. Consider emailing MINJUS first — a bulk-export ask costs nothing and the spij_norma.csv dataset (semestral, datosabiertos) suggests they already export.
5. **Cross-check against `spij_norma.csv`** (MINJUSDH semestral dataset, 2023+) as a partial registry to validate enumeration completeness.

Open question (V2 recon, not blockable now): whether `api/buscar` requires a session token from `api/login` even for anonymous use — the SPA may call `api/login` with a guest credential on load. Network capture resolves this.

### Network capture results (2026-06-09, agent-browser HAR) `[probe]`

The SPA has an **ACCESO LIBRE** (free-access) button — no human credentials. Clicking it fires the full auth handshake against **three** backends:

- `POST spij-ext-back/authenticate` body `{"usuario":"spijext","clave":"password","tipo":0}` → `{"success":true,"value":"<JWT>"}`. **Confirmed via direct curl**: returns an HS256 JWT, `sub:spijext, tipo:0, exp:+24h`. **Hardcoded service creds, no captcha, no human auth.** This is the master key.
- `POST spij-ext-solr/authenticate` body `{"usuario":"spijext","clave":"password"}` → JWT for the **Solr search cluster** (`spij-ext-solr` is a separate backend — this is where full-text search runs).
- `POST spij-ext-back/api/login` body `{"usuario":"usuarioNoPago","password":"<md5>","captcha_response":true}` — anonymous "no-pay" user, `captcha_response:true` is hardcoded.
- Then `GET api/sector`, `api/maestros`, `api/agrupamiento` populate the search taxonomies (rank/sector/grouping enums to iterate for enumeration).

Implication: **bulk extraction is fully scriptable from CLI** — `curl authenticate` → bearer JWT → `spij-ext-back/api/detallenorma/{id}`. Re-auth every <24h.

### Second capture (2026-06-09) — full contract + paywall finding `[probe]`

Confirmed contracts (full IR scaffold: `spij.ir.json` in this folder):

- **`GET {back}/api/detallenorma/{id}`** — THE goldmine. Fetched `H682684` (Código Civil) with just the free JWT: 4.6 MB JSON with `id`, `codigoNorma` (Nº 295), `dispositivoLegal` (DECRETO LEGISLATIVO → SPEC rank), `sumilla`, **`fechaPublicacion: 1984-07-25` (real date — kills the ADR-10 date debt)**, `sector`, `ruta` (hierarchy), and **`textoCompleto` (full HTML body)**. **National norms need zero OCR** — SPIJ serves structured text directly. Norm IDs are `H`-prefixed.
- **`GET {back}/api/maestros|sector|agrupamiento`** — taxonomy enums, free-tier open. `maestros.dispositivolegal[]` is the `dispositivoLegal → SPEC rank` lookup table.

**Paywall finding (changes enumeration plan):** `POST {solr}/api/buscar` (param shape `{filtros, facetsSeleccionadas}`) is **gated for the anonymous tier** — the console logs `tipoUsuario=usuariogratuito` and the HTTP request **never fires** for free users (client-side block). So enumeration cannot lean on `buscar` with the free token. `detallenorma` fetches *any* id once known, but there's no reverse lookup, so the open question becomes **how to get the full id list on the free tier**:

1. **Next capture target:** the free-tier browse buttons "LEGISLACIÓN POR MATERIA" and "LEGISLACIÓN EMITIDA POR GOBIERNOS LOCALES Y REGIONALES" — capture the listing endpoint feeding those trees (free users navigate them, so they return id lists `buscar` won't).
2. **Curated core now:** the inicio page links every Código + the Constitución via `#/detallenorma/{H-id}` — scrape those immediately (highest citizen-value national norms, zero enumeration needed).
3. Cross-map datos abiertos catalog (186K rows) → SPIJ ids: blocked without a listing/buscar endpoint (no reverse lookup on detallenorma).
4. Evaluate a paid SPIJ account only if no free listing endpoint exists.

HARs archived: `/tmp/legalize-probe/spij-capture.har`, `spij-search.har`. IR scaffold: `04_Projects/_active/legalize-pe/spij.ir.json`.

---

## 4. Catalog analysis (datos abiertos) — downloaded & counted

Files downloaded this session `[catalog]`:

| File | Rows | Note |
|---|---:|---|
| `DatosAbiertos_Periodo_20130101_20220331.CSV` (63 MB) | **186,282** | 9.25-year backfill, schema: FECHA_PUBLICACION, OP, ENTIDAD, DISPOSITIVO, NUMERO, SUMILLA, LINK, FECHA_CORTE |
| `DatosAbiertos_Periodo_20241001_20241031.CSV` | 1,730 | → run-rate ~20K norms/yr nationally |
| `DatosAbiertos_Periodo_20260501_20260531.CSV` | **404** | latest published file on dataset page is 2024-10 — **catalog is ~19 months stale** |

Distribution (2013–2022 backfill):

- **623 distinct entities** published in El Peruano.
- All **25 GOREs**: 5,865 norms (see matrix).
- **462 distinct municipalities**: 21,463 norms — only ~24% of Peru's 1,891 municipalities ever appear. El Peruano sees the formal tier; **the long tail (V3/V4) cannot be discovered via the catalog** and needs gob.pe enumeration + portal scraping.
- Top dispositivos: RESOLUCION 61,434; RESOLUCION MINISTERIAL 41,340; **ORDENANZA 14,065**; DECRETO SUPREMO 8,180; DECRETO DE ALCALDIA 5,107.
- LINK column carries per-norm El Peruano PDF URLs (`epdoc2.elperuano.pe/.../DescargaINDA.asp?...`) — the CatalogCrossrefFetcher's download path is already in the data.

Pre-2013 gap: the catalog starts 2013. Pre-2013 norms (the bulk of the ~160K) are only reachable via SPIJ — another reason the SPIJ track is the mainline for national depth, with the catalog as the post-2013 cross-check + the incremental-update feed.

**Action:** ingest the 63 MB backfill into `data/catalog.json` (or better: SQLite — 186K rows in JSON is the wrong shape) **now**. It instantly converts "mapping all Peru's laws" from open-ended scraping into a measurable closure problem: coverage % = corpus files / registry entries, per entity, rendered on the roadmap's `/audit` page.

---

## 5. Git at scale: mono-corpus vs split repos

Evidence from the federation `[gh]`:

| Corpus | Layout | Repo size | Stars |
|---|---|---:|---:|
| legalize-kr/legalize-kr | **national only** (`kr/`) | 372 MB | 1,396 |
| legalize-kr/ordinance-kr | **sub-national split into its own repo**, 17 per-province dirs | 618 MB | 7 |
| legalize-kr/admrule-kr | administrative rules, separate repo | 93 MB | 9 |
| legalize-kr/precedent-kr | case law, separate repo | 1.4 GB | 103 |
| legalize-dev/legalize-es | **mono-repo**: `es/` + 17 `es-{iso}/` | 1.67 GB | 1,800 |
| legalize-dev/legalize-co | national only (`co/`) | 2.0 GB | 1 |

### Alternatives considered

**(a) Mono-corpus** (Spain pattern; current legalize-pe layout `pe/` + `pe-{iso}/`). Pros: one clone = whole country, one federation listing, cross-jurisdiction `grep`/`git log` for free, the social proof (stars) concentrates. Cons: clone weight — Spain at 1.67 GB for ~national+17 regions; Peru at 200K+ files with district tier would likely exceed 2–4 GB and git operations (status, checkout) degrade with file count.

**(b) Split-by-tier** (Korea pattern, demonstrably operating at the sizes we're heading to). `legalize-pe` = national + regional; `ordinance-pe` (or `legalize-pe-municipal`) = provincial + district. Pros: main corpus stays clonable (~national 160K norms is the big one though…); municipal long tail (~150–300K files, the bulkiest, lowest-traffic tier) doesn't tax every consumer; matches the project's existing two-repo discipline. Cons: two clones for full-country analysis; Korea's split repos show stars don't follow (7★ vs 1,396★).

**(c) Per-jurisdiction repos** (1,919 repos): rejected — unmanageable, kills federation listing and discovery.

### Decision

**Hybrid, staged:** keep the mono-corpus (`pe/` + `pe-{iso}/`) through national backfill + V2 regional (~165K national files is comparable to Korea's national corpus at 372 MB — fine). **Split the municipal tier (V3/V4) into a sibling repo from day one of V3** (Korea's `ordinance-kr` precedent), cross-linked in both READMEs and listed in the federation as the same country entry. Document `git clone --filter=blob:none` (partial clone) and sparse-checkout per `pe-{iso}/` in the corpus README for consumers who want one region — this mitigates clone weight without restructuring.

One Korea lesson worth stealing `[gh]`: their README warns that pipeline improvements may force-push to rebuild history (all hashes change), with a documented resync command. legalize-pe will face the same when V2 re-scrapes the ~197 placeholder dates — adopt the same warning + use `[correction]` commits where possible instead of history rewrites.

---

## 6. OCR pipeline recommendation

Context: most gob.pe norm PDFs are scans (verified during V1.4 detail-page work `[docs]`; the 5 Cusco ordinances shipped with `date_precision: year` for exactly this reason). El Peruano PDFs (catalog LINK column) are mostly born-digital text.

Costs (assume avg 3 pages/norm; VLM figures use current API pricing — Haiku 4.5 $1/$5 per MTok, Sonnet 4.6 $3/$15, Batches API −50%; ~1.5K image tokens/page in, ~800 tokens/page out):

| Option | Cost / 1K docs | Cost @ 200K docs | Quality on degraded scans |
|---|---:|---:|---|
| Tesseract (self-hosted) | ~$0 (compute) | ~$0 | Poor on skew/stamps/handwriting; fine on clean scans |
| Cloud OCR (Google Vision / AWS Textract class, ~$1.50/1K pages) | ~$4.50 | ~$900 | Good; no layout reasoning |
| **Haiku 4.5 VLM (Batches)** | **~$8.50** | **~$1,700** | Reads stamps, marginalia, extracts structured frontmatter (date! número! entidad!) in the same pass |
| Sonnet 4.6 VLM (Batches) | ~$25 | ~$5,100 | Best; overkill for routine pages |

**Recommendation — 3-stage cascade:**

1. `pdftotext` first — born-digital PDFs (most El Peruano docs) cost zero.
2. **Tesseract** for scanned pages; keep pages whose mean word confidence ≥ threshold.
3. **Haiku 4.5 via Batches API** for low-confidence pages, prompted to return text + structured fields (`publication_date`, `numero`, `issuing_entity`) in one shot — this simultaneously fixes the ADR-10 date-debt class of problem, which pure OCR doesn't.

Expected blend: if ~30% of corpus needs stage 2 and ~10% reaches stage 3, VLM spend at 200K docs ≈ **$170–400 total**. Negligible against the value; do not over-engineer cheaper.

---

## 7. Prioritization model & milestones

Rank work by **citizen-value per scraping-hour**: (norms unlocked × usage weight) / engineering effort. National codes/laws are what citizens, lawyers, and LLMs actually query; district ordinances are long-tail.

| Phase | Track | Output (cumulative corpus) | Effort signal |
|---|---|---|---|
| **M0** (1 wk) | Registry: ingest catalog backfill → SQLite; `/audit` coverage page; CI build (engine issue #2); ping federation PR #17 | 1.6K (unchanged, now *measurable*) | small |
| **M1** (2–4 wks) | **SPIJ recon + national backfill**: capture API contracts, enumerate registry, fetch in checkpointed batches | **~50–160K** (dominant jump) | 1 big integration |
| **M2** (parallel w/ M1) | **V2 regional**: type-discovery CLI step + 26 jurisdiction declarations (GobPe confirmed: Cusco, Arequipa, Huánuco, Lima Met; Static: Tumbes, Moquegua; Catalog: Áncash, Puno, La Libertad + 7 unprobed default; rest candidates) + daily cron via Crafternauta | +3–6K, **26/26 regional coverage** — the federation-differentiating claim | ~50 LOC/jurisdiction post-tooling |
| **M3** | Date-debt re-scrape (issue #1) + OCR cascade for scans | quality, not count | medium |
| **M4** | **V3 provincial** (196 munis, mostly gob.pe enumeration + catalog crossref for the 462 catalog-visible munis first) | +30–60K | repetitive, automatable |
| **M5** | **V4 district long tail** → split `legalize-pe-municipal` repo, community-supported | +150–300K (partial, honest about it) | community |

Incremental keep-up: the daily cron (roadmap V2) matters more than any backfill — at ~1.7K norms/month nationally `[catalog]`, a corpus without automation falls behind ~20K norms/year. Ship the cron in M0–M2, not after.

---

## 8. Risks & red-team

**Strongest objection to this plan:** *the catalog-as-ground-truth premise is broken — the datos abiertos dataset's last published file is 2024-10 (verified: 2026-05 URL pattern 404s, dataset page lists nothing newer `[catalog]`). If Editora Perú abandoned the dataset, the CatalogCrossrefFetcher's discovery layer and the coverage denominator silently freeze in late 2024, and the daily cron designed around "download latest CSV, detect new norms" has nothing to download.*

Mitigation: (a) the El Peruano buscador API (`busquedas.elperuano.pe/api/visor_html/{id}`) remains a live per-norm source — build the incremental feed on scraping the daily gazette index instead of the CSV; (b) raise the staleness with datosabiertos.gob.pe / Editora Perú (ODC-BY licensed, they answer); (c) SPIJ `api/ultimo/registro` is literally a "latest record" endpoint — the incremental feed may come from SPIJ, not El Peruano.

Other risks:

| Risk | Likelihood | Mitigation |
|---|---|---|
| SPIJ blocks/rate-limits bulk extraction | medium | polite pacing, off-peak, contact MINJUS, checkpointed resume; legal basis solid (DLeg 822 Art. 9, public service free since Nov 2024) |
| SPIJ POST contracts need session auth | medium | network capture will tell; worst case drive the SPA itself via agent-browser (slower but works) |
| gob.pe type-code drift breaks IRs | high (observed: 5 distinct ordenanza-ish type codes already) | automated type discovery per jurisdiction + audit dashboard alerts on zero-result fetches |
| ~197 placeholder dates contaminate downstream consumers before M3 | certain (shipped) | already documented in AUDIT.md; M3 prioritizes the 197; consumers told to treat `publication_date: 2026-*` as audit flags |
| Mono-repo clone weight repels consumers before the split | low until V3 | partial-clone docs now; split at V3 per §5 |
| Federation PR #17 never merges | low | Korea pattern works unlisted too; corpus value doesn't depend on the hub. Nudge maintainers; worst case stay "community" |
| Single-maintainer bus factor across 1,919 authorities | high | per-jurisdiction declarations are the contribution unit — CONTRIBUTING.md should make "add your region/muni" a 1-PR task; Crafter Station community is the distribution channel |

What would change the recommendation: if SPIJ network capture reveals a hard auth wall or aggressive blocking, M1 re-anchors on the El Peruano catalog + visor API (post-2013 only, ~186K entries) and pre-2013 coverage moves to a slow archival track — the milestone order flips to M2-first.

---

## Evidence log (session 2026-06-09)

- gob.pe: 14 jurisdiction landing probes (all 200) + 3 type spot-probes (Arequipa 13: 25 links; La Libertad 13: empty; Huánuco 40: 1 link).
- SPIJ: homepage redirect, SPA shell, 3 MB bundle parsed for endpoints, `api/ultimo/registro` GET→405 / POST{}→500 (no auth wall).
- datos abiertos: dataset page (2×), backfill CSV 186,282 rows (63 MB), 2024-10 CSV 1,730 rows, 2026-05 404.
- GitHub API: legalize-dev hub, legalize-kr org (10 repos, sizes), legalize-es root layout + size, legalize-co size.
- Local: corpus file count, engine `recon/`+`data/` state, all engine docs.
- Raw probe artifacts: `/tmp/legalize-probe/` (ephemeral).
