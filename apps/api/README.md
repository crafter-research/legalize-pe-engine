# @legalize-pe/api

REST API over the Peruvian legal corpus. Two backends:

- **Lookup / search / stats** &mdash; served from a Turso (libSQL/SQLite) snapshot of the corpus.
- **Version history** (`/history`, `/at`, `/diff`, `/compare`) &mdash; served live from the public corpus repo via the GitHub API (no local clone needed, works on serverless).

The corpus itself is open at [crafter-research/legalize-pe](https://github.com/crafter-research/legalize-pe); this API is the hosted, queryable layer over it.

## Run locally

```bash
cp .env.example .env        # defaults work for local dev (SQLite file)
bun install
bun run db:push             # create the schema in ./local.db
bun run db:import           # load norms from a local corpus clone (../../../../legalize-pe)
bun run dev                 # http://localhost:3001
```

`db:import` needs a local clone of the corpus. Set `LEGALIZE_PE_CORPUS` if it is not the default sibling path. The history endpoints do **not** need the clone (they use the GitHub API).

## Environment

| Var | Required | Purpose |
|-----|----------|---------|
| `TURSO_DATABASE_URL` | prod only | libSQL URL. Unset = `file:./local.db`. |
| `TURSO_AUTH_TOKEN` | prod only | Turso auth token. |
| `GITHUB_TOKEN` | optional | Raises GitHub API limit 60 &rarr; 5,000 req/h for history endpoints. |
| `LEGALIZE_PE_CORPUS` | import only | Path to corpus clone for `db:import`. |

## Endpoints

Base path: `/api`. All responses are JSON. Successful bodies are wrapped in `{ "data": ... }` (lists also include `meta`).

### Lookup (Turso)

#### `GET /normas`
List and filter norms.

| Param | Notes |
|-------|-------|
| `q` | Search in title + body. Title matches are ranked first. |
| `tipo` (alias `tipos`) | One or more `rango` values, comma-separated. E.g. `ley`, `decreto_supremo`, `resolucion_ministerial`. |
| `jurisdiccion` (alias `jurisdicciones`) | Comma-separated. E.g. `pe`. |
| `estado` | Corpus status value, e.g. `in_force`. (Note: values come from the corpus, not Spanish labels.) |
| `desde` / `hasta` | Publication date range, `YYYY-MM-DD`. |
| `limit` | Default 20, max 100. |
| `offset` | Default 0. |

```bash
curl "http://localhost:3001/api/normas?tipo=ley&desde=2024-01-01&limit=2"
# { "data": [ { "identificador": "...", "titulo": "...", "rango": "ley", ... } ],
#   "meta": { "total": 229, "limit": 2, "offset": 0 } }
```

#### `GET /normas/:id`
Full norm by `identificador`. `404` if not found.
```bash
curl "http://localhost:3001/api/normas/LEY-32104-2024"
```

#### `GET /normas/por-fecha/:fecha`
All norms published on a date (`YYYY-MM-DD`). `400` on bad format.
```bash
curl "http://localhost:3001/api/normas/por-fecha/2024-07-28"
# { "data": [...], "meta": { "fecha": "2024-07-28", "total": 1 } }
```

#### `GET /normas/actualizadas?desde=YYYY-MM-DD`
Norms updated since a date. `desde` required (`400` otherwise). `limit` default 50, max 100.
```bash
curl "http://localhost:3001/api/normas/actualizadas?desde=2024-01-01"
```

#### `GET /calendario/:year/:month`
Per-day publication counts for a month.
```bash
curl "http://localhost:3001/api/calendario/2024/7"
# { "data": [ { "fecha": "2024-07-02", "count": 9 }, ... ], "meta": { "year": 2024, "month": 7, "total": ... } }
```

#### `GET /stats`
Corpus totals and breakdowns by `rango` and `jurisdiccion`.
```bash
curl "http://localhost:3001/api/stats"
# { "data": { "total": 11043, "porTipo": [...], "porJurisdiccion": [...], "ultimaActualizacion": "..." } }
```

### Version history (GitHub API)

#### `GET /normas/:id/history`
Commit history of a norm. `404` if the norm has no tracked file.
```bash
curl "http://localhost:3001/api/normas/LEY-32104-2024/history"
# { "data": [ { "hash": "...", "shortHash": "...", "authorDate": "...", "subject": "..." } ] }
```

#### `GET /normas/:id/at/:commit`
Full content of a norm at a specific commit.

#### `GET /normas/:id/diff?from=<commit>&to=<commit>`
Line-level diff hunks between two commits. `from` and `to` required.

#### `GET /normas/:id/compare?from=<commit>&to=<commit>`
Full content of the norm at both commits side by side (build your own comparison). `from` and `to` required.

## Errors

| Status | Meaning |
|--------|---------|
| `400` | Missing or malformed parameter (e.g. bad date, missing `from`/`to`). |
| `404` | Norm or version not found. |
| `500` | Unexpected server/database error. |
