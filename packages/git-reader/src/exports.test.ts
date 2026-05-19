import { describe, expect, it } from 'vitest'
import { GitService } from './index.js'
import type { CommitInfo, DiffHunk, DiffResult, FileVersion } from './index.js'

describe('Package Exports', () => {
  it('should export GitService class', () => {
    expect(GitService).toBeDefined()
    expect(typeof GitService).toBe('function')
  })

  it('should have correct TypeScript types', () => {
    const commitInfo: CommitInfo = {
      hash: 'abc123',
      shortHash: 'abc',
      authorDate: '2024-01-01',
      commitDate: '2024-01-01',
      message: 'test',
      subject: 'test',
    }
    expect(commitInfo).toBeDefined()

    const fileVersion: FileVersion = {
      hash: 'abc123',
      authorDate: '2024-01-01',
      content: 'test content',
      message: 'test',
    }
    expect(fileVersion).toBeDefined()

    const diffHunk: DiffHunk = {
      oldStart: 1,
      oldLines: 1,
      newStart: 1,
      newLines: 1,
      lines: [],
    }
    expect(diffHunk).toBeDefined()

    const diffResult: DiffResult = {
      fromHash: 'abc123',
      toHash: 'def456',
      fromDate: '2024-01-01',
      toDate: '2024-01-02',
      hunks: [diffHunk],
      stats: {
        additions: 1,
        deletions: 1,
      },
    }
    expect(diffResult).toBeDefined()
  })
})
