import Fuse from 'fuse.js'
import type { CompactLey } from './search-index'

interface SearchResult {
  law: CompactLey
  score: number
  matchReasons: string[]
}

// Common legal terms and their related keywords
const LEGAL_KEYWORDS: Record<string, string[]> = {
  // ==================== LABOR LAW ====================
  laboral: [
    'trabajo',
    'trabajador',
    'empleador',
    'empleo',
    'despido',
    'contrato',
    'remuneracion',
    'salario',
    'sueldo',
    'empleado',
    'obrero',
    'patrono',
    'jornada',
    'horario',
  ],
  cts: [
    'compensacion',
    'tiempo',
    'servicios',
    'beneficios',
    'liquidacion',
    'deposito',
  ],
  despido: [
    'cese',
    'terminacion',
    'desvinculacion',
    'finalizacion',
    'despidos',
    'despedido',
    'arbitrario',
    'nulo',
    'injustificado',
    'indemnizacion',
  ],
  despidos: ['despido', 'cese', 'terminacion', 'desvinculacion', 'arbitrario'],
  vacaciones: ['descanso', 'feriado', 'licencia', 'permisos', 'dias libres'],
  remuneracion: [
    'salario',
    'sueldo',
    'pago',
    'remuneraciones',
    'honorarios',
    'jornal',
  ],
  gratificacion: [
    'gratificaciones',
    'fiestas patrias',
    'navidad',
    'bonificacion',
    'aguinaldo',
  ],
  trabajo: ['laboral', 'empleo', 'trabajador', 'empleador', 'ocupacion'],
  trabajador: ['empleado', 'obrero', 'asalariado', 'dependiente'],
  empleador: ['patron', 'empresa', 'empleadores', 'patrono'],

  // ==================== CIVIL LAW - CONTRACTS ====================
  civil: [
    'codigo civil',
    'obligaciones',
    'contratos',
    'responsabilidad',
    'actos juridicos',
  ],
  contrato: ['convenio', 'acuerdo', 'pacto', 'obligacion', 'clausula'],
  obligacion: [
    'obligaciones',
    'deuda',
    'acreedor',
    'deudor',
    'cumplimiento',
    'incumplimiento',
  ],
  responsabilidad: [
    'dano',
    'perjuicio',
    'indemnizacion',
    'culpa',
    'dolo',
    'negligencia',
  ],

  // ==================== CIVIL LAW - PROPERTY & HOUSING ====================
  inquilino: ['arrendatario', 'locatario', 'ocupante', 'residente'],
  alquiler: ['arrendamiento', 'renta', 'arriendo', 'locacion', 'alquilar'],
  arrendamiento: [
    'alquiler',
    'renta',
    'arriendo',
    'locacion',
    'inquilino',
    'arrendatario',
    'arrendador',
  ],
  arrendatario: ['inquilino', 'locatario', 'arrendamiento'],
  arrendador: ['propietario', 'dueno', 'casero', 'locador'],
  propietario: ['dueno', 'arrendador', 'propiedad', 'titular', 'poseedor'],
  propiedad: [
    'inmueble',
    'predio',
    'bien',
    'posesion',
    'dominio',
    'titularidad',
  ],
  vivienda: [
    'casa',
    'departamento',
    'inmueble',
    'hogar',
    'domicilio',
    'residencia',
  ],
  departamento: ['vivienda', 'inmueble', 'piso', 'apartamento'],
  desalojo: ['desahucio', 'lanzamiento', 'restitucion', 'desocupacion'],
  hipoteca: ['garantia', 'credito', 'prestamo', 'banco', 'inmueble'],

  // ==================== FAMILY LAW ====================
  familia: [
    'matrimonio',
    'divorcio',
    'patria potestad',
    'alimentos',
    'hijos',
    'conyuges',
    'parientes',
    'filiacion',
    'adopcion',
    'tutela',
    'curatela',
  ],
  matrimonio: [
    'casamiento',
    'conyuges',
    'esposos',
    'union',
    'matrimonial',
    'boda',
    'nupcias',
    'casarse',
    'casado',
    'casada',
    'casar',
    'casarme',
    'casarnos',
  ],
  casar: [
    'matrimonio',
    'casamiento',
    'boda',
    'nupcias',
    'esposo',
    'esposa',
    'conyuge',
  ],
  casarse: ['matrimonio', 'casamiento', 'boda', 'nupcias'],
  casarme: ['matrimonio', 'casamiento', 'boda', 'nupcias'],
  divorcio: [
    'separacion',
    'disolucion',
    'divorcios',
    'divorciar',
    'divorciarse',
    'divorciarme',
    'divorciarnos',
    'separarse',
    'fin matrimonio',
    'ruptura',
    'divorciarme',
    'separarnos',
  ],
  divorciarme: ['divorcio', 'separacion', 'disolucion', 'matrimonio'],
  divorciarse: ['divorcio', 'separacion', 'disolucion', 'matrimonio'],
  separacion: ['divorcio', 'disolucion', 'separarse', 'ruptura', 'cuerpos'],
  esposo: ['esposa', 'conyuge', 'marido', 'mujer', 'pareja', 'consorte'],
  esposa: ['esposo', 'conyuge', 'marido', 'mujer', 'pareja', 'consorte'],
  conyuge: ['esposo', 'esposa', 'marido', 'mujer', 'consorte', 'conyugal'],
  alimentos: [
    'pension',
    'alimenticia',
    'manutencion',
    'sostenimiento',
    'alimentario',
  ],
  pension: ['alimentos', 'alimenticia', 'mensualidad', 'cuota'],
  hijos: ['menores', 'ninos', 'descendientes', 'prole', 'hijo', 'hija'],
  custodia: ['tenencia', 'guarda', 'patria potestad', 'regimen', 'visitas'],
  tenencia: ['custodia', 'guarda', 'cuidado', 'menor'],
  patria: ['potestad', 'padres', 'autoridad parental'],
  visitas: ['regimen', 'visita', 'convivencia', 'relacion'],
  adopcion: ['adoptar', 'adoptivo', 'adoptante', 'adoptado'],
  union: ['convivencia', 'concubinato', 'hecho', 'conviviente', 'pareja'],
  conviviente: ['concubino', 'pareja', 'union de hecho'],
  herencia: [
    'sucesion',
    'heredero',
    'testamento',
    'legado',
    'causante',
    'fallecido',
  ],
  sucesion: ['herencia', 'herederos', 'testamento', 'intestada', 'causante'],
  testamento: ['herencia', 'sucesion', 'legado', 'voluntad', 'testamentario'],

  // ==================== CRIMINAL LAW ====================
  penal: [
    'delito',
    'pena',
    'sancion',
    'crimen',
    'criminal',
    'codigo penal',
    'condena',
    'prision',
  ],
  delito: ['crimen', 'infraccion', 'ilicito', 'falta', 'hecho punible'],
  robo: ['hurto', 'sustraccion', 'apropiacion', 'asalto', 'latrocinio'],
  hurto: ['robo', 'sustraccion', 'apoderamiento'],
  estafa: ['fraude', 'engano', 'defraudacion', 'timador'],
  violencia: ['agresion', 'maltrato', 'lesiones', 'violento'],
  homicidio: ['asesinato', 'muerte', 'matar', 'occiso'],
  denuncia: ['denunciar', 'acusar', 'querella', 'demanda penal'],

  // ==================== TAX LAW ====================
  tributario: [
    'impuesto',
    'tributo',
    'fiscal',
    'sunat',
    'igv',
    'renta',
    'contribucion',
  ],
  impuesto: ['tributo', 'contribucion', 'tasa', 'gravamen'],
  igv: ['iva', 'valor agregado', 'ventas', 'impuesto general'],
  renta: ['ingresos', 'ganancias', 'utilidades', 'impuesto a la renta'],
  sunat: ['tributario', 'fiscal', 'impuestos', 'administracion tributaria'],

  // ==================== BUSINESS & COMMERCIAL ====================
  empresa: ['sociedad', 'compania', 'negocio', 'comercio', 'empresarial'],
  sociedad: ['empresa', 'compania', 'corporacion', 'sac', 'srl', 'sa'],
  comercio: ['comercial', 'mercantil', 'empresarial', 'negocio'],
  comercial: ['mercantil', 'comercio', 'negocio', 'transaccion'],

  // ==================== PUBLIC PROCUREMENT ====================
  contratacion: ['adquisiciones', 'compras', 'licitacion', 'concurso', 'osce'],
  publica: ['estado', 'gobierno', 'publico', 'estatal'],
  licitacion: ['concurso', 'seleccion', 'adjudicacion', 'proceso'],
  osce: ['contrataciones', 'estado', 'supervision'],

  // ==================== ADMINISTRATIVE LAW ====================
  administrativo: [
    'procedimiento',
    'silencio',
    'recurso',
    'impugnacion',
    'administracion',
    'funcionario',
  ],
  procedimiento: ['tramite', 'proceso', 'gestion', 'diligencia'],
  recurso: ['apelacion', 'reclamacion', 'impugnacion', 'queja'],
  funcionario: ['servidor', 'empleado publico', 'autoridad'],

  // ==================== CONSTITUTIONAL LAW ====================
  constitucion: [
    'constitucional',
    'derechos fundamentales',
    'garantias',
    'carta magna',
  ],
  amparo: ['tutela', 'proteccion', 'derechos', 'accion de amparo', 'garantia'],
  habeas: ['corpus', 'libertad', 'detencion'],
  derechos: ['garantias', 'libertades', 'fundamentales', 'humanos'],

  // ==================== CONSUMER PROTECTION ====================
  consumidor: ['cliente', 'usuario', 'indecopi', 'proteccion', 'comprador'],
  indecopi: ['consumidor', 'proteccion', 'reclamo', 'queja'],
  reclamo: ['queja', 'denuncia', 'consumidor', 'libro'],

  // ==================== ENVIRONMENTAL LAW ====================
  ambiental: [
    'medio ambiente',
    'ecologia',
    'contaminacion',
    'recursos naturales',
    'impacto',
  ],

  // ==================== PROPERTY REGISTRATION ====================
  registral: ['sunarp', 'registro', 'inscripcion', 'partida', 'asiento'],
  sunarp: ['registros publicos', 'inscripcion', 'propiedad', 'partida'],

  // ==================== NOTARIAL ====================
  notarial: ['notario', 'escritura', 'protocolo', 'legalizacion'],
  notario: ['notaria', 'escritura publica', 'certificacion'],

  // ==================== MUNICIPAL ====================
  municipal: ['municipalidad', 'alcalde', 'concejo', 'ordenanza', 'licencia'],
  licencia: ['permiso', 'autorizacion', 'funcionamiento'],

  // ==================== TRANSPORT ====================
  transito: ['vehiculo', 'conductor', 'licencia', 'papeleta', 'infraccion'],
  vehiculo: ['auto', 'carro', 'automovil', 'transporte'],
}

