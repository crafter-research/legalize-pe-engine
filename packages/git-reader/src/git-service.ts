import { type SimpleGit, simpleGit } from "simple-git";
import { contentCache, diffCache, historyCache } from "./cache";
import { parsePatch } from "./diff-parser";
import type { CommitInfo, DiffHunk, DiffResult, FileVersion } from "./types";

interface LogEntry {
  hash: string;
  shortHash: string;
  authorDate: string;
  commitDate: string;
  message: string;
  subject: string;
}

export class GitService {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }

  private resolveFilePath(identificador: string, resolvedPath?: string): string {
    return resolvedPath ?? `pe/${identificador}.md`;
  }

  async hasHistory(identificador: string, resolvedPath?: string): Promise<boolean> {
    try {
      const filePath = this.resolveFilePath(identificador, resolvedPath);
      const log = await this.git.log({ file: filePath, maxCount: 1 });
      return log.total > 0;
    } catch {
      return false;
    }
  }

  async getHistory(identificador: string, resolvedPath?: string): Promise<CommitInfo[]> {
    const cacheKey = `history:${identificador}`;
    const cached = historyCache.get(cacheKey) as CommitInfo[] | undefined;
    if (cached) return cached;

    const filePath = this.resolveFilePath(identificador, resolvedPath);

    const log = await this.git.log({
      file: filePath,
      format: {
        hash: "%H",
        shortHash: "%h",
        authorDate: "%aI",
        commitDate: "%cI",
        message: "%B",
        subject: "%s",
      },
    });

    const commits: CommitInfo[] = log.all.map((commit) => {
      const entry = commit as unknown as LogEntry;
      return {
        hash: entry.hash,
        shortHash: entry.shortHash || entry.hash.slice(0, 7),
        authorDate: entry.authorDate,
        commitDate: entry.commitDate,
        message: entry.message,
        subject: entry.subject || entry.message.split("\n")[0] || "",
      };
    });

    historyCache.set(cacheKey, commits);
    return commits;
  }

  async getContentAtCommit(
    identificador: string,
    commitHash: string,
    resolvedPath?: string,
  ): Promise<FileVersion> {
    const cacheKey = `content:${identificador}:${commitHash}`;
    const cached = contentCache.get(cacheKey) as FileVersion | undefined;
    if (cached) return cached;

    const filePath = this.resolveFilePath(identificador, resolvedPath);

    const content = await this.git.show([`${commitHash}:${filePath}`]);

    const log = await this.git.log({
      maxCount: 1,
      from: commitHash,
      to: commitHash,
      format: {
        authorDate: "%aI",
        message: "%B",
      },
    });

    const commit = log.latest as unknown as { authorDate: string; message: string } | undefined;
    const result: FileVersion = {
      hash: commitHash,
      authorDate: commit?.authorDate ?? "",
      content,
      message: commit?.message ?? "",
    };

    contentCache.set(cacheKey, result);
    return result;
  }

  async getDiff(
    identificador: string,
    fromHash: string,
    toHash: string,
    resolvedPath?: string,
  ): Promise<DiffResult> {
    const cacheKey = `diff:${identificador}:${fromHash}:${toHash}`;
    const cached = diffCache.get(cacheKey) as DiffResult | undefined;
    if (cached) return cached;

    const filePath = this.resolveFilePath(identificador, resolvedPath);

    const diff = await this.git.diff([fromHash, toHash, "--", filePath]);

    const [fromLog, toLog] = await Promise.all([
      this.git.log({
        maxCount: 1,
        from: fromHash,
        to: fromHash,
        format: { authorDate: "%aI" },
      }),
      this.git.log({
        maxCount: 1,
        from: toHash,
        to: toHash,
        format: { authorDate: "%aI" },
      }),
    ]);

    const fromCommit = fromLog.latest as unknown as { authorDate: string } | undefined;
    const toCommit = toLog.latest as unknown as { authorDate: string } | undefined;

    const hunks = parsePatch(diff);
    const stats = this.calculateStats(hunks);

    const result: DiffResult = {
      fromHash,
      toHash,
      fromDate: fromCommit?.authorDate ?? "",
      toDate: toCommit?.authorDate ?? "",
      hunks,
      stats,
    };

    diffCache.set(cacheKey, result);
    return result;
  }

  private calculateStats(hunks: DiffHunk[]): {
    additions: number;
    deletions: number;
  } {
    let additions = 0;
    let deletions = 0;

    for (const hunk of hunks) {
      for (const line of hunk.lines) {
        if (line.type === "add") additions++;
        if (line.type === "del") deletions++;
      }
    }

    return { additions, deletions };
  }
}
