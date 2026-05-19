import { db, schema } from '@/db'
import { desc, eq } from 'drizzle-orm'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fecha: string }> },
) {
  const { fecha } = await params

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
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
        sector: schema.normas.sector,
        fechaPublicacion: schema.normas.fechaPublicacion,
        estado: schema.normas.estado,
      })
      .from(schema.normas)
      .where(eq(schema.normas.fechaPublicacion, fecha))
      .orderBy(desc(schema.normas.rango))

    return NextResponse.json({
      data: normas,
      meta: {
        fecha,
        total: normas.length,
      },
    })
  } catch (error) {
    console.error('Error fetching normas by date:', error)
    return NextResponse.json(
      { error: 'Error al obtener las normas' },
      { status: 500 },
    )
  }
}