// Stop words to remove from queries
const STOP_WORDS = new Set([
  'el',
  'la',
  'los',
  'las',
  'un',
  'una',
  'unos',
  'unas',
  'de',
  'del',
  'al',
  'a',
  'en',
  'con',
  'por',
  'para',
  'que',
  'mi',
  'su',
  'me',
  'se',
  'no',
  'si',
  'como',
  'es',
  'son',
  'esta',
  'estas',
  'ese',
  'esos',
  'sobre',
  'dice',
  'dicen',
  'puede',
  'pueden',
  'hacer',
  'tengo',
  'tiene',
  'hay',
  'cuales',
  'cual',
  'mis',
  'sus',
  'mis',
  'tus',
  'nuestro',
  'vuestro',
])

/**
 * Simple Spanish stemmer - removes common verb endings and suffixes
 * Returns stems only if they are long enough to be meaningful (4+ chars)
 */
function spanishStem(word: string): string[] {
  const stems: string[] = [word]
  const MIN_STEM_LENGTH = 4 // Avoid false positives like "cas" from "casar"

  // Common verb endings to remove (ordered by length - longer first for proper matching)
  const verbEndings = [
    'arme',
    'arte',
    'arse',
    'arnos',
    'ando',
    'aron',
    'aba',
    'erme',
    'erte',
    'erse',
    'ernos',
    'iendo',
    'ieron',
    'irme',
    'irte',
    'irse',
    'irnos',
    'ar',
    'er',
    'ir',
    'ia',
  ]

  for (const ending of verbEndings) {
    if (word.endsWith(ending) && word.length > ending.length + 2) {
      const root = word.slice(0, -ending.length)
      // Only add stems that are long enough to be meaningful
      if (root.length >= MIN_STEM_LENGTH) {
        stems.push(root)
        stems.push(`${root}o`) // e.g., divorci -> divorcio
        stems.push(`${root}io`) // e.g., separac -> separacion
      }
    }
  }

  // Handle -cion -> -cio
  if (word.endsWith('cion') && word.length > 6) {
    stems.push(word.slice(0, -2)) // separacion -> separaci
  }

  return [...new Set(stems)]
}

