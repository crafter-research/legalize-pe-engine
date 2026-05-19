import { db, schema } from '@/db'
import { and, desc, eq, gte, inArray, like, lte, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  // Query parameters
  const q = searchParams.get('q')
  const tipo = searchParams.get('tipo')
  const jurisdiccion = searchParams.get('jurisdiccion')
  const estado = searchParams.get('estado')
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')
  const limit = Math.min(
    Number.parseInt(searchParams.get('limit') || '20'),
    100,
  )
  const offset = Number.parseInt(searchParams.get('offset') || '0')

  try {
    // Build conditions
    const conditions = []

    if (q) {
      conditions.push(
        sql`(${schema.normas.titulo} LIKE ${`%${q}%`} OR ${schema.normas.contenido} LIKE ${`%${q}%`})`,
      )
    }

    if (tipo) {
      const tipos = tipo.split(',')
      conditions.push(inArray(schema.normas.rango, tipos))
    }

    if (jurisdiccion) {
      const jurisdicciones = jurisdiccion.split(',')
      conditions.push(inArray(schema.normas.jurisdiccion, jurisdicciones))
    }

    if (estado) {
      conditions.push(eq(schema.normas.estado, estado))
    }

    if (desde) {
      conditions.push(gte(schema.normas.fechaPublicacion, desde))
    }

    if (hasta) {
      conditions.push(lte(schema.normas.fechaPublicacion, hasta))
    }

    // Execute query
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [normas, countResult] = await Promise.all([
      db
        .select({
          identificador: schema.normas.identificador,
          titulo: schema.normas.titulo,
          jurisdiccion: schema.normas.jurisdiccion,
          rango: schema.normas.rango,
          sector: schema.normas.sector,
          fechaPublicacion: schema.normas.fechaPublicacion,
          estado: schema.normas.estado,
        })
        .from(schema.normas)
        .where(whereClause)
        .orderBy(desc(schema.normas.fechaPublicacion))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(schema.normas)
        .where(whereClause),
    ])

    const total = countResult[0]?.count ?? 0

    return NextResponse.json({
      data: normas,
      meta: {
        total,
        limit,
        offset,
      },
    })
  } catch (error) {
    console.error('Error fetching normas:', error)
    return NextResponse.json(
      { error: 'Error al obtener las normas' },
      { status: 500 },
    )
  }
}
