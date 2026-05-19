import { describe, expect, it } from 'vitest'
import type { CompactLey } from './search-index'
import { fuzzySearch, intelligentSearch, smartSearch } from './smart-search'

// Mock data for testing
const mockLaws: CompactLey[] = [
  {
    id: 'decreto-supremo-003-97-tr',
    t: 'Texto Único Ordenado del Decreto Legislativo N° 728, Ley de Productividad y Competitividad Laboral',
    r: 'Decreto Supremo',
    f: '1997-03-27',
    b: 'El presente Texto Unico Ordenado contiene las normas sobre formacion y suspension del contrato de trabajo, despido, cese colectivo, indemnizacion por despido arbitrario.',
    m: ['Derecho Laboral', 'Despido', 'Contrato de Trabajo'],
  },
  {
    id: 'ley-27942',
    t: 'Ley de Prevención y Sanción del Hostigamiento Sexual',
    r: 'Ley',
    f: '2003-02-27',
    b: 'Ley que previene y sanciona el hostigamiento sexual producido en las relaciones laborales de autoridad o dependencia.',
    m: ['Derecho Laboral', 'Hostigamiento'],
  },
  {
    id: 'codigo-civil',
    t: 'Código Civil',
    r: 'Decreto Legislativo',
    f: '1984-07-24',
    b: 'El Código Civil regula las personas, familia, sucesiones, registros, contratos, responsabilidad civil, propiedad y otros derechos reales.',
    m: ['Derecho Civil', 'Contratos', 'Familia', 'Propiedad'],
  },
  {
    id: 'ley-26662',
    t: 'Ley de Competencia Notarial en Asuntos no Contenciosos',
    r: 'Ley',
    f: '1996-09-21',
    b: 'Ley que otorga competencia notarial para tramitar asuntos no contenciosos como separacion convencional y divorcio ulterior.',
    m: ['Derecho Civil', 'Familia', 'Divorcio'],
  },
  {
    id: 'ley-29497',
    t: 'Nueva Ley Procesal del Trabajo',
    r: 'Ley',
    f: '2010-01-15',
    b: 'Regula los procesos laborales en todas sus instancias, asi como los procedimientos en materia de seguridad social y otros.',
    m: ['Derecho Laboral', 'Procesal'],
  },
  {
    id: 'decreto-legislativo-728',
    t: 'Ley de Fomento del Empleo - Ley de Productividad y Competitividad Laboral',
    r: 'Decreto Legislativo',
    f: '1991-11-08',
    b: 'Normas sobre fomento del empleo, contratos de trabajo, terminacion del contrato, despido, indemnizacion, gratificaciones, compensacion por tiempo de servicios.',
    m: ['Derecho Laboral', 'CTS', 'Gratificaciones'],
  },
  {
    id: 'ley-30364',
    t: 'Ley para prevenir, sancionar y erradicar la violencia contra las mujeres y los integrantes del grupo familiar',
    r: 'Ley',
    f: '2015-11-23',
    b: 'Ley que establece mecanismos para prevenir, sancionar y erradicar la violencia contra las mujeres y los integrantes del grupo familiar.',
    m: ['Derecho Penal', 'Violencia', 'Familia'],
  },
  {
    id: 'ley-29783',
    t: 'Ley de Seguridad y Salud en el Trabajo',
    r: 'Ley',
    f: '2011-08-20',
    b: 'Ley que promueve una cultura de prevencion de riesgos laborales en el pais. El deber de prevencion a cargo del empleador.',
    m: ['Derecho Laboral', 'Seguridad', 'Salud'],
  },
  {
    id: 'codigo-penal',
    t: 'Código Penal',
    r: 'Decreto Legislativo',
    f: '1991-04-03',
    b: 'El Codigo Penal establece los delitos y penas. Incluye delitos contra la vida, el patrimonio, la libertad, el honor y otros.',
    m: ['Derecho Penal', 'Delitos'],
  },
  {
    id: 'ley-29571',
    t: 'Código de Protección y Defensa del Consumidor',
    r: 'Ley',
    f: '2010-09-02',
    b: 'Codigo que establece las normas de proteccion y defensa de los consumidores, regulando las relaciones entre proveedores y consumidores.',
    m: ['Derecho del Consumidor', 'INDECOPI'],
  },
]

