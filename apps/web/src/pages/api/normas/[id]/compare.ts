import { createGitService } from "@legalize-pe/git-reader";
import type { APIRoute } from "astro";
import { resolveNormaPath } from "../../../../lib/norma-path";
import { checkRateLimit } from "../../../../lib/rate-limit";

export const prerender = false;

const VALID_HASH_PATTERN = /^[a-f0-9]{7,40}$/;

const json = (data: unknown, status = 200, extra?: Record<string, string>): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extra },
  });

export const GET: APIRoute = async ({ params, request, clientAddress }) => {
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

  const { id } = params;
  const searchParams = new URL(request.url).searchParams;
  const fromHash = searchParams.get("from");
  const toHash = searchParams.get("to");

  if (!id || !fromHash || !toHash) {
    return json({ error: "Parámetros requeridos: id, from, to" }, 400, rlHeaders);
  }

  // Whitelist check: id must exist in the map (blocks path traversal + unknown ids).
  const resolvedPath = resolveNormaPath(id);
  if (!resolvedPath) {
    return json({ error: "Norma no encontrada" }, 404, rlHeaders);
  }

  if (!VALID_HASH_PATTERN.test(fromHash) || !VALID_HASH_PATTERN.test(toHash)) {
    return json({ error: "Hash de commit inválido" }, 400, rlHeaders);
  }

  try {
    const gitService = createGitService();

    const [fromVersion, toVersion] = await Promise.all([
      gitService.getContentAtCommit(id, fromHash, resolvedPath),
      gitService.getContentAtCommit(id, toHash, resolvedPath),
    ]);

    function parseContent(content: string) {
      const parts = content.split(/^---\s*$/m);
      const body = parts.slice(2).join("---").trim();
      return body;
    }

    const fromBody = parseContent(fromVersion.content);
    const toBody = parseContent(toVersion.content);

    const fromLines = fromBody.split("\n");
    const toLines = toBody.split("\n");

    return json(
      {
        data: {
          from: {
            hash: fromHash,
            date: fromVersion.authorDate,
            subject: fromVersion.message.split("\n")[0] || "",
            lines: fromLines,
          },
          to: {
            hash: toHash,
            date: toVersion.authorDate,
            subject: toVersion.message.split("\n")[0] || "",
            lines: toLines,
          },
        },
      },
      200,
      rlHeaders,
    );
  } catch (error) {
    console.error("Error fetching compare data:", error);
    return json({ error: "Error al obtener las versiones" }, 500, rlHeaders);
  }
};

export const ALL: APIRoute = () =>
  new Response(null, {
    status: 405,
    headers: { Allow: "GET" },
  });
