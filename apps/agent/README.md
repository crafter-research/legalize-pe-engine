# @crafter/legalize

Agent-first **MCP server + CLI** for Peruvian law. Search the open `legalize-pe`
corpus (21k+ norms, national + 26 regional jurisdictions), fetch full texts, and
**ask grounded questions that answer with citations to the official source**, all
over the hosted [amicus](https://amicus.crafter.ing) API.

This is the lightweight, hosted client: no 600MB corpus clone, hybrid
(semantic + full-text) retrieval, and a grounded `ask` tool. Not legal advice.

## CLI

```bash
npx @crafter/legalize search "prescripción adquisitiva" --jurisdiction pe
npx @crafter/legalize get pe/RM-0702-2026-IN
npx @crafter/legalize ask "¿puedo quedarme con un terreno si lo ocupo varios años?"
npx @crafter/legalize jurisdictions
```

Add `--json` to any command for machine output.

## MCP server

Tools: `search_norms`, `get_norm`, `ask_legal` (grounded + cited),
`list_jurisdictions`.

### Claude Desktop / Cursor / Codex

```json
{
  "mcpServers": {
    "legalize-pe": {
      "command": "npx",
      "args": ["-y", "@crafter/legalize", "mcp"],
      "env": { "AMICUS_API_KEY": "amicus_sk_..." }
    }
  }
}
```

(The MCP binary is `legalize-mcp`; the example uses the `mcp` subcommand form if
your client runs the package directly. You can also point `command` at
`legalize-mcp`.)

## Auth

`search_norms` and `get_norm` are public. `ask_legal` needs an API key:

```bash
export AMICUS_API_KEY="amicus_sk_..."   # from amicus.crafter.ing
export AMICUS_API_URL="https://amicus.crafter.ing"   # optional override
```

## Why hosted

The corpus MCP (`@legalize-pe/mcp`) is keyword-only and clones the full corpus.
This client hits amicus: hybrid retrieval (pgvector + FTS) and grounded answers
with source links, metered per API key.
