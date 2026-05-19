// Web Worker for search operations
importScripts('https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js')

let fuse = null
let searchIndex = null

// Initialize the search index
async function initIndex() {
  if (searchIndex) return

  try {
    const response = await fetch('/search-index.json')
    searchIndex = await response.json()

    fuse = new Fuse(searchIndex, {
      keys: [
        { name: 't', weight: 0.5 },
        { name: 'id', weight: 0.3 },
        { name: 'b', weight: 0.2 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
      includeMatches: true,
      includeScore: true,
      minMatchCharLength: 2,
    })

    postMessage({ type: 'ready', count: searchIndex.length })
  } catch (error) {
    postMessage({ type: 'error', message: error.message })
  }
}

// Handle search requests
self.onmessage = async (e) => {
  const { type, query, limit = 20 } = e.data

  if (type === 'init') {
    await initIndex()
    return
  }

  if (type === 'search') {
    if (!fuse) {
      await initIndex()
    }

    const results = fuse.search(query, { limit })

    // Map abbreviated keys to full names
    const keyMap = {
      t: 'titulo',
      id: 'identificador',
      b: 'body',
    }

    postMessage({
      type: 'results',
      query,
      results: results.map((r) => ({
        item: {
          identificador: r.item.id,
          titulo: r.item.t,
          rango: r.item.r,
          estado: r.item.e ?? 'vigente',
          fechaPublicacion: r.item.f,
          body: r.item.b,
          materias: r.item.m ?? [],
        },
        matches: r.matches?.map((m) => ({
          key: keyMap[m.key] || m.key,
          indices: m.indices,
        })),
        score: r.score,
      })),
    })
  }
}

// Auto-initialize
initIndex()
