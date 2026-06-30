import { contentCache, diffCache, historyCache } from "./cache";
import { parsePatch } from "./diff-parser";
import type { CommitInfo, DiffResult, FileVersion } from "./types";

const GITHUB_REPO = "crafter-research/legalize-pe";
const GITHUB_API = "https://api.github.com";

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      date: string;
    };
    committer: {
      date: string;
    };
  };
}

// Carries the upstream HTTP status so callers can tell a missing commit/file
// (404/422 = client error) apart from a real GitHub outage (5xx = server error).
export class GitHubApiError extends Error {
  constructor(public status: number) {
    super(`GitHub API error: ${status}`);
    this.name = "GitHubApiError";
  }
}

export class GitHubService {
  /**
   * Resolve the corpus-relative file path for `identificador`.
   *
   * The caller (API route) passes the path resolved from `id-path-map.json`
   * so this service never needs to reconstruct it from the id. If the caller
   * has already resolved the path it is passed directly; otherwise falls back
   * to the legacy `pe/<id>.md` pattern (only valid for old national-only ids).
   */
  private resolveFilePath(identificador: string, resolvedPath?: string): string {
    return resolvedPath ?? `pe/${identificador}.md`;
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "legalize-pe",
    };
    // Optional token raises the GitHub API rate limit from 60 to 5,000 req/h.
    const token = process.env.GITHUB_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  async hasHistory(identificador: string, resolvedPath?: string): Promise<boolean> {
    try {
      const commits = await this.getHistory(identificador, resolvedPath);
      return commits.length > 0;
    } catch {
      return false;
    }
  }

  async getHistory(identificador: string, resolvedPath?: string): Promise<CommitInfo[]> {
    const cacheKey = `history:${identificador}`;
    const cached = historyCache.get(cacheKey) as CommitInfo[] | undefined;
    if (cached) return cached;

    const filePath = this.resolveFilePath(identificador, resolvedPath);
    const url = `${GITHUB_API}/repos/${GITHUB_REPO}/commits?path=${encodeURIComponent(filePath)}&per_page=100`;

    const res = await fetch(url, {
      headers: this.headers(),
    });

    if (!res.ok) {
      throw new GitHubApiError(res.status);
    }

    const data = (await res.json()) as GitHubCommit[];

    const commits: CommitInfo[] = data.map((commit) => ({
      hash: commit.sha,
      shortHash: commit.sha.slice(0, 7),
      authorDate: commit.commit.author.date,
      commitDate: commit.commit.committer.date,
      message: commit.commit.message,
      subject: commit.commit.message.split("\n")[0] || "",
    }));

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

    const contentUrl = `${GITHUB_API}/repos/${GITHUB_REPO}/contents/${encodeURIComponent(filePath)}?ref=${commitHash}`;
    const contentRes = await fetch(contentUrl, {
      headers: this.headers(),
    });

    if (!contentRes.ok) {
      throw new GitHubApiError(contentRes.status);
    }

    const contentData = (await contentRes.json()) as {
      content: string;
      encoding: string;
    };
    const content = Buffer.from(contentData.content, "base64").toString("utf-8");

    const commitUrl = `${GITHUB_API}/repos/${GITHUB_REPO}/commits/${commitHash}`;
    const commitRes = await fetch(commitUrl, {
      headers: this.headers(),
    });

    let authorDate = "";
    let message = "";
    if (commitRes.ok) {
      const commitData = (await commitRes.json()) as GitHubCommit;
      authorDate = commitData.commit.author.date;
      message = commitData.commit.message;
    }

    const result: FileVersion = {
      hash: commitHash,
      authorDate,
      content,
      message,
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

    const compareUrl = `${GITHUB_API}/repos/${GITHUB_REPO}/compare/${fromHash}...${toHash}`;
    const compareRes = await fetch(compareUrl, {
      headers: this.headers(),
    });

    if (!compareRes.ok) {
      throw new GitHubApiError(compareRes.status);
    }

    const compareData = (await compareRes.json()) as {
      files: Array<{
        filename: string;
        patch?: string;
        additions: number;
        deletions: number;
      }>;
      base_commit: { commit: { author: { date: string } } };
      commits: Array<{ commit: { author: { date: string } } }>;
    };

    const file = compareData.files.find((f) => f.filename === filePath);
    const hunks = file?.patch ? parsePatch(file.patch) : [];

    const result: DiffResult = {
      fromHash,
      toHash,
      fromDate: compareData.base_commit?.commit?.author?.date ?? "",
      toDate: compareData.commits?.[compareData.commits.length - 1]?.commit?.author?.date ?? "",
      hunks,
      stats: {
        additions: file?.additions ?? 0,
        deletions: file?.deletions ?? 0,
      },
    };

    diffCache.set(cacheKey, result);
    return result;
  }
}
