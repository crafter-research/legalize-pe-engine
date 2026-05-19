import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { GitService } from './git-service.js'

// This test suite requires being run in a git repository
describe('GitService', () => {
  let gitService: GitService
  let repoPath: string

  beforeAll(() => {
    // Determine repo path - go up from packages/git to repo root
    repoPath = resolve(__dirname, '../../../')
    gitService = new GitService(repoPath)
  })

  it('should initialize with repo path', () => {
    expect(gitService).toBeDefined()
    expect(existsSync(resolve(repoPath, '.git'))).toBe(true)
  })

  it('should check if a law has history', async () => {
    // Test with a law that should have history (Constitution)
    const hasHistory = await gitService.hasHistory('dleg-295')
    expect(typeof hasHistory).toBe('boolean')
  })

  it('should return false for non-existent law', async () => {
    const hasHistory = await gitService.hasHistory('non-existent-law-123')
    expect(hasHistory).toBe(false)
  })
})
