import { db, schema } from '@/db'
import { eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  try {
    const norma = await db
      .select()
      .from(schema.normas)
      .where(eq(schema.normas.identificador, id))
      .limit(1)

    if (norma.length === 0) {
      return NextResponse.json(
        { error: 'Norma no encontrada' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      data: norma[0],
    })
  } catch (error) {
    console.error('Error fetching norma:', error)
    return NextResponse.json(
      { error: 'Error al obtener la norma' },
      { status: 500 },
    )
  }
}
