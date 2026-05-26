import path from "node:path";
import { createGitService } from "@legalize-pe/git-reader";
import type { APIRoute } from "astro";
import { checkRateLimit } from "../../../../lib/rate-limit";

export const prerender = false;

// Validación de seguridad para prevenir path traversal e inyección
const VALID_ID_PATTERN = /^[a-z0-9-]+$/;
const VALID_HASH_PATTERN = /^[a-f0-9]{7,40}$/;

export const GET: APIRoute = async ({ params, url, clientAddress }) => {
  // Rate limiting
  const ip = clientAddress || "unknown";
  const { allowed, remaining, resetTime } = checkRateLimit(ip);

  if (!allowed) {
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": "100",
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": resetTime.toString(),
        "Retry-After": retryAfter.toString(),
      },
    });
  }

  const { id } = params;
  const fromHash = url.searchParams.get("from");
  const toHash = url.searchParams.get("to");

  if (!id || !fromHash || !toHash) {
    return new Response(JSON.stringify({ error: "Parámetros requeridos: id, from, to" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": "100",
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": resetTime.toString(),
      },
    });
  }

  if (!VALID_ID_PATTERN.test(id)) {
    return new Response(JSON.stringify({ error: "Identificador inválido" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": "100",
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": resetTime.toString(),
      },
    });
  }

  if (!VALID_HASH_PATTERN.test(fromHash) || !VALID_HASH_PATTERN.test(toHash)) {
    return new Response(JSON.stringify({ error: "Hash de commit inválido" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": "100",
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": resetTime.toString(),
      },
    });
  }

  try {
    const repoPath = path.join(process.cwd(), "..", "..");
    const gitService = createGitService(repoPath);
    const diff = await gitService.getDiff(id, fromHash, toHash);

    return new Response(JSON.stringify({ data: diff }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": "100",
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": resetTime.toString(),
      },
    });
  } catch (error) {
    console.error("Error fetching diff:", error);
    return new Response(JSON.stringify({ error: "Error al obtener la comparación" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": "100",
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": resetTime.toString(),
      },
    });
  }
};
