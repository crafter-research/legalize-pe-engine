import path from "node:path";
import { createGitService } from "@legalize-pe/git-reader";
import type { APIRoute } from "astro";
import { checkRateLimit } from "../../../../lib/rate-limit";

export const prerender = false;

// Validación de seguridad para prevenir path traversal
const VALID_ID_PATTERN = /^[a-z0-9-]+$/;

export const GET: APIRoute = async ({ params, clientAddress }) => {
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

  if (!id) {
    return new Response(JSON.stringify({ error: "Parámetro id requerido" }), {
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

  try {
    const repoPath = path.join(process.cwd(), "..", "..");
    const gitService = createGitService(repoPath);
    const commits = await gitService.getHistory(id);

    if (!commits || commits.length === 0) {
      return new Response(JSON.stringify({ error: "No se encontró historial para esta norma" }), {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": "100",
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": resetTime.toString(),
        },
      });
    }

    return new Response(JSON.stringify({ data: commits }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": "100",
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": resetTime.toString(),
      },
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    return new Response(JSON.stringify({ error: "Error al obtener el historial" }), {
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
