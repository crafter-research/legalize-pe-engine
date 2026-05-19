import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { APIRoute } from 'astro'
import type { CompactLey } from '../../../lib/search-index'
import { intelligentSearch } from '../../../lib/smart-search'

export const prerender = false

// Cache search index at module scope to avoid disk reads on every request
let cachedLaws: CompactLey[] | null = null

function getSearchIndex(): CompactLey[] {
  if (!cachedLaws) {
    const indexPath = join(process.cwd(), 'public', 'search-index.json')
    cachedLaws = JSON.parse(readFileSync(indexPath, 'utf-8')) as CompactLey[]
  }
  return cachedLaws as CompactLey[]
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json()
    const { query, page = 1, limit = 20 } = body

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({
          error: 'Query parameter is required and must be a string',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    // Validate and normalize pagination parameters
    const pageNum = Math.max(1, Number(page) || 1)
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20))

    // Load search index from cache
    const laws = getSearchIndex()

    // Perform intelligent search - get more results than needed for pagination
    const allResults = intelligentSearch(query, laws, 1000)

    // Calculate pagination
    const total = allResults.length
    const totalPages = Math.ceil(total / limitNum)
    const startIndex = (pageNum - 1) * limitNum
    const endIndex = startIndex + limitNum
    const paginatedResults = allResults.slice(startIndex, endIndex)

    return new Response(
      JSON.stringify({
        query,
        results: paginatedResults.map((r) => ({
          id: r.law.id,
          titulo: r.law.t,
          rango: r.law.r,
          estado: r.law.e ?? 'vigente',
          fechaPublicacion: r.law.f,
          bodyPreview: r.law.b,
          materias: r.law.m ?? [],
          score: r.score,
          matchReasons: r.matchReasons,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('Smart search error:', error)
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}
