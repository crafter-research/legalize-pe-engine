/**
 * Build a TSV plan file with one row per norm:
 *   relativePath\tidentifier\ttitle\tpublication_date\tgit_safe_date\tyear
 *
 * The plan is then consumed by a shell loop that runs `git add` + `git commit`
 * with Crafternauta env vars. Much faster than spawning Node/Bun per commit.
 *
 * Run via:
 *   bun cli bootstrap-plan --corpus ../legalize-pe --out plan.tsv
 */

import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { type SpecFrontmatter, gitSafeAuthorDate } from "@legalize-pe/core";
import matter from "gray-matter";

export interface PlanOptions {
  corpusRoot: string;
  out: string;
  limit?: number;
}

export async function buildBootstrapPlan(opts: PlanOptions): Promise<void> {
  const peDir = join(opts.corpusRoot, "pe");
  const reformasDir = join(peDir, "reformas-constitucionales");

  interface Row {
    relativePath: string;
    identifier: string;
    title: string;
    publicationDate: string;
    gitSafeDate: string;
    year: string;
  }

  const rows: Row[] = [];

  for (const name of await readdir(peDir)) {
    if (!name.endsWith(".md")) continue;
    const raw = await readFile(join(peDir, name), "utf-8");
    const { data } = matter(raw);
    const fm = data as SpecFrontmatter;
    rows.push({
      relativePath: `pe/${name}`,
      identifier: fm.identifier,
      title: (fm.title ?? "").replace(/[\t\n\r]/g, " ").trim(),
      publicationDate: fm.publication_date,
      gitSafeDate: gitSafeAuthorDate(fm.publication_date),
      year: fm.publication_date.slice(0, 4),
    });
  }

  for (const name of await readdir(reformasDir)) {
    if (!name.endsWith(".md")) continue;
    const raw = await readFile(join(reformasDir, name), "utf-8");
    const { data } = matter(raw);
    const fm = data as SpecFrontmatter;
    rows.push({
      relativePath: `pe/reformas-constitucionales/${name}`,
      identifier: fm.identifier,
      title: (fm.title ?? "").replace(/[\t\n\r]/g, " ").trim(),
      publicationDate: fm.publication_date,
      gitSafeDate: gitSafeAuthorDate(fm.publication_date),
      year: fm.publication_date.slice(0, 4),
    });
  }

  rows.sort((a, b) => a.publicationDate.localeCompare(b.publicationDate));

  if (opts.limit) rows.splice(opts.limit);

  const lines = rows.map((r) =>
    [r.relativePath, r.identifier, r.title, r.publicationDate, r.gitSafeDate, r.year].join("\t"),
  );

  await writeFile(opts.out, `${lines.join("\n")}\n`, "utf-8");
  console.log(`Wrote ${rows.length} rows to ${opts.out}`);
}
