/**
 * Git publisher — commits to the corpus repo with Crafternauta bot identity
 * and SPEC v0.2 trailers.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  CRAFTERNAUTA_EMAIL,
  CRAFTERNAUTA_NAME,
  type CommitType,
  type SpecFrontmatter,
  gitSafeAuthorDate,
} from "@legalize-pe/core";
import matter from "gray-matter";
import { type SimpleGit, simpleGit } from "simple-git";

export interface PublishInput {
  corpusRoot: string; // absolute path to the legalize-pe corpus repo on disk
  relativePath: string; // e.g. "pe-cus/OR-001-2025-CUS.md"
  frontmatter: SpecFrontmatter;
  body: string;
  commit: {
    type: CommitType;
    title: string;
    articles_affected?: string[];
    trailers: {
      "Source-Id": string;
      "Source-Date": string;
      "Norm-Id": string;
    };
  };
}

export class GitPublisher {
  private git: SimpleGit;

  constructor(public corpusRoot: string) {
    this.git = simpleGit(corpusRoot);
  }

  async commitNorm(input: PublishInput): Promise<string> {
    const absPath = join(input.corpusRoot, input.relativePath);
    await mkdir(dirname(absPath), { recursive: true });

    const content = matter.stringify(
      input.body,
      input.frontmatter as unknown as Record<string, unknown>,
    );
    await writeFile(absPath, content, "utf-8");

    await this.git.add(input.relativePath);

    const message = formatCommitMessage(input.commit);
    const authorDate = gitSafeAuthorDate(input.frontmatter.publication_date);

    // simple-git's .commit() doesn't expose env, so use raw with env
    const env = {
      ...process.env,
      GIT_AUTHOR_NAME: CRAFTERNAUTA_NAME,
      GIT_AUTHOR_EMAIL: CRAFTERNAUTA_EMAIL,
      GIT_AUTHOR_DATE: authorDate,
      GIT_COMMITTER_NAME: CRAFTERNAUTA_NAME,
      GIT_COMMITTER_EMAIL: CRAFTERNAUTA_EMAIL,
      GIT_COMMITTER_DATE: authorDate,
    };

    await this.git.env(env).commit(message);
    const head = await this.git.revparse(["HEAD"]);
    return head.trim();
  }
}

export function formatCommitMessage(commit: PublishInput["commit"]): string {
  const articlesSuffix =
    commit.articles_affected && commit.articles_affected.length > 0
      ? ` — art. ${commit.articles_affected.join(", ")}`
      : "";
  const subject = `[${commit.type}] ${commit.title}${articlesSuffix}`;

  const trailers = [
    `Source-Id: ${commit.trailers["Source-Id"]}`,
    `Source-Date: ${commit.trailers["Source-Date"]}`,
    `Norm-Id: ${commit.trailers["Norm-Id"]}`,
  ].join("\n");

  return `${subject}\n\n${trailers}\n`;
}
