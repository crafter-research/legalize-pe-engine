import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const normas = sqliteTable(
  'normas',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    identificador: text('identificador').notNull().unique(),
    titulo: text('titulo').notNull(),
    pais: text('pais').notNull().default('pe'),
    jurisdiccion: text('jurisdiccion').notNull(),
    rango: text('rango').notNull(),
    sector: text('sector'),
    fechaPublicacion: text('fecha_publicacion').notNull(),
    fechaPromulgacion: text('fecha_promulgacion'),
    fechaVigencia: text('fecha_vigencia'),
    ultimaActualizacion: text('ultima_actualizacion'),
    estado: text('estado').notNull().default('vigente'),
    fuente: text('fuente'),
    fuenteAlternativa: text('fuente_alternativa'),
    diarioOficial: text('diario_oficial').default('El Peruano'),
    sumilla: text('sumilla'),
    materias: text('materias'), // JSON array as text
    spijId: text('spij_id'),
    contenido: text('contenido').notNull(),
    contenidoTexto: text('contenido_texto'), // Plain text for FTS
    createdAt: text('created_at').default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').default(sql`(datetime('now'))`),
  },
  (table) => [
    index('idx_identificador').on(table.identificador),
    index('idx_jurisdiccion').on(table.jurisdiccion),
    index('idx_rango').on(table.rango),
    index('idx_estado').on(table.estado),
    index('idx_fecha_publicacion').on(table.fechaPublicacion),
    index('idx_spij_id').on(table.spijId),
  ],
)

export type Norma = typeof normas.$inferSelect
export type NewNorma = typeof normas.$inferInsert
