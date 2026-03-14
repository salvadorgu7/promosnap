// ============================================================================
// ML Category Registry — semantic mapping from terms to ML category IDs
// ============================================================================

import type { MLCategory } from './types'

/** Complete category registry with priority (1=highest) */
const CATEGORY_REGISTRY: (MLCategory & { keywords: string[] })[] = [
  // Tech — High Priority
  { id: 'MLB1055',   name: 'Celulares e Smartphones', priority: 1, keywords: ['celular', 'smartphone', 'iphone', 'samsung galaxy', 'xiaomi', 'motorola', 'telefone'] },
  { id: 'MLB1652',   name: 'Notebooks',               priority: 1, keywords: ['notebook', 'laptop', 'macbook', 'chromebook', 'ultrabook'] },
  { id: 'MLB1676',   name: 'Fones de Ouvido',         priority: 1, keywords: ['fone', 'headphone', 'earphone', 'airpods', 'headset', 'bluetooth fone', 'fone bluetooth'] },
  { id: 'MLB1002',   name: 'TVs',                     priority: 1, keywords: ['tv', 'televisao', 'smart tv', 'televisor', 'oled', 'qled'] },
  { id: 'MLB186456', name: 'Consoles',                 priority: 1, keywords: ['console', 'playstation', 'ps5', 'xbox', 'nintendo', 'switch', 'videogame'] },

  // Tech — Medium Priority
  { id: 'MLB1659',   name: 'Tablets',                  priority: 2, keywords: ['tablet', 'ipad'] },
  { id: 'MLB352679', name: 'Smartwatches',             priority: 2, keywords: ['smartwatch', 'relogio inteligente', 'apple watch', 'galaxy watch'] },
  { id: 'MLB1670',   name: 'Monitores',                priority: 2, keywords: ['monitor', 'tela', 'display'] },
  { id: 'MLB1039',   name: 'Cameras',                  priority: 2, keywords: ['camera', 'gopro', 'webcam', 'filmadora'] },
  { id: 'MLB1672',   name: 'Impressoras',              priority: 2, keywords: ['impressora', 'printer', 'multifuncional'] },
  { id: 'MLB1648',   name: 'Computadores Desktop',     priority: 2, keywords: ['desktop', 'pc gamer', 'computador'] },

  // Components
  { id: 'MLB7517',   name: 'Discos e SSDs',            priority: 3, keywords: ['ssd', 'hd', 'disco rigido', 'pen drive', 'pendrive', 'armazenamento'] },
  { id: 'MLB12119',  name: 'Teclados',                 priority: 3, keywords: ['teclado', 'keyboard', 'teclado mecanico'] },
  { id: 'MLB4739',   name: 'Mouses',                   priority: 3, keywords: ['mouse', 'mouse gamer', 'mouse sem fio'] },
  { id: 'MLB1714',   name: 'Placas de Video',          priority: 3, keywords: ['placa de video', 'gpu', 'rtx', 'geforce', 'radeon'] },
  { id: 'MLB1694',   name: 'Processadores',            priority: 3, keywords: ['processador', 'cpu', 'ryzen', 'intel core'] },
  { id: 'MLB1696',   name: 'Memorias RAM',             priority: 3, keywords: ['memoria ram', 'ram', 'ddr4', 'ddr5'] },

  // Home & Appliances
  { id: 'MLB1596',   name: 'Ar Condicionado',          priority: 2, keywords: ['ar condicionado', 'split', 'climatizador'] },
  { id: 'MLB1576',   name: 'Geladeiras e Freezers',    priority: 2, keywords: ['geladeira', 'freezer', 'refrigerador'] },
  { id: 'MLB111079', name: 'Micro-ondas',              priority: 3, keywords: ['microondas', 'micro-ondas'] },
  { id: 'MLB1574',   name: 'Aspiradores e Limpeza',    priority: 3, keywords: ['aspirador', 'robo aspirador', 'aspirador po'] },
  { id: 'MLB110447', name: 'Cafeteiras',               priority: 3, keywords: ['cafeteira', 'nespresso', 'cafe', 'expresso'] },
  { id: 'MLB1581',   name: 'Lavadoras de Roupa',       priority: 3, keywords: ['maquina lavar', 'lavadora', 'lava e seca'] },

  // Fashion & Beauty
  { id: 'MLB1246',   name: 'Perfumes',                 priority: 3, keywords: ['perfume', 'colonia', 'fragancia'] },
  { id: 'MLB99614',  name: 'Tenis',                    priority: 3, keywords: ['tenis', 'sneaker', 'nike', 'adidas'] },
  { id: 'MLB16117',  name: 'Mochilas',                 priority: 3, keywords: ['mochila', 'bolsa', 'mala'] },

  // Others
  { id: 'MLB1430',   name: 'Brinquedos',               priority: 3, keywords: ['brinquedo', 'lego', 'boneca', 'boneco'] },
  { id: 'MLB1132',   name: 'Jogos de Video Game',      priority: 3, keywords: ['jogo', 'game', 'jogo ps5', 'jogo xbox', 'jogo switch'] },
]

