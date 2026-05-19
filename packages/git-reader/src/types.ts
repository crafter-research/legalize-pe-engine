export interface CommitInfo {
  hash: string
  shortHash: string
  authorDate: string
  commitDate: string
  message: string
  subject: string
}

export interface FileVersion {
  hash: string
  authorDate: string
  content: string
  message: string
}

export interface DiffLine {
  type: 'add' | 'del' | 'context'
  content: string
  oldLine?: number
  newLine?: number
}

export interface DiffHunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: DiffLine[]
}

export interface DiffResult {
  fromHash: string
  toHash: string
  fromDate: string
  toDate: string
  hunks: DiffHunk[]
  stats: {
    additions: number
    deletions: number
  }
}
