import { db, schema } from '@/db'
import { and, gte, lt, sql } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ year: string; month: string }> },
) {
  const { year, month } = await params

  // Validate year and month
  const yearNum = Number.parseInt(year)
  const monthNum = Number.parseInt(month)

  if (
    Number.isNaN(yearNum) ||
    Number.isNaN(monthNum) ||
    monthNum < 1 ||
    monthNum > 12 ||
    yearNum < 1900 ||
    yearNum > 2100
  ) {
    return NextResponse.json({ error: 'Año o mes inválido' }, { status: 400 })
  }

  const monthStr = month.padStart(2, '0')
  const startDate = `${year}-${monthStr}-01`

  // Calculate end date (first day of next month)
  const nextMonth = monthNum === 12 ? 1 : monthNum + 1
  const nextYear = monthNum === 12 ? yearNum + 1 : yearNum
  const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

  try {
    // Get count of normas per day
    const calendario = await db
      .select({
        fecha: schema.normas.fechaPublicacion,
        count: sql<number>`count(*)`,
      })
      .from(schema.normas)
      .where(
        and(
          gte(schema.normas.fechaPublicacion, startDate),
          lt(schema.normas.fechaPublicacion, endDate),
        ),
      )
      .groupBy(schema.normas.fechaPublicacion)
      .orderBy(schema.normas.fechaPublicacion)

    // Get total for the month
    const total = calendario.reduce((sum, day) => sum + day.count, 0)

    return NextResponse.json({
      data: calendario,
      meta: {
        year: yearNum,
        month: monthNum,
        total,
      },
    })
  } catch (error) {
    console.error('Error fetching calendar:', error)
    return NextResponse.json(
      { error: 'Error al obtener el calendario' },
      { status: 500 },
    )
  }
}
