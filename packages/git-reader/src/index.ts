export { GitService } from './git-service.js'
export { GitHubService } from './github-service.js'
export type {
  CommitInfo,
  FileVersion,
  DiffResult,
  DiffHunk,
  DiffLine,
} from './types.js'

export function createGitService(repoPath?: string) {
  // Use GitHubService in production (serverless), GitService locally
  if (process.env.VERCEL || !repoPath) {
    const { GitHubService } = require('./github-service.js')
    return new GitHubService()
  }
  const { GitService } = require('./git-service.js')
  return new GitService(repoPath)
}
