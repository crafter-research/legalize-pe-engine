import { createGitService } from "@legalize-pe/git-reader";
import type { APIRoute } from "astro";
import { resolveNormaPath } from "../../../../../lib/norma-path";
import { checkRateLimit } from "../../../../../lib/rate-limit";

export const prerender = false;

const VALID_HASH_PATTERN = /^[a-f0-9]{7,40}$/;

const json = (data: unknown, status = 200, extra?: Record<string, string>): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extra },
  });

export const GET: APIRoute = async ({ params, clientAddress }) => {
  const ip = clientAddress || "unknown";
  const { allowed, remaining, resetTime } = checkRateLimit(ip);

  const rlHeaders = {
    "X-RateLimit-Limit": "100",
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": resetTime.toString(),
  };

  if (!allowed) {
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
    return json({ error: "Rate limit exceeded. Please try again later." }, 429, {
      ...rlHeaders,
      "X-RateLimit-Remaining": "0",
      "Retry-After": retryAfter.toString(),
    });
  }

  const { id, commit } = params;

  if (!id || !commit) {
    return json({ error: "Parámetros requeridos: id, commit" }, 400, rlHeaders);
  }

  // Whitelist check: id must exist in the map (blocks path traversal + unknown ids).
  const resolvedPath = resolveNormaPath(id);
  if (!resolvedPath) {
    return json({ error: "Norma no encontrada" }, 404, rlHeaders);
  }

  if (!VALID_HASH_PATTERN.test(commit)) {
    return json({ error: "Hash de commit inválido" }, 400, rlHeaders);
  }

  try {
    const gitService = createGitService();
    const version = await gitService.getContentAtCommit(id, commit, resolvedPath);

    return json({ data: version }, 200, rlHeaders);
  } catch (error) {
    console.error("Error fetching version:", error);
    return json({ error: "Error al obtener la versión" }, 500, rlHeaders);
  }
};

export const ALL: APIRoute = () =>
  new Response(null, {
    status: 405,
    headers: { Allow: "GET" },
  });
