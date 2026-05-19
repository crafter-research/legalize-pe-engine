/**
 * Markdown frontmatter helpers for SPEC v0.2.
 */

import type { Norm, SpecFrontmatter } from "@legalize-pe/core";
import matter from "gray-matter";

export function parseNorm(raw: string): Norm {
  const { data, content } = matter(raw);
  return {
    frontmatter: data as SpecFrontmatter,
    body: content,
  };
}

export function stringifyNorm(norm: Norm): string {
  return matter.stringify(norm.body, norm.frontmatter as unknown as Record<string, unknown>);
}
