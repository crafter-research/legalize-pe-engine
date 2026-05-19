import { db, schema } from '@/db'
import { desc, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const [totalResult, porTipo, porJurisdiccion, ultimaActualizacion] =
      await Promise.all([
        // Total normas
        db
          .select({ count: sql<number>`count(*)` })
          .from(schema.normas),

        // Por tipo (rango)
        db
          .select({
            rango: schema.normas.rango,
            count: sql<number>`count(*)`,
          })
          .from(schema.normas)
          .groupBy(schema.normas.rango)
          .orderBy(desc(sql`count(*)`)),

        // Por jurisdicción
        db
          .select({
            jurisdiccion: schema.normas.jurisdiccion,
            count: sql<number>`count(*)`,
          })
          .from(schema.normas)
          .groupBy(schema.normas.jurisdiccion)
          .orderBy(desc(sql`count(*)`)),

        // Última actualización
        db
          .select({
            ultimaActualizacion: schema.normas.ultimaActualizacion,
          })
          .from(schema.normas)
          .orderBy(desc(schema.normas.ultimaActualizacion))
          .limit(1),
      ])

    return NextResponse.json({
      data: {
        total: totalResult[0]?.count ?? 0,
        porTipo,
        porJurisdiccion,
        ultimaActualizacion:
          ultimaActualizacion[0]?.ultimaActualizacion ?? null,
      },
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Error al obtener las estadísticas' },
      { status: 500 },
    )
  }
}