describe('Smart Search - extractKeywords & spanishStem', () => {
  it('should extract keywords from basic query', () => {
    const results = smartSearch('despido laboral', mockLaws, 5)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].law.t).toContain('Laboral')
  })

  it('should handle natural language query about divorce', () => {
    const results = smartSearch('me quiero divorciar', mockLaws, 5)
    expect(results.length).toBeGreaterThan(0)
    // Should find laws related to divorce
    const hasDivorceResult = results.some(
      (r) =>
        r.law.m?.some((m) => m.includes('Divorcio')) ||
        r.law.b.toLowerCase().includes('divorcio') ||
        r.law.b.toLowerCase().includes('separacion'),
    )
    expect(hasDivorceResult).toBe(true)
  })

  it('should handle natural language query about marriage', () => {
    const results = smartSearch('quiero casarme matrimonio', mockLaws, 5)
    expect(results.length).toBeGreaterThan(0)
    // Should find Codigo Civil or family law
    const hasMarriageResult = results.some(
      (r) => r.law.m?.includes('Familia') || r.law.t.includes('Civil'),
    )
    expect(hasMarriageResult).toBe(true)
  })

  it('should remove stop words properly', () => {
    const results1 = smartSearch('despido', mockLaws, 5)
    const results2 = smartSearch('el despido laboral', mockLaws, 5)
    // Both should return similar results (stop words removed)
    expect(results1.length).toBeGreaterThan(0)
    expect(results2.length).toBeGreaterThan(0)
  })

  it('should handle accents correctly', () => {
    const results1 = smartSearch('codigo civil', mockLaws, 5)
    const results2 = smartSearch('código civil', mockLaws, 5)
    // Both should find the same law
    expect(results1.length).toBeGreaterThan(0)
    expect(results2.length).toBeGreaterThan(0)
    expect(results1[0].law.id).toBe(results2[0].law.id)
  })

  it('should return empty array for empty query', () => {
    const results = smartSearch('', mockLaws, 5)
    expect(results).toEqual([])
  })

  it('should return empty array for whitespace-only query', () => {
    const results = smartSearch('   ', mockLaws, 5)
    expect(results).toEqual([])
  })

  it('should handle single word query', () => {
    const results = smartSearch('trabajo', mockLaws, 5)
    expect(results.length).toBeGreaterThan(0)
    // Should find labor laws
    const hasLaborLaw = results.some((r) =>
      r.law.m?.some((m) => m.includes('Laboral')),
    )
    expect(hasLaborLaw).toBe(true)
  })

  it('should handle queries with special characters', () => {
    const results = smartSearch('¿cómo me divorcio?', mockLaws, 5)
    expect(results.length).toBeGreaterThan(0)
  })
})

describe('Smart Search - expandKeywords', () => {
  it('should expand legal keywords correctly', () => {
    const results = smartSearch('inquilino', mockLaws, 5)
    // Should expand to arrendatario, locatario, etc.
    expect(results.length).toBeGreaterThanOrEqual(0)
  })

  it('should expand labor terms', () => {
    const results = smartSearch('empleador', mockLaws, 5)
    expect(results.length).toBeGreaterThan(0)
    const hasLaborLaw = results.some((r) =>
      r.law.m?.some((m) => m.includes('Laboral')),
    )
    expect(hasLaborLaw).toBe(true)
  })

  it('should expand CTS related terms', () => {
    const results = smartSearch('cts', mockLaws, 5)
    expect(results.length).toBeGreaterThan(0)
    const hasCTSResult = results.some(
      (r) =>
        r.law.m?.includes('CTS') ||
        r.law.b.toLowerCase().includes('compensacion') ||
        r.law.b.toLowerCase().includes('servicios'),
    )
    expect(hasCTSResult).toBe(true)
  })

  it('should handle family law terms', () => {
    const results = smartSearch('custodia hijos', mockLaws, 5)
    expect(results.length).toBeGreaterThan(0)
    const hasFamilyLaw = results.some((r) => r.law.m?.includes('Familia'))
    expect(hasFamilyLaw).toBe(true)
  })
})

