# Data sources

Five Peruvian sources matter for this project. Their access patterns determine the three-fetcher strategy.

## SPIJ (Sistema Peruano de Información Jurídica)

- URL: https://spij.minjus.gob.pe/
- Operator: Ministerio de Justicia y Derechos Humanos
- Coverage: ~160,000 norms (national, regional, local)
- Access: HTML, no public API
- Licence: norms are public domain per Decreto Legislativo 822, Art. 9
- Use in this project: full text of national norms (Constitution, codes, laws, supreme decrees, etc.)

SPIJ is the most complete authoritative source for full text of national legislation. Access is free since November 2024 (previously gated behind a paid subscription). The portal is HTML-only; scraping uses `agent-browser`.

## El Peruano (Diario Oficial)

- URL: https://busquedas.elperuano.pe/
- Stable API endpoint: `https://busquedas.elperuano.pe/api/visor_html/{idNorma}-1` returns HTML
- Per-norm document: `https://diariooficial.elperuano.pe/Normas/obtenerDocumento?idNorma={N}` returns PDF
- Coverage: every officially published norm since publication is mandatory for entry into force (Const. Art. 109)
- Access: HTML and PDF, no documented API
- Licence: public domain
- Use in this project: reform metadata (each amendment is a separate published norm), gazette references

## Datos abiertos catalog

- URL: https://www.datosabiertos.gob.pe/dataset/dispositivos-legales
- Provider: Empresa Peruana de Servicios Editoriales SA (Editora Perú)
- Format: monthly CSV
- File pattern: `https://www.datosabiertos.gob.pe/sites/default/files/DatosAbiertos_Periodo_YYYYMMDD_YYYYMMDD.CSV`
- Coverage: 2013 to present
- Schema: Fecha Publicación, Orden de Publicación, Entidad, Dispositivo, Número, Sumilla, Link (PDF)
- Licence: Open Data Commons Attribution Licence (ODC-BY)
- Use in this project: catalog discovery layer. When per-institution scraping fails, this is the fallback to know what to look for.

A second related dataset is `https://www.datosabiertos.gob.pe/sites/default/files/spij_norma.csv` (semestral, 2023 onwards, MINJUSDH).

## gob.pe

- URL: https://www.gob.pe/institucion/{slug}/normas-legales/tipos/{type_id}-{type_slug}
- Operator: Presidencia del Consejo de Ministros
- Tech stack: Ruby on Rails with Active Storage for PDFs in CDN
- Coverage: variable per institution. Lima Metropolitana, Cusco, and many provincial municipalities expose ordenanzas under type 13. Other regional governments use different type codes (e.g., Áncash and Tumbes have ordenanzas under type 41 `decreto-regional`; Puno under type 79 `acuerdo-regional`).
- Access: HTML server-rendered, no API
- Use in this project: primary source for Lima Metropolitana, Cusco, and any institution that publishes there with a clean structure

URL patterns observed:

| Pattern | Example |
|---|---|
| Listing | `https://www.gob.pe/institucion/regioncusco/normas-legales/tipos/13-ordenanza` |
| Detail | `https://www.gob.pe/institucion/regioncusco/normas-legales/1345987-o-r-158-2018` |
| PDF | `https://cdn.www.gob.pe/uploads/document/file/1448456/Ordenanza.pdf` |

## Per-institution portals

Each of the 25 regional governments, Lima Metropolitana, Callao, and many municipalities maintains an institutional portal. Five we have probed empirically:

| Institution | Pattern | Accessible |
|---|---|---|
| Cusco | `transparencia.regioncusco.gob.pe`, Laravel SSR with XSRF cookies | Yes |
| Tumbes | `regiontumbes.gob.pe/piloto/documentos/Ordenanzas%20Regionales/`, Apache static | Yes |
| Moquegua | `consultas.regionmoquegua.gob.pe/wp-content/uploads/`, WordPress | Yes |
| Áncash | `regionancash.gob.pe/doc_normativas/ordenanza/{YYYY}/`, Apache | Directory listing returns 403; PDFs are accessible when the URL is known |
| Puno | `regionpuno.gob.pe/descargas/consejoregional/ordenanzas/{YYYY}/` | Same as Áncash |

## Strategy per institution

The three fetcher classes map to the three observed access patterns:

| Pattern | Use | Fetcher |
|---|---|---|
| Institution publishes to `gob.pe` with the expected type code | Primary | `GobPeFetcher` |
| Institution has Apache or WordPress with public directory access | Primary | `StaticDirectoryFetcher` |
| Institution returns HTTP 403 on listings | Primary | `CatalogCrossrefFetcher` (driven by datos abiertos CSV) |
| Anything else | Fallback | Manual IR + custom fetcher logic |

Before adding a jurisdiction, run `bun cli discover <portal-url>` to inspect the snapshot, then choose the fetcher class and write the IR.

## Licence summary

The text of legal norms is public domain by force of law (Decreto Legislativo 822, Art. 9, which excludes "official texts of legislative, administrative or judicial nature" from copyright protection). The datos abiertos CSV catalog is licensed ODC-BY. The repository structure, tooling, and metadata in this project are MIT.
