import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { JURISDICTIONS, ask, getNorm, searchNorms } from "./client.js";

type ToolResult = { content: { type: "text"; text: string }[] };

// Build + connect the MCP server over stdio. Reused by the `legalize-mcp` bin
// and the `legalize mcp` subcommand.
export async function startMcp(): Promise<void> {
  const server = new McpServer({ name: "legalize-pe", version: "0.1.0" });

  // The SDK's registerTool generics + zod raw shapes trip TS2589 ("type
  // instantiation excessively deep"); the runtime is correct. Register through
  // a loosely-typed alias to skip that inference. Args are validated by zod at
  // runtime regardless.
  const tool = (
    server.registerTool as unknown as (
      name: string,
      config: {
        description: string;
        inputSchema: Record<string, z.ZodTypeAny>;
      },
      handler: (args: Record<string, unknown>) => Promise<ToolResult>,
    ) => void
  ).bind(server);

  tool(
    "search_norms",
    {
      description:
        "Busca normas legales peruanas (corpus legalize-pe: 21k+ normas, nacional + 26 regiones) por texto completo. Filtra por jurisdiction (pe, pe-are, pe-cus, …) y rank (ley, decreto_supremo, ordenanza_regional, …). Devuelve metadata; usa get_norm para el texto completo.",
      inputSchema: {
        query: z.string().describe("Términos de búsqueda en español."),
        jurisdiction: z
          .string()
          .optional()
          .describe("Código de jurisdicción, ej. pe (nacional) o pe-are."),
        rank: z.string().optional().describe("Tipo de norma, ej. ley."),
        page: z.number().optional(),
      },
    },
    async (args) => {
      const res = await searchNorms({
        q: args.query as string,
        jurisdiction: args.jurisdiction as string | undefined,
        rank: args.rank as string | undefined,
        page: args.page as number | undefined,
      });
      return { content: [{ type: "text", text: JSON.stringify(res, null, 2) }] };
    },
  );

  tool(
    "get_norm",
    {
      description:
        "Devuelve el texto completo + metadata de una norma por su id de corpus (ej. pe/RM-0702-2026-IN).",
      inputSchema: {
        id: z.string().describe("id de corpus, ej. pe/RM-0702-2026-IN"),
      },
    },
    async (args) => {
      const n = await getNorm(args.id as string);
      return {
        content: [
          {
            type: "text",
            text: n ? JSON.stringify(n, null, 2) : `No encontrada: ${args.id}`,
          },
        ],
      };
    },
  );

  tool(
    "ask_legal",
    {
      description:
        "Pregunta en lenguaje natural sobre legislación peruana y recibe una respuesta GROUNDED en el corpus, con citas a la fuente oficial (retrieval híbrido + una sola generación). No es asesoría legal. Requiere AMICUS_API_KEY.",
      inputSchema: { question: z.string().describe("Pregunta en español.") },
    },
    async (args) => {
      const res = await ask(args.question as string);
      const sources = res.sources
        .map((s) => `- ${s.identifier ?? ""} ${s.url ?? ""}`.trim())
        .join("\n");
      return {
        content: [{ type: "text", text: `${res.answer}\n\nFuentes:\n${sources}` }],
      };
    },
  );

  tool(
    "list_jurisdictions",
    {
      description:
        "Lista las jurisdicciones del corpus (nacional + 26 regiones) con sus códigos para filtrar search_norms.",
      inputSchema: {},
    },
    async () => ({
      content: [{ type: "text", text: JSON.stringify(JURISDICTIONS, null, 2) }],
    }),
  );

  await server.connect(new StdioServerTransport());
}
