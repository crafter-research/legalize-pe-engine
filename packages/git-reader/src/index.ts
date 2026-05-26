import { GitService } from "./git-service";
import { GitHubService } from "./github-service";

export { GitService } from "./git-service";
export { GitHubService } from "./github-service";
export type {
  CommitInfo,
  FileVersion,
  DiffResult,
  DiffHunk,
  DiffLine,
} from "./types";

export function createGitService(repoPath?: string) {
  if (process.env.VERCEL || !repoPath) {
    return new GitHubService();
  }
  return new GitService(repoPath);
}
