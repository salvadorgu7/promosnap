/**
 * Category-specific comparison attributes and use-case weights.
 *
 * This is the core of "Versus 2.0" — enables ranking products
 * not just by price, but by HOW WELL they fit a specific use case.
 *
 * Usage:
 *   const config = getCategoryConfig('celulares')
 *   const ranked = rankByUseCase(products, 'fotografia', config)
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface ComparisonAttribute {
  key: string
  label: string
  /** How to extract this from product title/specs (regex patterns) */
  extractors: RegExp[]
  /** Unit for display (e.g., "MP", "mAh", "GB") */
  unit?: string
  /** Higher is better? (true for RAM, false for weight) */
  higherIsBetter: boolean
  /** Importance weight (0-10) in general comparison */
  baseWeight: number
}

export interface UseCase {
  slug: string
  label: string
  description: string
  /** Weight overrides per attribute key (0-10). Missing = use baseWeight */
  weights: Record<string, number>
}

export interface CategoryComparisonConfig {
  slug: string
  name: string
  attributes: ComparisonAttribute[]
  useCases: UseCase[]
  /** Keywords that identify "pros" for this category */
  proKeywords: string[]
  /** Keywords that identify "cons" */
  conKeywords: string[]
}

// ── Category Configs ───────────────────────────────────────────────────────

