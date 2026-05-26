/**
 * Bootstrap corpus: take pe/*.md (already migrated to SPEC v0.2) and
 * create one Crafternauta commit per norm in the corpus repo.
 *
 * Each commit:
 *   - GIT_AUTHOR_NAME=Crafternauta
 *   - GIT_AUTHOR_EMAIL=the.crafter.station@gmail.com
 *   - GIT_AUTHOR_DATE=publication_date (1970-01-02 if pre-1970)
 *   - Subject: [bootstrap] {title} — versión original {year}
 *   - Trailers: Source-Id, Source-Date, Norm-Id
 *
 * Assumes:
 *   - Caller has migrated leyes/pe → pe/ already
 *   - Caller has reformas-constitucionales/ inside pe/
 *   - Caller is on a v2-corpus-split branch with leyes/ still present (will be removed last)
 *
 * Run via:
 *   bun cli bootstrap-corpus --corpus ../legalize-pe
 *   bun cli bootstrap-corpus --corpus ../legalize-pe --limit 10  # quick test
 */

import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  CRAFTERNAUTA_EMAIL,
  CRAFTERNAUTA_NAME,
  type SpecFrontmatter,
  gitSafeAuthorDate,
} from "@legalize-pe/core";
import matter from "gray-matter";
import { simpleGit } from "simple-git";

export interface BootstrapOptions {
  corpusRoot: string;
  limit?: number;
  dryRun?: boolean;
}

interface BootstrapFile {
  relativePath: string; // "pe/CON-1993.md" or "pe/reformas-constitucionales/LEY-REFORMA-26470-1995.md"
  frontmatter: SpecFrontmatter;
}

export async function bootstrapCorpus(opts: BootstrapOptions): Promise<void> {
  const corpusRoot = resolve(opts.corpusRoot);
  const peDir = join(corpusRoot, "pe");
  const reformasDir = join(peDir, "reformas-constitucionales");

  const files: BootstrapFile[] = [];

  // pe/*.md
  for (const name of await readdir(peDir)) {
    if (!name.endsWith(".md")) continue;
    const abs = join(peDir, name);
    const raw = await readFile(abs, "utf-8");
    const { data } = matter(raw);
    files.push({
      relativePath: `pe/${name}`,
      frontmatter: data as SpecFrontmatter,
    });
  }

  // pe/reformas-constitucionales/*.md
  for (const name of await readdir(reformasDir)) {
    if (!name.endsWith(".md")) continue;
    const raw = await readFile(join(reformasDir, name), "utf-8");
    const { data } = matter(raw);
    files.push({
      relativePath: `pe/reformas-constitucionales/${name}`,
      frontmatter: data as SpecFrontmatter,
    });
  }

  // Sort chronologically by publication_date so git history is roughly time-ordered
  files.sort((a, b) =>
    a.frontmatter.publication_date.localeCompare(b.frontmatter.publication_date),
  );

  if (opts.limit) {
    files.splice(opts.limit);
  }

  console.log(`Bootstrapping ${files.length} norms as Crafternauta commits...`);

  if (opts.dryRun) {
    for (const f of files.slice(0, 5)) {
      console.log(`[dry] ${f.frontmatter.publication_date}  ${f.relativePath}`);
    }
    console.log(`... (${files.length} total)`);
    return;
  }

  const git = simpleGit(corpusRoot);
  let count = 0;
  const startTime = Date.now();

  for (const f of files) {
    const year = f.frontmatter.publication_date.slice(0, 4);
    const authorDate = gitSafeAuthorDate(f.frontmatter.publication_date);
    const title = f.frontmatter.title.replace(/\s+/g, " ").trim();

    const subject = `[bootstrap] ${title} — versión original ${year}`;
    const trailers = [
      `Source-Id: ${f.frontmatter.identifier}`,
      `Source-Date: ${f.frontmatter.publication_date}`,
      `Norm-Id: ${f.frontmatter.identifier}`,
    ].join("\n");
    const message = `${subject}\n\n${trailers}\n`;

    await git.add(f.relativePath);

    await git
      .env({
        PATH: process.env.PATH ?? "",
        HOME: process.env.HOME ?? "",
        GIT_AUTHOR_NAME: CRAFTERNAUTA_NAME,
        GIT_AUTHOR_EMAIL: CRAFTERNAUTA_EMAIL,
        GIT_AUTHOR_DATE: authorDate,
        GIT_COMMITTER_NAME: CRAFTERNAUTA_NAME,
        GIT_COMMITTER_EMAIL: CRAFTERNAUTA_EMAIL,
        GIT_COMMITTER_DATE: authorDate,
      })
      .commit(message);

    count++;
    if (count % 100 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  ... ${count}/${files.length} (${elapsed}s)`);
    }
  }

  const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✓ Created ${count} Crafternauta commits in ${totalElapsed}s`);
}
