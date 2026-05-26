import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "@vercel/og";
import type { APIRoute } from "astro";
import { createElement } from "react";

/**
 * Dynamic Open Graph image generation endpoint
 *
 * Generates 1200x630 social media preview images for:
 * - Homepage: /api/og/index
 * - Law pages: /api/og/ley-27444
 *
 * Images are dynamically generated using @vercel/og and cached at the edge
 */
export const prerender = false;

interface SearchIndexItem {
  id: string;
  t: string;
  r: string;
}

const rankLabels: Record<string, string> = {
  ley: "Ley",
  "decreto-legislativo": "Decreto Legislativo",
  "decreto-supremo": "Decreto Supremo",
  "resolucion-ministerial": "Resolución Ministerial",
  "resolucion-suprema": "Resolución Suprema",
};

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug || "";

  let title = "Legalize PE";
  let subtitle = "Legislación peruana como repositorio Git";
  let rango = "";

  // If slug is provided, look up the law in the search index
  if (slug && slug !== "index") {
    try {
      const searchIndexPath = join(process.cwd(), "public/search-index.json");
      const searchIndex: SearchIndexItem[] = JSON.parse(readFileSync(searchIndexPath, "utf-8"));

      const law = searchIndex.find((item) => item.id === slug);
      if (law) {
        title = law.t;
        rango = rankLabels[law.r] || law.r;
        subtitle = "Legalize PE - Legislación Peruana";
      }
    } catch (error) {
      console.error("Error loading search index for OG image:", error);
    }
  }

  return new ImageResponse(
    createElement(
      "div",
      {
        style: {
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000",
          color: "#fff",
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          padding: "80px",
        },
      },
      rango
        ? createElement(
            "div",
            {
              style: {
                fontSize: 24,
                color: "#888",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                fontWeight: 600,
                marginBottom: 20,
              },
            },
            rango,
          )
        : null,
      createElement(
        "div",
        {
          style: {
            fontSize: slug && slug !== "index" ? 52 : 72,
            fontWeight: 700,
            textAlign: "center",
            lineHeight: 1.2,
            marginBottom: 30,
            maxWidth: "90%",
          },
        },
        title,
      ),
      createElement(
        "div",
        {
          style: {
            fontSize: 28,
            color: "#888",
            textAlign: "center",
          },
        },
        subtitle,
      ),
    ),
    {
      width: 1200,
      height: 630,
    },
  );
};