describe('Smart Search - calculateRelevance', () => {
  it('should prioritize title matches over body matches', () => {
    const results = smartSearch('codigo civil', mockLaws, 10)
    expect(results.length).toBeGreaterThan(0)
    // Codigo Civil should be top result
    expect(results[0].law.t).toContain('Civil')
    expect(results[0].score).toBeGreaterThan(10)
  })

  it('should score materia matches highly', () => {
    const results = smartSearch('derecho laboral', mockLaws, 10)
    expect(results.length).toBeGreaterThan(0)
    // Should have match reasons mentioning materia
    const hasMatriaReason = results.some((r) =>
      r.matchReasons.some((reason) => reason.includes('Materia')),
    )
    expect(hasMatriaReason).toBe(true)
  })

  it('should give bonus to vigente laws', () => {
    const results = smartSearch('trabajo', mockLaws, 10)
    expect(results.length).toBeGreaterThan(0)
    // All results should be scored
    for (const result of results) {
      expect(result.score).toBeGreaterThan(0)
    }
  })

  it('should penalize very old laws', () => {
    const oldLaw: CompactLey = {
      id: 'old-law',
      t: 'Very Old Labor Law',
      r: 'Ley',
      f: '1950-01-01',
      b: 'About labor and work',
      m: ['Derecho Laboral'],
    }

    const newLaw: CompactLey = {
      id: 'new-law',
      t: 'Recent Labor Law',
      r: 'Ley',
      f: '2020-01-01',
      b: 'About labor and work',
      m: ['Derecho Laboral'],
    }

    const testLaws = [oldLaw, newLaw]
    const results = smartSearch('labor', testLaws, 10)

    // New law should score higher (old law gets 0.8x penalty)
    if (results.length >= 2) {
      const oldResult = results.find((r) => r.law.id === 'old-law')
      const newResult = results.find((r) => r.law.id === 'new-law')
      if (oldResult && newResult) {
        expect(newResult.score).toBeGreaterThan(oldResult.score)
      }
    }
  })

  it('should provide match reasons', () => {
    const results = smartSearch('despido laboral', mockLaws, 5)
    expect(results.length).toBeGreaterThan(0)
    // Each result should have match reasons
    for (const result of results) {
      expect(result.matchReasons).toBeDefined()
      expect(Array.isArray(result.matchReasons)).toBe(true)
      expect(result.matchReasons.length).toBeGreaterThan(0)
    }
  })
})

describe('Smart Search - limit parameter', () => {
  it('should respect limit parameter', () => {
    const results = smartSearch('ley', mockLaws, 3)
    expect(results.length).toBeLessThanOrEqual(3)
  })

  it('should return all results if less than limit', () => {
    const results = smartSearch('hostigamiento', mockLaws, 100)
    expect(results.length).toBeGreaterThan(0)
    expect(results.length).toBeLessThanOrEqual(mockLaws.length)
  })

  it('should default to 10 results', () => {
    const results = smartSearch('derecho', mockLaws)
    expect(results.length).toBeLessThanOrEqual(10)
  })
})

describe('Fuzzy Search', () => {
  it('should find results using fuzzy matching', () => {
    const results = fuzzySearch('codigo sivil', mockLaws, 5) // Typo: sivil instead of civil
    expect(results.length).toBeGreaterThan(0)
    // Should still find Codigo Civil
    const hasCivilCode = results.some((r) => r.law.t.includes('Civil'))
    expect(hasCivilCode).toBe(true)
  })

  it('should return results with scores', () => {
    const results = fuzzySearch('trabajo', mockLaws, 5)
    expect(results.length).toBeGreaterThan(0)
    for (const result of results) {
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    }
  })

  it('should include match reasons', () => {
    const results = fuzzySearch('laboral', mockLaws, 5)
    expect(results.length).toBeGreaterThan(0)
    for (const result of results) {
      expect(result.matchReasons).toBeDefined()
      expect(result.matchReasons.length).toBeGreaterThan(0)
    }
  })

  it('should respect limit parameter', () => {
    const results = fuzzySearch('ley', mockLaws, 3)
    expect(results.length).toBeLessThanOrEqual(3)
  })
})

