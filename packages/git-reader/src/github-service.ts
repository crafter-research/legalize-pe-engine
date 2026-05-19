import { contentCache, diffCache, historyCache } from './cache.js'
import type { CommitInfo, DiffHunk, DiffResult, FileVersion } from './types.js'

const GITHUB_REPO = 'crafter-research/legalize-pe'
const GITHUB_API = 'https://api.github.com'

interface GitHubCommit {
  sha: string
  commit: {
    message: string
    author: {
      date: string
    }
    committer: {
      date: string
    }
  }
}

export class GitHubService {
  private getFilePath(identificador: string): string {
    return `leyes/pe/${identificador}.md`
  }

  async hasHistory(identificador: string): Promise<boolean> {
    try {
      const commits = await this.getHistory(identificador)
      return commits.length > 0
    } catch {
      return false
    }
  }

  async getHistory(identificador: string): Promise<CommitInfo[]> {
    const cacheKey = `history:${identificador}`
    const cached = historyCache.get(cacheKey) as CommitInfo[] | undefined
    if (cached) return cached

    const filePath = this.getFilePath(identificador)
    const url = `${GITHUB_API}/repos/${GITHUB_REPO}/commits?path=${encodeURIComponent(filePath)}&per_page=100`

    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'legalize-pe',
      },
    })

    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status}`)
    }

    const data = (await res.json()) as GitHubCommit[]

    const commits: CommitInfo[] = data.map((commit) => ({
      hash: commit.sha,
      shortHash: commit.sha.slice(0, 7),
      authorDate: commit.commit.author.date,
      commitDate: commit.commit.committer.date,
      message: commit.commit.message,
      subject: commit.commit.message.split('\n')[0] || '',
    }))

    historyCache.set(cacheKey, commits)
    return commits
  }

  async getContentAtCommit(
    identificador: string,
    commitHash: string,
  ): Promise<FileVersion> {
    const cacheKey = `content:${identificador}:${commitHash}`
    const cached = contentCache.get(cacheKey) as FileVersion | undefined
    if (cached) return cached

    const filePath = this.getFilePath(identificador)

    const contentUrl = `${GITHUB_API}/repos/${GITHUB_REPO}/contents/${encodeURIComponent(filePath)}?ref=${commitHash}`
    const contentRes = await fetch(contentUrl, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'legalize-pe',
      },
    })

    if (!contentRes.ok) {
      throw new Error(`GitHub API error: ${contentRes.status}`)
    }

    const contentData = (await contentRes.json()) as {
      content: string
      encoding: string
    }
    const content = Buffer.from(contentData.content, 'base64').toString('utf-8')

    const commitUrl = `${GITHUB_API}/repos/${GITHUB_REPO}/commits/${commitHash}`
    const commitRes = await fetch(commitUrl, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'legalize-pe',
      },
    })

    let authorDate = ''
    let message = ''
    if (commitRes.ok) {
      const commitData = (await commitRes.json()) as GitHubCommit
      authorDate = commitData.commit.author.date
      message = commitData.commit.message
    }

    const result: FileVersion = {
      hash: commitHash,
      authorDate,
      content,
      message,
    }

    contentCache.set(cacheKey, result)
    return result
  }

  async getDiff(
    identificador: string,
    fromHash: string,
    toHash: string,
  ): Promise<DiffResult> {
    const cacheKey = `diff:${identificador}:${fromHash}:${toHash}`
    const cached = diffCache.get(cacheKey) as DiffResult | undefined
    if (cached) return cached

    const filePath = this.getFilePath(identificador)

    const compareUrl = `${GITHUB_API}/repos/${GITHUB_REPO}/compare/${fromHash}...${toHash}`
    const compareRes = await fetch(compareUrl, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'legalize-pe',
      },
    })

    if (!compareRes.ok) {
      throw new Error(`GitHub API error: ${compareRes.status}`)
    }

    const compareData = (await compareRes.json()) as {
      files: Array<{
        filename: string
        patch?: string
        additions: number
        deletions: number
      }>
      base_commit: { commit: { author: { date: string } } }
      commits: Array<{ commit: { author: { date: string } } }>
    }

    const file = compareData.files.find((f) => f.filename === filePath)
    const hunks = file?.patch ? this.parsePatch(file.patch) : []

    const result: DiffResult = {
      fromHash,
      toHash,
      fromDate: compareData.base_commit?.commit?.author?.date ?? '',
      toDate:
        compareData.commits?.[compareData.commits.length - 1]?.commit?.author
          ?.date ?? '',
      hunks,
      stats: {
        additions: file?.additions ?? 0,
        deletions: file?.deletions ?? 0,
      },
    }

    diffCache.set(cacheKey, result)
    return result
  }

  private parsePatch(patch: string): DiffHunk[] {
    const hunks: DiffHunk[] = []
    const lines = patch.split('\n')

    let currentHunk: DiffHunk | null = null
    let oldLine = 0
    let newLine = 0

    for (const line of lines) {
      const hunkMatch = line.match(
        /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/,
      )

      if (hunkMatch) {
        if (currentHunk) hunks.push(currentHunk)

        const oldStart = hunkMatch[1]
        const newStart = hunkMatch[3]
        if (!oldStart || !newStart) continue

        oldLine = Number.parseInt(oldStart, 10)
        newLine = Number.parseInt(newStart, 10)

        currentHunk = {
          oldStart: oldLine,
          oldLines: Number.parseInt(hunkMatch[2] ?? '1', 10),
          newStart: newLine,
          newLines: Number.parseInt(hunkMatch[4] ?? '1', 10),
          lines: [],
        }
        continue
      }

      if (!currentHunk) continue

      if (line.startsWith('+')) {
        currentHunk.lines.push({
          type: 'add',
          content: line.slice(1),
          newLine: newLine++,
        })
      } else if (line.startsWith('-')) {
        currentHunk.lines.push({
          type: 'del',
          content: line.slice(1),
          oldLine: oldLine++,
        })
      } else if (line.startsWith(' ') || line === '') {
        currentHunk.lines.push({
          type: 'context',
          content: line.slice(1),
          oldLine: oldLine++,
          newLine: newLine++,
        })
      }
    }

    if (currentHunk) hunks.push(currentHunk)
    return hunks
  }
}
