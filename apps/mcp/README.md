# @legalize-pe/mcp

MCP server that exposes the Peruvian legal corpus (21K+ norms — national + 26
regional jurisdictions, every reform a git commit) to LLM clients like Claude
Desktop, Cursor, and Codex.

## Tools

| Tool | What it does |
|---|---|
| `search_norms` | Full-text search; filter by `jurisdiction` (`pe`, `pe-cus`, …) and `rank`. |
| `get_norm` | Full text + SPEC v0.2 metadata for one norm by id. |
| `list_jurisdictions` | Coverage map: every jurisdiction + norm count. |
| `get_norm_history` | Git commit history of a norm (each amendment is a dated commit). |

## Run

The server reads the corpus from disk. Point `LEGALIZE_PE_CORPUS` at a clone of
[`crafter-research/legalize-pe`](https://github.com/crafter-research/legalize-pe)
(full history, not shallow — `get_norm_history` needs the commits):

```bash
git clone https://github.com/crafter-research/legalize-pe.git
LEGALIZE_PE_CORPUS=$(pwd)/legalize-pe bun apps/mcp/src/server.ts
```

## Claude Desktop / Cursor config

```json
{
  "mcpServers": {
    "legalize-pe": {
      "command": "bun",
      "args": ["/abs/path/legalize-pe-engine/apps/mcp/src/server.ts"],
      "env": { "LEGALIZE_PE_CORPUS": "/abs/path/legalize-pe" }
    }
  }
}
```

Then ask: *"search legalize-pe for norms about minería ilegal in Cusco"*, or
*"get the history of the Código Civil"*.
