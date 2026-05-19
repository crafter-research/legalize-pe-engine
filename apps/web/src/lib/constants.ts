/**
 * Shared constants for the Legalize PE web application
 */

/** Labels for legal norm types (rango) */
export const RANGO_LABELS: Record<string, string> = {
  constitucion: 'Constitución',
  codigo: 'Código',
  ley: 'Ley',
  'ley-organica': 'Ley Orgánica',
  'decreto-legislativo': 'D. Leg.',
  'decreto-urgencia': 'D. Urg.',
  'decreto-supremo': 'D. Sup.',
  'resolucion-suprema': 'R. Sup.',
  'resolucion-ministerial': 'R. Min.',
  'resolucion-jefatural': 'R. Jef.',
  'resolucion-directoral': 'R. Dir.',
  resolucion: 'Resolución',
  ordenanza: 'Ordenanza',
  reglamento: 'Reglamento',
  articulo: 'Artículo',
}

/** Full labels for display in detailed views */
export const RANGO_LABELS_FULL: Record<string, string> = {
  constitucion: 'Constitución',
  codigo: 'Código',
  ley: 'Ley',
  'ley-organica': 'Ley Orgánica',
  'decreto-legislativo': 'Decreto Legislativo',
  'decreto-urgencia': 'Decreto de Urgencia',
  'decreto-supremo': 'Decreto Supremo',
  'resolucion-suprema': 'Resolución Suprema',
  'resolucion-ministerial': 'Resolución Ministerial',
  'resolucion-jefatural': 'Resolución Jefatural',
  'resolucion-directoral': 'Resolución Directoral',
  resolucion: 'Resolución',
  ordenanza: 'Ordenanza',
  reglamento: 'Reglamento',
  articulo: 'Artículo',
}

/** Check if a file should be skipped during directory traversal */
export function shouldSkipFile(filename: string): boolean {
  return filename.startsWith('.') || filename.startsWith('HISTORIAL')
}
