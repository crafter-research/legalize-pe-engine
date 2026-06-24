import type { APIRoute } from "astro";
import searchIndex from "search-index";
import { intelligentSearch } from "../../../lib/smart-search";

export const prerender = false;

// Bundled at build time via the `search-index` Vite alias (see astro.config.mjs).
// Importing instead of reading from `public/` at runtime is what keeps this
// endpoint alive in the Vercel serverless function, where `public/` is absent.
const laws = searchIndex;

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function runSearch(query: string, page: unknown, limit: unknown) {
  // Sanitise page: integer >= 1.
  const rawPage = Math.floor(Number(page));
  const pageNum = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  // Sanitise limit: integer clamped to [1, 100].
  const rawLimit = Math.floor(Number(limit));
  const limitNum = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, rawLimit)) : 20;

  // Get more results than needed so pagination can slice locally.
  const allResults = intelligentSearch(query, laws, 1000);

  const total = allResults.length;
  const totalPages = Math.max(1, Math.ceil(total / limitNum));
  // Clamp page to totalPages so an out-of-range page returns an empty last page
  // rather than undefined behaviour from a negative startIndex.
  const safePage = Math.min(pageNum, totalPages);
  const startIndex = (safePage - 1) * limitNum;
  const paginatedResults = allResults.slice(startIndex, startIndex + limitNum);

  return {
    query,
    results: paginatedResults.map((r) => ({
      id: r.law.id,
      titulo: r.law.t,
      rango: r.law.r,
      estado: r.law.s ?? r.law.e ?? "in_force",
      fechaPublicacion: r.law.f,
      bodyPreview: r.law.b,
      materias: r.law.m ?? [],
      score: r.score,
      matchReasons: r.matchReasons,
    })),
    pagination: { page: safePage, limit: limitNum, total, totalPages },
  };
}

function errorResponse(error: unknown): Response {
  console.error("Smart search error:", error);
  return json(
    {
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    },
    500,
  );
}

// GET /api/search/smart?q=...&page=&limit=  (cacheable, shareable URL)
// Read params from `request.url` rather than the `url` context prop: the latter
// is undefined in the Vercel serverless adapter and crashes the function
// (FUNCTION_INVOCATION_FAILED), even though it works in the Astro dev server.
export const GET: APIRoute = async ({ request }) => {
  const params = new URL(request.url).searchParams;
  const query = params.get("q") ?? "";
  if (!query.trim()) {
    return json({ error: "Query parameter 'q' is required" }, 400);
  }
  try {
    return json(runSearch(query, params.get("page"), params.get("limit")));
  } catch (error) {
    return errorResponse(error);
  }
};

// POST /api/search/smart  { query, page?, limit? }
export const POST: APIRoute = async ({ request }) => {
  let body: { query?: unknown; page?: unknown; limit?: unknown };
  try {
    body = await request.json();
  } catch {
    // Malformed JSON -> 400, no internal detail leaked.
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { query, page = 1, limit = 20 } = body;

  if (!query || typeof query !== "string") {
    return json({ error: "Query parameter is required and must be a string" }, 400);
  }

  try {
    return json(runSearch(query, page, limit));
  } catch (error) {
    return errorResponse(error);
  }
};

// All other HTTP methods -> 405.
export const ALL: APIRoute = () =>
  new Response(null, {
    status: 405,
    headers: { Allow: "GET, POST" },
  });
