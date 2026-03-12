// ============================================
// USER SEGMENTATION — BLOCO 4 Personalization V2
// ============================================

export type UserSegment =
  | 'tech_enthusiast'
  | 'bargain_hunter'
  | 'gamer'
  | 'casa_cozinha'
  | 'mobile_first'
  | 'beauty_fashion'
  | 'general'

export interface UserSignals {
  favorites: string[]
  searches: string[]
  recentCategories: string[]
  recentBrands: string[]
}

interface SegmentConfig {
  preferredCategories: string[]
  displayPreferences: {
    prioritySections: string[]
    showDealsFirst: boolean
    emphasisBadge?: string
  }
}

export const SEGMENT_CONFIG: Record<UserSegment, SegmentConfig> = {
  tech_enthusiast: {
    preferredCategories: ['notebooks', 'monitores', 'perifericos', 'componentes', 'hub-usb', 'armazenamento'],
    displayPreferences: {
      prioritySections: ['hotDeals', 'lowestPrices', 'bestSellers'],
      showDealsFirst: false,
      emphasisBadge: 'hot_deal',
    },
  },
  bargain_hunter: {
    preferredCategories: ['eletrodomesticos', 'casa-cozinha', 'smartphones', 'smart-tv'],
    displayPreferences: {
      prioritySections: ['lowestPrices', 'hotDeals', 'coupons'],
      showDealsFirst: true,
      emphasisBadge: 'price_drop',
    },
  },
  gamer: {
    preferredCategories: ['games', 'cadeiras-gamer', 'monitores', 'headsets', 'perifericos', 'componentes'],
    displayPreferences: {
      prioritySections: ['hotDeals', 'bestSellers', 'lowestPrices'],
      showDealsFirst: false,
      emphasisBadge: 'hot_deal',
    },
  },
  casa_cozinha: {
    preferredCategories: ['casa-cozinha', 'eletrodomesticos', 'moveis', 'iluminacao', 'ferramentas'],
    displayPreferences: {
      prioritySections: ['lowestPrices', 'bestSellers', 'hotDeals'],
      showDealsFirst: true,
      emphasisBadge: 'free_shipping',
    },
  },
  mobile_first: {
    preferredCategories: ['smartphones', 'fones-bluetooth', 'acessorios', 'capas', 'smartwatch'],
    displayPreferences: {
      prioritySections: ['hotDeals', 'lowestPrices', 'bestSellers'],
      showDealsFirst: false,
      emphasisBadge: 'hot_deal',
    },
  },
  beauty_fashion: {
    preferredCategories: ['beleza', 'moda', 'perfumes', 'cuidados-pessoais', 'acessorios-moda'],
    displayPreferences: {
      prioritySections: ['bestSellers', 'lowestPrices', 'hotDeals'],
      showDealsFirst: true,
      emphasisBadge: 'best_seller',
    },
  },
  general: {
    preferredCategories: [],
    displayPreferences: {
      prioritySections: ['hotDeals', 'lowestPrices', 'bestSellers'],
      showDealsFirst: false,
    },
  },
}

// Category keywords that map to segments
const SEGMENT_KEYWORDS: Record<Exclude<UserSegment, 'general'>, string[]> = {
  tech_enthusiast: [
    'notebook', 'monitor', 'ssd', 'processador', 'placa-mae', 'ram', 'hub-usb',
    'armazenamento', 'perifericos', 'componentes', 'impressora', 'roteador',
  ],
  bargain_hunter: [], // detected by behavior, not category
  gamer: [
    'game', 'gamer', 'headset', 'cadeira-gamer', 'placa-de-video', 'gpu',
    'teclado-mecanico', 'mouse-gamer', 'console', 'playstation', 'xbox', 'nintendo',
  ],
  casa_cozinha: [
    'casa', 'cozinha', 'eletrodomestico', 'moveis', 'iluminacao', 'ferramenta',
    'aspirador', 'cafeteira', 'air-fryer', 'panela', 'liquidificador',
  ],
  mobile_first: [
    'smartphone', 'celular', 'iphone', 'samsung-galaxy', 'fone', 'bluetooth',
    'capa', 'carregador', 'smartwatch', 'tablet', 'airpods', 'powerbank',
  ],
  beauty_fashion: [
    'beleza', 'moda', 'perfume', 'maquiagem', 'cuidados', 'cabelo',
    'skin', 'cosmetico', 'roupa', 'tenis', 'relogio',
  ],
}

function countMatches(items: string[], keywords: string[]): number {
  let count = 0
  for (const item of items) {
    const lower = item.toLowerCase()
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        count++
        break
      }
    }
  }
  return count
}

export function inferSegment(signals: UserSignals): UserSegment {
  const allSignals = [
    ...signals.favorites,
    ...signals.searches,
    ...signals.recentCategories,
    ...signals.recentBrands,
  ]

  if (allSignals.length === 0) return 'general'

  // Check bargain hunter heuristic: if most searches contain price-related terms
  const bargainTerms = ['barato', 'oferta', 'desconto', 'promoção', 'promocao', 'cupom', 'cashback', 'preco', 'preço']
  const bargainHits = countMatches(signals.searches, bargainTerms)
  if (signals.searches.length > 0 && bargainHits / signals.searches.length >= 0.4) {
    return 'bargain_hunter'
  }

  // Score each segment by keyword frequency
  const scores: Partial<Record<UserSegment, number>> = {}

  for (const [segment, keywords] of Object.entries(SEGMENT_KEYWORDS) as [Exclude<UserSegment, 'general'>, string[]][]) {
    if (segment === 'bargain_hunter') continue
    const score = countMatches(allSignals, keywords)
    if (score > 0) {
      scores[segment] = score
    }
  }

  // Find the segment with the highest score
  let best: UserSegment = 'general'
  let bestScore = 0
  for (const [segment, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score
      best = segment as UserSegment
    }
  }

  // Require at least 2 signals to assign a non-general segment
  if (bestScore < 2) return 'general'

  return best
}