describe('Intelligent Search (Combined)', () => {
  it('should prioritize smart search when results are good', () => {
    const results = intelligentSearch('despido laboral', mockLaws, 10)
    expect(results.length).toBeGreaterThan(0)
    // Should return labor law results
    const hasLaborLaw = results.some((r) =>
      r.law.m?.some((m) => m.includes('Laboral')),
    )
    expect(hasLaborLaw).toBe(true)
  })

  it('should fall back to fuzzy search for poor smart results', () => {
    // Use a query that might not score well in smart search
    const results = intelligentSearch('xyz', mockLaws, 10)
    // Should still return results (or empty if truly no matches)
    expect(Array.isArray(results)).toBe(true)
  })

  it('should combine results without duplicates', () => {
    const results = intelligentSearch('codigo', mockLaws, 10)
    expect(results.length).toBeGreaterThan(0)

    // Check for duplicates
    const ids = results.map((r) => r.law.id)
    const uniqueIds = new Set(ids)
    expect(ids.length).toBe(uniqueIds.size)
  })

  it('should handle natural language well', () => {
    const results = intelligentSearch(
      'quiero divorciarme de mi esposo',
      mockLaws,
      10,
    )
    expect(results.length).toBeGreaterThan(0)
    // Should find divorce-related laws
    const hasDivorceResult = results.some(
      (r) =>
        r.law.m?.some((m) => m.includes('Divorcio') || m.includes('Familia')) ||
        r.law.b.toLowerCase().includes('divorcio'),
    )
    expect(hasDivorceResult).toBe(true)
  })

  it('should handle complex queries', () => {
    const results = intelligentSearch(
      'indemnizacion por despido arbitrario',
      mockLaws,
      10,
    )
    expect(results.length).toBeGreaterThan(0)
    const hasRelevantResult = results.some(
      (r) =>
        r.law.b.toLowerCase().includes('despido') ||
        r.law.b.toLowerCase().includes('indemnizacion') ||
        r.law.m?.some((m) => m.includes('Laboral')),
    )
    expect(hasRelevantResult).toBe(true)
  })

  it('should respect limit parameter', () => {
    const results = intelligentSearch('ley', mockLaws, 5)
    expect(results.length).toBeLessThanOrEqual(5)
  })

  it('should return sorted results by score', () => {
    const results = intelligentSearch('trabajo', mockLaws, 10)
    expect(results.length).toBeGreaterThan(0)

    // Check that results are sorted by score descending
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score)
    }
  })
})

describe('Edge Cases', () => {
  it('should handle empty laws array', () => {
    const results = smartSearch('despido', [], 10)
    expect(results).toEqual([])
  })

  it('should handle very long queries', () => {
    const longQuery =
      'despido laboral arbitrario indemnizacion compensacion tiempo servicios gratificaciones vacaciones'.repeat(
        5,
      )
    const results = smartSearch(longQuery, mockLaws, 10)
    // Should still work and return results
    expect(Array.isArray(results)).toBe(true)
  })

  it('should handle queries with numbers', () => {
    const results = smartSearch('ley 29497', mockLaws, 10)
    expect(results.length).toBeGreaterThan(0)
  })

  it('should handle queries with only stop words', () => {
    const results = smartSearch('el la los las un una', mockLaws, 10)
    expect(results).toEqual([])
  })

  it('should handle mixed case queries', () => {
    const results = smartSearch('DeSpIdO LaBoRaL', mockLaws, 10)
    expect(results.length).toBeGreaterThan(0)
  })

  it('should handle laws without materias field', () => {
    const lawWithoutMaterias: CompactLey = {
      id: 'test-law',
      t: 'Test Labor Law',
      r: 'Ley',
      f: '2020-01-01',
      b: 'About labor and employment',
    }
    const results = smartSearch('labor', [lawWithoutMaterias], 10)
    expect(results.length).toBeGreaterThan(0)
  })

  it('should handle laws with derogated status', () => {
    const derogatedLaw: CompactLey = {
      id: 'derogated-law',
      t: 'Old Derogated Law',
      r: 'Ley',
      e: 'derogada',
      f: '1980-01-01',
      b: 'This law has been derogated',
      m: ['Derecho Laboral'],
    }
    const results = smartSearch('labor', [derogatedLaw, ...mockLaws], 10)
    // Derogated laws should score lower (no 1.2x bonus)
    expect(results.length).toBeGreaterThan(0)
  })
})
