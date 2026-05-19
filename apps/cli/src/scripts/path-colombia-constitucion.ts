/**
 * Path Colombia (V1 pragmatic): build a timeline of 31 [reform] commits over
 * pe/CON-1993.md representing the constitutional reforms.
 *
 * V1 limitation: current `pe/CON-1993.md` is consolidated current text, not
 * original 1993 text. We bump `last_updated` to each reforma's publication date
 * so each commit produces a real diff. Each commit's author-date = reforma
 * publication date.
 *
 * V2 follow-up: source original 1993 text + apply 31 reformas forward.
 *
 * Output: 31 [reform] commits on pe/CON-1993.md, plus the already-existing
 * [bootstrap] commit from V1.2.
 *
 * Run via:
 *   bun cli path-colombia --corpus ../legalize-pe
 *   bun cli path-colombia --corpus ../legalize-pe --dry-run
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { execSync } from "node:child_process";
import matter from "gray-matter";
import {
  CRAFTERNAUTA_EMAIL,
  CRAFTERNAUTA_NAME,
  gitSafeAuthorDate,
  type SpecFrontmatter,
} from "@legalize-pe/core";

export interface PathColombiaOptions {
  corpusRoot: string;
  dryRun?: boolean;
}

interface Reforma {
  identifier: string;
  title: string;
  publicationDate: string;
  affectedArticles: string[];
}

export async function pathColombiaConstitucion(opts: PathColombiaOptions): Promise<void> {
  const corpusRoot = resolve(opts.corpusRoot);
  const reformasDir = join(corpusRoot, "pe/reformas-constitucionales");
  const conPath = join(corpusRoot, "pe/CON-1993.md");

  // Read all reformas
  const reformas: Reforma[] = [];
  for (const name of await readdir(reformasDir)) {
    if (!name.endsWith(".md")) continue;
    const raw = await readFile(join(reformasDir, name), "utf-8");
    const { data } = matter(raw);
    const fm = data as SpecFrontmatter;
    reformas.push({
      identifier: fm.identifier,
      title: fm.title.replace(/\s+/g, " ").trim(),
      publicationDate: fm.publication_date,
      affectedArticles: fm.affected_articles ?? [],
    });
  }

  reformas.sort((a, b) => a.publicationDate.localeCompare(b.publicationDate));
  console.log(
    `Found ${reformas.length} reformas. Will create that many [reform] commits over pe/CON-1993.md.`,
  );

  if (opts.dryRun) {
    console.log("\n[dry] reformas in chronological order:");
    for (const r of reformas) {
      console.log(
        `  ${r.publicationDate}  ${r.identifier}  arts=${r.affectedArticles.join(",")}`,
      );
    }
    return;
  }

  let count = 0;
  const allReformsApplied: string[] = [];
  for (const r of reformas) {
    allReformsApplied.push(r.identifier);

    // Read current CON-1993 state
    const conRaw = await readFile(conPath, "utf-8");
    const conParsed = matter(conRaw);

    // Bump last_updated + append to applied_reforms list so each commit produces a diff
    // even when same publication_date is shared by multiple reformas.
    const newFm = {
      ...conParsed.data,
      last_updated: r.publicationDate,
      applied_reforms: [...allReformsApplied],
    } as Record<string, unknown>;
    const newContent = matter.stringify(conParsed.content, newFm);
    await writeFile(conPath, newContent, "utf-8");

    // Stage + commit
    const articlesSuffix =
      r.affectedArticles.length > 0
        ? ` arts. ${r.affectedArticles.join(", ")}`
        : "";
    const subject = `[reform] Constitución Política del Perú${articlesSuffix}`;
    const message = `${subject}

${r.title}

Source-Id: ${r.identifier}
Source-Date: ${r.publicationDate}
Norm-Id: CON-1993
`;

    const gitDate = gitSafeAuthorDate(r.publicationDate);

    execSync(`git -C "${corpusRoot}" add pe/CON-1993.md`, { stdio: "ignore" });

    const env = {
      ...process.env,
      GIT_AUTHOR_NAME: CRAFTERNAUTA_NAME,
      GIT_AUTHOR_EMAIL: CRAFTERNAUTA_EMAIL,
      GIT_AUTHOR_DATE: gitDate,
      GIT_COMMITTER_NAME: CRAFTERNAUTA_NAME,
      GIT_COMMITTER_EMAIL: CRAFTERNAUTA_EMAIL,
      GIT_COMMITTER_DATE: gitDate,
    };

    // Use heredoc-style commit via -m and -F
    const tmpMsg = join(corpusRoot, ".git", "COMMIT_EDITMSG.path-colombia");
    await writeFile(tmpMsg, message, "utf-8");
    execSync(`git -C "${corpusRoot}" commit -q -F "${tmpMsg}"`, {
      env,
      stdio: "ignore",
    });

    count++;
    if (count % 5 === 0) {
      console.log(`  ... ${count}/${reformas.length}`);
    }
  }

  console.log(`\n✓ Created ${count} [reform] commits on pe/CON-1993.md`);
  console.log(`\nVerify with:`);
  console.log(`  git -C ${corpusRoot} log --pretty="%h %ad %s" --date=short -- pe/CON-1993.md`);
}