/** Fallback categories for IDs that commonly return 404 on highlights */
export const FALLBACK_CATEGORIES: Record<string, string[]> = {
  // Top 5 high-priority categories
  'MLB1055':   ['MLB1055', 'MLB420017'],         // Celulares → Celulares e Smartphones, Acessorios para Celulares
  'MLB1652':   ['MLB1652', 'MLB430687'],         // Notebooks → Notebooks, Acessorios para Notebooks
  'MLB1676':   ['MLB1676', 'MLB234773'],         // Fones → Fones de Ouvido, Fones Bluetooth
  'MLB1002':   ['MLB1002', 'MLB1002'],           // TVs → TVs
  'MLB186456': ['MLB186456', 'MLB1132'],         // Consoles → Consoles, Jogos de Video Game
  // Existing fallbacks
  'MLB1596':   ['MLB181294', 'MLB1645'],         // Ar condicionado → Climatizacao subcats
  'MLB352679': ['MLB1055'],                       // Smartwatch → Celulares (parent)
  'MLB1039':   ['MLB271599'],                     // Cameras → Cameras Digitais subcat
  'MLB1672':   ['MLB4882'],                       // Impressoras → Impressoras subcat
}

/** Get all categories sorted by priority */
export function getAllCategories(): MLCategory[] {
  return CATEGORY_REGISTRY.map(({ keywords: _k, ...cat }) => cat)
    .filter((cat, i, arr) => arr.findIndex((c) => c.id === cat.id) === i) // dedupe
    .sort((a, b) => a.priority - b.priority)
}

/** Get top-priority categories for cron sync */
export function getCronCategories(): MLCategory[] {
  return getAllCategories().filter((c) => c.priority <= 2)
}

/**
 * Resolve a free-text term to ML categories.
 * Uses semantic keyword matching (no ML search endpoint needed).
 * Returns categories sorted by relevance.
 */
export function resolveIntentToCategories(term: string): MLCategory[] {
  const q = term.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const matches: (MLCategory & { score: number })[] = []

  for (const entry of CATEGORY_REGISTRY) {
    let bestScore = 0

    for (const keyword of entry.keywords) {
      const kw = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

      // Exact match
      if (q === kw) { bestScore = 100; break }

      // Query contains keyword
      if (q.includes(kw)) { bestScore = Math.max(bestScore, 80) }

      // Keyword contains query (partial)
      if (kw.includes(q) && q.length >= 3) { bestScore = Math.max(bestScore, 60) }

      // Word-level overlap
      const qWords = q.split(/\s+/)
      const kwWords = kw.split(/\s+/)
      const overlap = qWords.filter((w) => kwWords.some((kw2) => kw2.includes(w) || w.includes(kw2)))
      if (overlap.length > 0) {
        bestScore = Math.max(bestScore, 40 + (overlap.length / qWords.length) * 30)
      }
    }

    if (bestScore > 0) {
      const { keywords: _k, ...cat } = entry
      // Boost by priority (higher priority categories get a small bonus)
      matches.push({ ...cat, score: bestScore + (4 - cat.priority) * 2 })
    }
  }

  // Sort by score desc, deduplicate by id
  const seen = new Set<string>()
  return matches
    .sort((a, b) => b.score - a.score)
    .filter((m) => {
      if (seen.has(m.id)) return false
      seen.add(m.id)
      return true
    })
    .map(({ score: _s, ...cat }) => cat)
}
