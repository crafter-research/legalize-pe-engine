import { db, schema } from '@/db'
import { desc, gte, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const desde = searchParams.get('desde')
  const limit = Math.min(
    Number.parseInt(searchParams.get('limit') || '50'),
    100,
  )

  if (!desde) {
    return NextResponse.json(
      { error: 'Parámetro "desde" es requerido (YYYY-MM-DD)' },
      { status: 400 },
    )
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde)) {
    return NextResponse.json(
      { error: 'Formato de fecha inválido. Use YYYY-MM-DD' },
      { status: 400 },
    )
  }

  try {
    const normas = await db
      .select({
        identificador: schema.normas.identificador,
        titulo: schema.normas.titulo,
        jurisdiccion: schema.normas.jurisdiccion,
        rango: schema.normas.rango,
        ultimaActualizacion: schema.normas.ultimaActualizacion,
        estado: schema.normas.estado,
      })
      .from(schema.normas)
      .where(gte(schema.normas.ultimaActualizacion, desde))
      .orderBy(desc(schema.normas.ultimaActualizacion))
      .limit(limit)

    return NextResponse.json({
      data: normas,
      meta: {
        desde,
        total: normas.length,
      },
    })
  } catch (error) {
    console.error('Error fetching updated normas:', error)
    return NextResponse.json(
      { error: 'Error al obtener las normas actualizadas' },
      { status: 500 },
    )
  }
}
