#!/usr/bin/env bun
/**
 * legalize-pe MCP server.
 *
 * Exposes the Peruvian legal corpus (21K+ norms, national + 26 regional
 * jurisdictions) to MCP clients (Claude, Cursor, Codex) over stdio.
 *
 * Tools:
 *   - search_norms        full-text search, filterable by jurisdiction / rank
 *   - get_norm            full text + metadata of one norm by id
 *   - list_jurisdictions  coverage map (id, name, norm count)
 *   - get_norm_history    git commit history for a norm (every reform = a commit)
 *
 * Run: LEGALIZE_PE_CORPUS=/path/to/legalize-pe bun apps/mcp/src/server.ts
 *
 * Uses the low-level Server API with raw JSON-Schema tool definitions to avoid
 * the MCP SDK's zod-generic deep-instantiation (TS2589).
 */

import { spawnSync } from "node:child_process";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { CORPUS_REPO, loadCorpus } from "./corpus.ts";

const JURISDICTION_NAMES: Record<string, string> = {
  pe: "Nacional",
  "pe-ama": "Amazonas",
  "pe-anc": "Áncash",
  "pe-apu": "Apurímac",
  "pe-are": "Arequipa",
  "pe-aya": "Ayacucho",
  "pe-caj": "Cajamarca",
  "pe-cal": "Callao",
  "pe-cus": "Cusco",
  "pe-huc": "Huánuco",
  "pe-huv": "Huancavelica",
  "pe-ica": "Ica",
  "pe-jun": "Junín",
  "pe-lal": "La Libertad",
  "pe-lam": "Lambayeque",
  "pe-lim": "Lima (Región)",
  "pe-lim-met": "Lima Metropolitana",
  "pe-lor": "Loreto",
  "pe-mdd": "Madre de Dios",
  "pe-moq": "Moquegua",
  "pe-pas": "Pasco",
  "pe-piu": "Piura",
  "pe-pun": "Puno",
  "pe-sam": "San Martín",
  "pe-tac": "Tacna",
  "pe-tum": "Tumbes",
  "pe-uca": "Ucayali",
};

const TOOLS = [
  {
    name: "search_norms",
    description:
      "Search Peruvian legal norms by keyword. Returns matching norms with id, title, rank, jurisdiction, date and official source. Filter by jurisdiction ('pe' national, 'pe-cus' Cusco, …) and/or rank.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search terms (title, identifier, body)" },
        jurisdiction: {
          type: "string",
          description: "Filter by jurisdiction code, e.g. 'pe', 'pe-are'",
        },
        rank: {
          type: "string",
          description: "Filter by SPEC rank, e.g. 'ley', 'ordenanza_regional'",
        },
        limit: { type: "number", description: "Max results (1–50, default 10)" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_norm",
    description:
      "Get the full text and metadata of one norm by its id (from search_norms). Returns SPEC v0.2 frontmatter + the Markdown body.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Norm id, e.g. 'pe-decreto-legislativo-295'" },
      },
      required: ["id"],
    },
  },
  {
    name: "list_jurisdictions",
    description: "List all jurisdictions (national + 26 regional) with their norm counts.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_norm_history",
    description:
      "Get the git commit history of a norm (every amendment is a commit with its real publication date). Returns chronological commits with hash, date and subject.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "Norm id from search_norms" } },
      required: ["id"],
    },
  },
];

function text(obj: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(obj, null, 2) }] };
}
function err(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

const server = new Server(
  { name: "legalize-pe", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  const a = args as Record<string, unknown>;

  if (name === "search_norms") {
    const { fuse } = loadCorpus();
    const cap = Math.min(Math.max(Number(a.limit) || 10, 1), 50);
    let hits = fuse.search(String(a.query ?? "")).map((r) => r.item);
    if (a.jurisdiction) hits = hits.filter((n) => n.jurisdiction === a.jurisdiction);
    if (a.rank) hits = hits.filter((n) => n.rank === a.rank);
    const results = hits.slice(0, cap).map((n) => ({
      id: n.id,
      identifier: n.identifier,
      title: n.title,
      rank: n.rank,
      jurisdiction: n.jurisdiction,
      publication_date: n.publication_date,
      status: n.status,
      source: n.source,
    }));
    return text({ count: results.length, results });
  }

  if (name === "get_norm") {
    const { byId } = loadCorpus();
    const n = byId.get(String(a.id));
    if (!n) return err(`No norm with id "${a.id}".`);
    const meta = {
      id: n.id,
      identifier: n.identifier,
      title: n.title,
      rank: n.rank,
      jurisdiction: n.jurisdiction,
      publication_date: n.publication_date,
      status: n.status,
      source: n.source,
    };
    return {
      content: [
        { type: "text" as const, text: `${JSON.stringify(meta, null, 2)}\n\n---\n\n${n.body}` },
      ],
    };
  }

  if (name === "list_jurisdictions") {
    const { norms } = loadCorpus();
    const counts: Record<string, number> = {};
    for (const n of norms) {
      const dir = n.relativePath.split("/")[0] ?? "pe";
      counts[dir] = (counts[dir] ?? 0) + 1;
    }
    const jurisdictions = Object.entries(counts)
      .map(([code, count]) => ({ code, name: JURISDICTION_NAMES[code] ?? code, count }))
      .sort((x, y) => y.count - x.count);
    return text({ total: norms.length, jurisdictions });
  }

  if (name === "get_norm_history") {
    const { byId } = loadCorpus();
    const n = byId.get(String(a.id));
    if (!n) return err(`No norm with id "${a.id}".`);
    const res = spawnSync(
      "git",
      [
        "-C",
        CORPUS_REPO,
        "log",
        "--follow",
        "--date=short",
        "--format=%h\t%ad\t%s",
        "--",
        n.relativePath,
      ],
      { encoding: "utf-8" },
    );
    if (res.status !== 0) return err(`git log failed: ${res.stderr ?? "unknown"}`);
    const commits = (res.stdout ?? "")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [hash, date, ...rest] = line.split("\t");
        return { hash, date, subject: rest.join("\t") };
      });
    return text({ id: n.id, path: n.relativePath, commits });
  }

  return err(`Unknown tool: ${name}`);
});

const { norms } = loadCorpus();
console.error(`[legalize-pe-mcp] loaded ${norms.length} norms from ${CORPUS_REPO}`);
await server.connect(new StdioServerTransport());
