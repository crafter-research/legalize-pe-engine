import path from 'node:path'
import { GitService } from '@legalize-pe/git-reader'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)

  const from = searchParams.get('from')
  const to = searchParams.get('to')

  if (!from || !to) {
    return NextResponse.json(
      { error: 'Se requieren los parámetros "from" y "to"' },
      { status: 400 },
    )
  }

  try {
    // Go up from apps/api to monorepo root
    const repoPath = path.join(process.cwd(), '..', '..')
    const gitService = new GitService(repoPath)

    const diff = await gitService.getDiff(id, from, to)

    return NextResponse.json({
      data: diff,
    })
  } catch (error) {
    console.error('Error fetching diff:', error)
    return NextResponse.json(
      { error: 'Error al obtener las diferencias' },
      { status: 500 },
    )
  }
}