const CELULARES: CategoryComparisonConfig = {
  slug: 'celulares',
  name: 'Celulares',
  attributes: [
    {
      key: 'camera',
      label: 'Câmera Principal',
      extractors: [/(\d+)\s*mp/i, /camera.*?(\d+)/i],
      unit: 'MP',
      higherIsBetter: true,
      baseWeight: 7,
    },
    {
      key: 'battery',
      label: 'Bateria',
      extractors: [/(\d{4,5})\s*mah/i, /bateria.*?(\d{4,5})/i],
      unit: 'mAh',
      higherIsBetter: true,
      baseWeight: 7,
    },
    {
      key: 'storage',
      label: 'Armazenamento',
      extractors: [/(\d+)\s*gb(?!\s*ram)/i, /(\d+)gb\b/i],
      unit: 'GB',
      higherIsBetter: true,
      baseWeight: 6,
    },
    {
      key: 'ram',
      label: 'Memória RAM',
      extractors: [/(\d+)\s*gb\s*ram/i, /ram.*?(\d+)/i, /(\d+)\/\d+\s*gb/i],
      unit: 'GB',
      higherIsBetter: true,
      baseWeight: 6,
    },
    {
      key: 'screen',
      label: 'Tela',
      extractors: [/(\d+[.,]\d+)["″\s]*pol/i, /tela.*?(\d+[.,]\d+)/i],
      unit: '"',
      higherIsBetter: true,
      baseWeight: 5,
    },
    {
      key: 'connectivity',
      label: 'Conectividade',
      extractors: [/\b(5g)\b/i, /\b(4g)\b/i, /\b(lte)\b/i],
      unit: '',
      higherIsBetter: true,
      baseWeight: 4,
    },
  ],
  useCases: [
    {
      slug: 'fotografia',
      label: 'Fotografia',
      description: 'Melhor câmera, estabilização, modo noturno',
      weights: { camera: 10, storage: 7, screen: 6, battery: 5, ram: 4, connectivity: 3 },
    },
    {
      slug: 'bateria',
      label: 'Duração de Bateria',
      description: 'Maior autonomia, uso intenso sem carregar',
      weights: { battery: 10, screen: 3, camera: 4, storage: 5, ram: 5, connectivity: 4 },
    },
    {
      slug: 'custo-beneficio',
      label: 'Custo-Benefício',
      description: 'Melhor equilíbrio entre preço e recursos',
      weights: { storage: 8, ram: 8, battery: 7, camera: 6, screen: 5, connectivity: 5 },
    },
    {
      slug: 'gaming',
      label: 'Jogos Mobile',
      description: 'Performance, tela, RAM e resfriamento',
      weights: { ram: 10, screen: 8, storage: 7, battery: 6, camera: 3, connectivity: 5 },
    },
  ],
  proKeywords: ['câmera', 'bateria grande', '5g', 'amoled', 'carregamento rápido', 'nfc'],
  conKeywords: ['sem nfc', 'plástico', 'sem 5g', 'tela lcd', 'carregamento lento'],
}

const NOTEBOOKS: CategoryComparisonConfig = {
  slug: 'notebooks',
  name: 'Notebooks',
  attributes: [
    {
      key: 'ram',
      label: 'Memória RAM',
      extractors: [/(\d+)\s*gb\s*(?:ram|ddr|lpddr)/i, /ram.*?(\d+)/i],
      unit: 'GB',
      higherIsBetter: true,
      baseWeight: 8,
    },
    {
      key: 'ssd',
      label: 'Armazenamento SSD',
      extractors: [/(\d+)\s*gb\s*ssd/i, /ssd.*?(\d+)/i, /(\d+)\s*gb\s*(?:nvme|emmc)/i],
      unit: 'GB',
      higherIsBetter: true,
      baseWeight: 7,
    },
    {
      key: 'screen',
      label: 'Tela',
      extractors: [/(\d+[.,]\d+)["″\s]*(?:pol|")/i, /tela.*?(\d+[.,]\d+)/i],
      unit: '"',
      higherIsBetter: true,
      baseWeight: 5,
    },
    {
      key: 'processor',
      label: 'Processador',
      extractors: [/(?:core\s+)?i(\d)/i, /ryzen\s*(\d)/i, /m(\d)\s/i, /celeron/i, /pentium/i],
      unit: '',
      higherIsBetter: true,
      baseWeight: 9,
    },
    {
      key: 'weight',
      label: 'Peso',
      extractors: [/(\d+[.,]\d+)\s*kg/i, /peso.*?(\d+[.,]\d+)/i],
      unit: 'kg',
      higherIsBetter: false, // lighter is better
      baseWeight: 4,
    },
  ],
  useCases: [
    {
      slug: 'trabalho',
      label: 'Trabalho / Escritório',
      description: 'Produtividade, Office, reuniões, multitarefa',
      weights: { processor: 8, ram: 9, ssd: 8, screen: 6, weight: 5 },
    },
    {
      slug: 'estudo',
      label: 'Estudo',
      description: 'Leve, boa bateria, custo acessível',
      weights: { weight: 8, ssd: 7, ram: 6, screen: 5, processor: 5 },
    },
    {
      slug: 'gaming',
      label: 'Jogos',
      description: 'GPU dedicada, tela rápida, resfriamento',
      weights: { processor: 10, ram: 9, ssd: 8, screen: 7, weight: 2 },
    },
    {
      slug: 'portatil',
      label: 'Portabilidade',
      description: 'Leve, compacto, boa bateria',
      weights: { weight: 10, screen: 4, ssd: 6, ram: 5, processor: 5 },
    },
  ],
  proKeywords: ['ssd', 'ips', 'full hd', 'retroiluminado', 'usb-c', 'thunderbolt'],
  conKeywords: ['hd mecânico', 'tela tn', 'sem ssd', 'pesado', 'plástico fino'],
}

const FONES: CategoryComparisonConfig = {
  slug: 'audio',
  name: 'Fones de Ouvido',
  attributes: [
    {
      key: 'battery',
      label: 'Bateria',
      extractors: [/(\d+)\s*h(?:oras?)?/i, /bateria.*?(\d+)/i],
      unit: 'h',
      higherIsBetter: true,
      baseWeight: 7,
    },
    {
      key: 'anc',
      label: 'Cancelamento de Ruído',
      extractors: [/\b(anc)\b/i, /cancelamento.*?ruido/i, /noise.*?cancell/i],
      unit: '',
      higherIsBetter: true,
      baseWeight: 6,
    },
    {
      key: 'driver',
      label: 'Driver',
      extractors: [/(\d+)\s*mm/i, /driver.*?(\d+)/i],
      unit: 'mm',
      higherIsBetter: true,
      baseWeight: 5,
    },
    {
      key: 'waterproof',
      label: 'Resistência à Água',
      extractors: [/\b(ip[x5-8]\d?)\b/i, /resistente.*?agua/i],
      unit: '',
      higherIsBetter: true,
      baseWeight: 4,
    },
  ],
  useCases: [
    {
      slug: 'musica',
      label: 'Qualidade Musical',
      description: 'Melhor som, graves, clareza',
      weights: { driver: 10, anc: 6, battery: 5, waterproof: 2 },
    },
    {
      slug: 'exercicio',
      label: 'Exercício Físico',
      description: 'Resistente, seguro, bateria longa',
      weights: { waterproof: 10, battery: 8, driver: 4, anc: 3 },
    },
    {
      slug: 'escritorio',
      label: 'Escritório / Calls',
      description: 'ANC, microfone, conforto',
      weights: { anc: 10, battery: 7, driver: 5, waterproof: 2 },
    },
  ],
  proKeywords: ['anc', 'bluetooth 5.3', 'aptx', 'ldac', 'multipoint', 'case compacto'],
  conKeywords: ['sem anc', 'microfone fraco', 'bluetooth antigo', 'desconfortável'],
}

const SMART_TVS: CategoryComparisonConfig = {
  slug: 'smart-tvs',
  name: 'Smart TVs',
  attributes: [
    {
      key: 'screen_size',
      label: 'Tamanho da Tela',
      extractors: [/(\d{2,3})["″\s]*(?:pol|")/i, /(\d{2,3})\s*polegadas/i],
      unit: '"',
      higherIsBetter: true,
      baseWeight: 8,
    },
    {
      key: 'resolution',
      label: 'Resolução',
      extractors: [/\b(4k)\b/i, /\b(8k)\b/i, /\b(full\s*hd)\b/i, /\b(hd)\b/i],
      unit: '',
      higherIsBetter: true,
      baseWeight: 7,
    },
    {
      key: 'panel',
      label: 'Tipo de Painel',
      extractors: [/\b(oled)\b/i, /\b(qled)\b/i, /\b(led)\b/i, /\b(mini.?led)\b/i],
      unit: '',
      higherIsBetter: true,
      baseWeight: 6,
    },
    {
      key: 'refresh',
      label: 'Taxa de Atualização',
      extractors: [/(\d+)\s*hz/i],
      unit: 'Hz',
      higherIsBetter: true,
      baseWeight: 5,
    },
  ],
  useCases: [
    {
      slug: 'filmes',
      label: 'Filmes e Séries',
      description: 'Cores, contraste, HDR, tamanho',
      weights: { panel: 10, resolution: 9, screen_size: 8, refresh: 4 },
    },
    {
      slug: 'gaming-tv',
      label: 'Jogos',
      description: 'Resposta rápida, 120Hz, HDMI 2.1',
      weights: { refresh: 10, resolution: 8, panel: 7, screen_size: 6 },
    },
    {
      slug: 'sala-grande',
      label: 'Sala Grande',
      description: 'Tela grande, bom ângulo, som',
      weights: { screen_size: 10, panel: 7, resolution: 6, refresh: 4 },
    },
  ],
  proKeywords: ['hdr', 'dolby vision', 'hdmi 2.1', '120hz', 'google tv', 'alexa'],
  conKeywords: ['sem hdr', 'hd apenas', 'painel va', 'sem bluetooth', 'som fraco'],
}

// ── Registry ───────────────────────────────────────────────────────────────

const CATEGORY_CONFIGS: Record<string, CategoryComparisonConfig> = {
  celulares: CELULARES,
  notebooks: NOTEBOOKS,
  audio: FONES,
  'smart-tvs': SMART_TVS,
}

export function getCategoryConfig(slug: string): CategoryComparisonConfig | null {
  return CATEGORY_CONFIGS[slug] || null
}

export function getAllCategoryConfigs(): CategoryComparisonConfig[] {
  return Object.values(CATEGORY_CONFIGS)
}

export function getUseCasesForCategory(categorySlug: string): UseCase[] {
  return CATEGORY_CONFIGS[categorySlug]?.useCases || []
}

// ── Attribute Extraction ───────────────────────────────────────────────────

export interface ExtractedAttribute {
  key: string
  label: string
  value: number | string
  rawMatch: string
  unit?: string
}

/**
 * Extract structured attributes from product title + specs using category config.
 */
export function extractAttributes(
  title: string,
  specsJson: Record<string, unknown> | null,
  categorySlug: string
): ExtractedAttribute[] {
  const config = getCategoryConfig(categorySlug)
  if (!config) return []

  const results: ExtractedAttribute[] = []
  const searchText = title + ' ' + (specsJson ? JSON.stringify(specsJson) : '')

  for (const attr of config.attributes) {
    for (const pattern of attr.extractors) {
      const match = searchText.match(pattern)
      if (match) {
        const rawValue = match[1] || match[0]
        const numValue = parseFloat(rawValue.replace(',', '.'))
        results.push({
          key: attr.key,
          label: attr.label,
          value: isNaN(numValue) ? rawValue : numValue,
          rawMatch: match[0],
          unit: attr.unit,
        })
        break // First match wins per attribute
      }
    }
  }

  return results
}

// ── Use-Case Scoring ───────────────────────────────────────────────────────

export interface UseCaseScore {
  productId: string
  productName: string
  score: number
  breakdown: { attribute: string; value: number | string; weight: number; contribution: number }[]
}

/**
 * Score a list of products for a specific use case.
 * Returns products ranked by how well they fit the use case.
 */
export function rankByUseCase(
  products: { id: string; name: string; title: string; specsJson?: Record<string, unknown> | null; currentPrice?: number }[],
  useCaseSlug: string,
  categorySlug: string
): UseCaseScore[] {
  const config = getCategoryConfig(categorySlug)
  if (!config) return []

  const useCase = config.useCases.find(uc => uc.slug === useCaseSlug)
  if (!useCase) return []

  const scores: UseCaseScore[] = []

  // Extract attributes for all products
  const productAttrs = products.map(p => ({
    product: p,
    attrs: extractAttributes(p.title || p.name, p.specsJson || null, categorySlug),
  }))

  // Find min/max per attribute for normalization
  const attrRanges: Record<string, { min: number; max: number }> = {}
  for (const { attrs } of productAttrs) {
    for (const attr of attrs) {
      if (typeof attr.value !== 'number') continue
      if (!attrRanges[attr.key]) {
        attrRanges[attr.key] = { min: attr.value, max: attr.value }
      } else {
        attrRanges[attr.key].min = Math.min(attrRanges[attr.key].min, attr.value)
        attrRanges[attr.key].max = Math.max(attrRanges[attr.key].max, attr.value)
      }
    }
  }

  for (const { product, attrs } of productAttrs) {
    let totalScore = 0
    let totalWeight = 0
    const breakdown: UseCaseScore['breakdown'] = []

    for (const attr of attrs) {
      const attrConfig = config.attributes.find(a => a.key === attr.key)
      if (!attrConfig) continue

      const weight = useCase.weights[attr.key] ?? attrConfig.baseWeight
      if (weight === 0) continue

      let normalizedValue = 0
      if (typeof attr.value === 'number' && attrRanges[attr.key]) {
        const range = attrRanges[attr.key]
        if (range.max > range.min) {
          normalizedValue = (attr.value - range.min) / (range.max - range.min)
          if (!attrConfig.higherIsBetter) normalizedValue = 1 - normalizedValue
        } else {
          normalizedValue = 0.5 // Same value for all
        }
      } else if (typeof attr.value === 'string') {
        // Binary attribute (has/doesn't have) — having it = 1.0
        normalizedValue = 1.0
      }

      const contribution = normalizedValue * weight
      totalScore += contribution
      totalWeight += weight

      breakdown.push({
        attribute: attr.label,
        value: attr.value,
        weight,
        contribution: Math.round(contribution * 10) / 10,
      })
    }

    // Normalize to 0-100
    const finalScore = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0

    scores.push({
      productId: product.id,
      productName: product.name,
      score: finalScore,
      breakdown,
    })
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score)
  return scores
}