/**
 * Extract keywords from natural language query
 */
function extractKeywords(query: string): string[] {
  const normalized = query
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '') // Remove accents
    .replace(/[?!¿¡.,;:]/g, ' ')
    .trim()

  const words = normalized.split(/\s+/)
  const keywords: string[] = []

  // Filter out stop words and extract meaningful keywords
  for (const word of words) {
    if (word.length < 3 || STOP_WORDS.has(word)) continue

    // Add the original word
    keywords.push(word)

    // Add stemmed variations
    const stems = spanishStem(word)
    keywords.push(...stems)

    // Also add singular/plural variations
    if (word.endsWith('s') && word.length > 4) {
      keywords.push(word.slice(0, -1)) // Remove plural 's'
    } else if (!word.endsWith('s')) {
      keywords.push(`${word}s`) // Add plural
    }
  }

  return [...new Set(keywords)]
}

/**
 * Expand keywords using legal terminology mappings
 */
function expandKeywords(keywords: string[]): string[] {
  const expanded = new Set(keywords)

  for (const keyword of keywords) {
    // Check if this keyword has related terms
    if (LEGAL_KEYWORDS[keyword]) {
      for (const related of LEGAL_KEYWORDS[keyword]) {
        expanded.add(related)
      }
    }

    // Also check if any legal keyword maps contain this term
    for (const [key, values] of Object.entries(LEGAL_KEYWORDS)) {
      if (values.includes(keyword)) {
        expanded.add(key)
        for (const related of values) {
          expanded.add(related)
        }
      }
    }
  }

  return Array.from(expanded)
}

