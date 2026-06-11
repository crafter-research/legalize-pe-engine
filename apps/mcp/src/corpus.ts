/**
 * Corpus loader + in-memory search index for the MCP server.
 *
 * Reads the legalize-pe corpus (national pe/ + regional pe-{iso}/) from disk,
 * parses SPEC v0.2 frontmatter, and builds a Fuse index. Self-contained: does
 * not depend on the web app. Set LEGALIZE_PE_CORPUS to the corpus repo path.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative } from "node:path";
import Fuse from "fuse.js";
import matter from "gray-matter";

const CORPUS_GIT_URL = "https://github.com/crafter-research/legalize-pe.git";

// Use an explicit path if given, else a stable cache dir so `bunx` works with zero setup.
export const CORPUS_REPO =
  process.env.LEGALIZE_PE_CORPUS ?? join(homedir(), ".cache", "legalize-pe");

/** Clone the corpus on first run if it's not present (so the server is zero-setup).
 *  Full clone (not shallow) so get_norm_history has commits to read. */
export function ensureCorpus(): void {
  if (existsSync(join(CORPUS_REPO, "pe"))) return;
  console.error(`[legalize-pe-mcp] corpus not found at ${CORPUS_REPO} — cloning (one-time)…`);
  const res = spawnSync("git", ["clone", CORPUS_GIT_URL, CORPUS_REPO], { stdio: "inherit" });
  if (res.status !== 0) {
    throw new Error(
      `Failed to clone the corpus to ${CORPUS_REPO}. Set LEGALIZE_PE_CORPUS to an existing clone of ${CORPUS_GIT_URL}.`,
    );
  }
}

/** Globally-unique, URL-safe id derived from the corpus path (matches the web app). */
export function normUniqueId(relativePath: string): string {
  return relativePath
    .replace(/\.md$/, "")
    .replace(/\//g, "-")
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export interface Norm {
  id: string; // unique route id
  identifier: string; // human identifier from frontmatter
  title: string;
  rank: string;
  jurisdiction: string;
  publication_date: string;
  status: string;
  source: string;
  relativePath: string; // e.g. "pe-are/001-2026.md"
  body: string;
}

function jurisdictionDirs(): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(CORPUS_REPO)) {
    if (entry === "pe" || entry.startsWith("pe-")) {
      try {
        if (statSync(join(CORPUS_REPO, entry)).isDirectory()) out.push(entry);
      } catch {
        /* skip */
      }
    }
  }
  return out;
}

function walkMd(absDir: string, base: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(absDir)) {
    if (entry.startsWith(".") || entry.startsWith("HISTORIAL")) continue;
    const full = join(absDir, entry);
    const st = statSync(full);
    if (st.isDirectory()) files.push(...walkMd(full, base));
    else if (entry.endsWith(".md")) files.push(relative(base, full));
  }
  return files;
}

let cache: { norms: Norm[]; fuse: Fuse<Norm>; byId: Map<string, Norm> } | null = null;

export function loadCorpus() {
  if (cache) return cache;
  ensureCorpus();
  const norms: Norm[] = [];
  for (const dir of jurisdictionDirs()) {
    const absDir = join(CORPUS_REPO, dir);
    for (const rel of walkMd(absDir, CORPUS_REPO)) {
      try {
        const raw = readFileSync(join(CORPUS_REPO, rel), "utf-8");
        const { data, content } = matter(raw);
        const fm = data as Record<string, string>;
        if (!fm.title) continue;
        norms.push({
          id: normUniqueId(rel),
          identifier: fm.identifier ?? normUniqueId(rel),
          title: fm.title,
          rank: fm.rank ?? "",
          jurisdiction: fm.jurisdiction ?? "pe",
          publication_date: fm.publication_date ?? "",
          status: fm.status ?? "in_force",
          source: fm.source ?? "",
          relativePath: rel,
          body: content,
        });
      } catch {
        /* skip unreadable */
      }
    }
  }
  const byId = new Map(norms.map((n) => [n.id, n]));
  const fuse = new Fuse(norms, {
    keys: [
      { name: "title", weight: 0.6 },
      { name: "identifier", weight: 0.3 },
      { name: "body", weight: 0.1 },
    ],
    threshold: 0.35,
    ignoreLocation: true,
  });
  cache = { norms, fuse, byId };
  return cache;
}
