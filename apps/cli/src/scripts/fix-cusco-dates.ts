/**
 * Fix Cusco norm dates: replace placeholder 2026-05-19 (fetch day) with
 * year-only estimate derived from the identifier (e.g. O-R-153-2018 -> 2018-01-01).
 *
 * Each fix produces a `[correction]` commit with Crafternauta identity.
 */

import { execSync } from "node:child_process";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { CRAFTERNAUTA_EMAIL, CRAFTERNAUTA_NAME, gitSafeAuthorDate } from "@legalize-pe/core";
import matter from "gray-matter";

const CORPUS = resolve("../legalize-pe");
const PE_CUS = join(CORPUS, "pe-cus");

const files = await readdir(PE_CUS);

for (const name of files) {
  if (!name.endsWith(".md")) continue;
  const path = join(PE_CUS, name);
  const raw = await readFile(path, "utf-8");
  const { data, content } = matter(raw);

  const m = name.match(/-(\d{4})\.md$/);
  if (!m || !m[1]) continue;
  const year = m[1];
  const estimatedDate = `${year}-01-01`;

  if (data.publication_date === estimatedDate) {
    console.log(`skip ${name}: already fixed`);
    continue;
  }

  const newFm = {
    ...data,
    publication_date: estimatedDate,
    last_updated: estimatedDate,
    date_precision: "year",
    notes:
      "Publication date estimated from identifier year. The PDF is a scanned image; exact date is not extractable without OCR.",
  };
  const newContent = matter.stringify(content, newFm);
  await writeFile(path, newContent, "utf-8");

  execSync(`git -C "${CORPUS}" add pe-cus/${name}`, { stdio: "ignore" });

  const id = name.replace(/\.md$/, "");
  const gitDate = gitSafeAuthorDate(estimatedDate);
  const msg = `[correction] ${id} fix placeholder date to year-only estimate

The initial fetch (V1.3) used the fetch day as a placeholder for
publication_date because gob.pe detail pages and scanned PDFs do not
expose the exact date. This correction sets the date to the year inferred
from the identifier (${year}) and flags the precision via
date_precision: "year".

Source-Id: ${id}
Source-Date: ${estimatedDate}
Norm-Id: ${id}
`;

  const env = {
    PATH: process.env.PATH ?? "",
    HOME: process.env.HOME ?? "",
    GIT_AUTHOR_NAME: CRAFTERNAUTA_NAME,
    GIT_AUTHOR_EMAIL: CRAFTERNAUTA_EMAIL,
    GIT_AUTHOR_DATE: gitDate,
    GIT_COMMITTER_NAME: CRAFTERNAUTA_NAME,
    GIT_COMMITTER_EMAIL: CRAFTERNAUTA_EMAIL,
    GIT_COMMITTER_DATE: gitDate,
  };

  const msgFile = join(CORPUS, ".git", "COMMIT_EDITMSG.fix-cusco");
  await writeFile(msgFile, msg, "utf-8");
  execSync(`git -C "${CORPUS}" commit -q -F "${msgFile}"`, { env, stdio: "ignore" });
  console.log(`fixed ${name}: ${estimatedDate}`);
}

console.log("\ndone");