/**
 * Calculate relevance score for a law based on keyword matches
 */
function calculateRelevance(
  law: CompactLey,
  keywords: string[],
  expandedKeywords: string[],
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  // Normalize text for matching
  const normalize = (text: string) =>
    text
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()

  const tituloNorm = normalize(law.t)
  const bodyNorm = normalize(law.b)
  const materiasNorm = (law.m ?? []).map((m) => normalize(m))

  // Check for exact keyword matches in title (highest weight)
  for (const keyword of keywords) {
    if (tituloNorm.includes(keyword)) {
      score += 10
      reasons.push(`Título contiene "${keyword}"`)
    }
  }

  // Check for keyword matches in materias (high weight)
  for (const materia of materiasNorm) {
    for (const keyword of expandedKeywords) {
      if (materia.includes(keyword)) {
        score += 8
        if (!reasons.some((r) => r.startsWith('Materia:'))) {
          reasons.push(
            `Materia: ${law.m?.find((m) => normalize(m).includes(keyword))}`,
          )
        }
      }
    }
  }

  // Check for keyword matches in body (medium weight)
  for (const keyword of expandedKeywords) {
    if (bodyNorm.includes(keyword)) {
      score += 3
      if (reasons.length < 3) {
        reasons.push(`Contenido menciona "${keyword}"`)
      }
    }
  }

  // Bonus for multiple keyword matches
  const matchedKeywords = keywords.filter(
    (k) =>
      tituloNorm.includes(k) ||
      bodyNorm.includes(k) ||
      materiasNorm.some((m) => m.includes(k)),
  )

  if (matchedKeywords.length > 1) {
    score += matchedKeywords.length * 2
  }

  // Penalty for very old laws (prefer recent legislation)
  if (law.f && law.f < '1990-01-01') {
    score *= 0.8
  }

  // Bonus for vigente laws (default if e is undefined)
  if (!law.e || law.e === 'vigente') {
    score *= 1.2
  }

  return { score, reasons }
}

/**
 * Perform smart search on laws using natural language query
 */
export function smartSearch(
  query: string,
  laws: CompactLey[],
  limit = 10,
): SearchResult[] {
  if (!query.trim()) return []

  // Extract and expand keywords
  const keywords = extractKeywords(query)
  if (keywords.length === 0) return []

  const expandedKeywords = expandKeywords(keywords)

  // Calculate relevance for each law
  const results: SearchResult[] = []

  for (const law of laws) {
    const { score, reasons } = calculateRelevance(
      law,
      keywords,
      expandedKeywords,
    )

    if (score > 0) {
      results.push({
        law,
        score,
        matchReasons: reasons,
      })
    }
  }

  // Sort by score (descending) and return top results
  results.sort((a, b) => b.score - a.score)

  return results.slice(0, limit)
}

/**
 * Perform fuzzy search using Fuse.js as fallback
 */
export function fuzzySearch(
  query: string,
  laws: CompactLey[],
  limit = 10,
): SearchResult[] {
  const fuse = new Fuse(laws, {
    keys: [
      { name: 't', weight: 0.5 },
      { name: 'b', weight: 0.3 },
      { name: 'm', weight: 0.2 },
    ],
    threshold: 0.4,
    includeScore: true,
  })

  const fuseResults = fuse.search(query, { limit })

  return fuseResults.map((result) => ({
    law: result.item,
    score: (1 - (result.score ?? 0)) * 100, // Convert to 0-100 scale
    matchReasons: ['Coincidencia por búsqueda difusa'],
  }))
}

/**
 * Combined smart search with fuzzy fallback
 */
export function intelligentSearch(
  query: string,
  laws: CompactLey[],
  limit = 10,
): SearchResult[] {
  // Try smart search first
  const smartResults = smartSearch(query, laws, limit)

  // If we have good results, return them
  if (smartResults.length >= 5 && smartResults[0].score > 10) {
    return smartResults
  }

  // Otherwise, combine with fuzzy search
  const fuzzyResults = fuzzySearch(query, laws, limit)

  // Merge results, avoiding duplicates
  const seen = new Set(smartResults.map((r) => r.law.id))
  const combined = [...smartResults]

  for (const fuzzyResult of fuzzyResults) {
    if (!seen.has(fuzzyResult.law.id)) {
      combined.push(fuzzyResult)
      seen.add(fuzzyResult.law.id)
    }
  }

  // Re-sort and limit
  combined.sort((a, b) => b.score - a.score)
  return combined.slice(0, limit)
}
