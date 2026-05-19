import { type SimpleGit, simpleGit } from 'simple-git'
import { contentCache, diffCache, historyCache } from './cache.js'
import type { CommitInfo, DiffHunk, DiffResult, FileVersion } from './types.js'

interface LogEntry {
  hash: string
  shortHash: string
  authorDate: string
  commitDate: string
  message: string
  subject: string
}

export class GitService {
  private git: SimpleGit
  private repoPath: string

  constructor(repoPath: string) {
    this.repoPath = repoPath
    this.git = simpleGit(repoPath)
  }

  private getFilePath(identificador: string): string {
    return `leyes/pe/${identificador}.md`
  }

  async hasHistory(identificador: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(identificador)
      const log = await this.git.log({ file: filePath, maxCount: 1 })
      return log.total > 0
    } catch {
      return false
    }
  }

  async getHistory(identificador: string): Promise<CommitInfo[]> {
    const cacheKey = `history:${identificador}`
    const cached = historyCache.get(cacheKey) as CommitInfo[] | undefined
    if (cached) return cached

    const filePath = this.getFilePath(identificador)

    const log = await this.git.log({
      file: filePath,
      format: {
        hash: '%H',
        shortHash: '%h',
        authorDate: '%aI',
        commitDate: '%cI',
        message: '%B',
        subject: '%s',
      },
    })

    const commits: CommitInfo[] = log.all.map((commit) => {
      const entry = commit as unknown as LogEntry
      return {
        hash: entry.hash,
        shortHash: entry.shortHash || entry.hash.slice(0, 7),
        authorDate: entry.authorDate,
        commitDate: entry.commitDate,
        message: entry.message,
        subject: entry.subject || entry.message.split('\n')[0] || '',
      }
    })

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

    const content = await this.git.show([`${commitHash}:${filePath}`])

    const log = await this.git.log({
      maxCount: 1,
      from: commitHash,
      to: commitHash,
      format: {
        authorDate: '%aI',
        message: '%B',
      },
    })

    const commit = log.latest as unknown as
      | { authorDate: string; message: string }
      | undefined
    const result: FileVersion = {
      hash: commitHash,
      authorDate: commit?.authorDate ?? '',
      content,
      message: commit?.message ?? '',
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

    const diff = await this.git.diff([fromHash, toHash, '--', filePath])

    const [fromLog, toLog] = await Promise.all([
      this.git.log({
        maxCount: 1,
        from: fromHash,
        to: fromHash,
        format: { authorDate: '%aI' },
      }),
      this.git.log({
        maxCount: 1,
        from: toHash,
        to: toHash,
        format: { authorDate: '%aI' },
      }),
    ])

    const fromCommit = fromLog.latest as unknown as
      | { authorDate: string }
      | undefined
    const toCommit = toLog.latest as unknown as
      | { authorDate: string }
      | undefined

    const hunks = this.parseDiff(diff)
    const stats = this.calculateStats(hunks)

    const result: DiffResult = {
      fromHash,
      toHash,
      fromDate: fromCommit?.authorDate ?? '',
      toDate: toCommit?.authorDate ?? '',
      hunks,
      stats,
    }

    diffCache.set(cacheKey, result)
    return result
  }

  private parseDiff(diffOutput: string): DiffHunk[] {
    const hunks: DiffHunk[] = []
    const lines = diffOutput.split('\n')

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

      if (line.startsWith('+') && !line.startsWith('+++')) {
        currentHunk.lines.push({
          type: 'add',
          content: line.slice(1),
          newLine: newLine++,
        })
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        currentHunk.lines.push({
          type: 'del',
          content: line.slice(1),
          oldLine: oldLine++,
        })
      } else if (line.startsWith(' ')) {
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

  private calculateStats(hunks: DiffHunk[]): {
    additions: number
    deletions: number
  } {
    let additions = 0
    let deletions = 0

    for (const hunk of hunks) {
      for (const line of hunk.lines) {
        if (line.type === 'add') additions++
        if (line.type === 'del') deletions++
      }
    }

    return { additions, deletions }
  }
}
