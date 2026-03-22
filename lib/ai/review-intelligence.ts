/**
 * Review Intelligence — agrega avaliações, gera trust scores,
 * e extrai temas de sentimento para recomendações de produto.
 *
 * Numa plataforma de comparação, não temos avaliações próprias — agregamos
 * sinais de:
 * 1. Metadata de ofertas (rating, contagem de reviews do marketplace)
 * 2. Comportamento do utilizador (clickouts, favoritos, alertas — social proof)
 * 3. Credibilidade da fonte (reviews Amazon > reviews Shopee)
 * 4. Maturidade do produto (tempo no mercado, número de ofertas)
 *
 * Output: TrustScore (0-100) + temas de sentimento + prós/contras.
 */

// ============================================
// TYPES
// ============================================

export interface ReviewSource {
  /** Fonte do marketplace (e.g., 'amazon-br', 'mercadolivre', 'shopee') */
  source: string
  /** Rating médio, 0-5 (null se indisponível) */
  rating: number | null
  /** Número total de avaliações */
  reviewCount: number
  /** Peso de credibilidade da fonte, 0-1 */
  credibilityWeight: number
}

export interface TrustScoreBreakdown {
  /** Qualidade ponderada das avaliações (0-30) */
  reviewQuality: number
  /** Volume de avaliações (0-20) */
  reviewVolume: number
  /** Prova social — favoritos, alertas, clickouts (0-20) */
  socialProof: number
  /** Credibilidade média das fontes (0-15) */
  sourceCredibility: number
  /** Maturidade no mercado — tempo + oferta (0-15) */
  marketMaturity: number
}

export type TrustLevel = 'excelente' | 'bom' | 'razoavel' | 'fraco' | 'sem_dados'

export interface TrustScore {
  /** Score final normalizado, 0-100 */
  score: number
  /** Nível qualitativo */
  level: TrustLevel
  /** Label em português para exibição */
  label: string
  /** Decomposição por fator */
  breakdown: TrustScoreBreakdown
  /** Até 3 pontos positivos em português */
  topPros: string[]
  /** Até 3 pontos negativos em português */
  topCons: string[]
  /** Resumo de confiança do comprador (uma linha) */
  buyerConfidence: string
}

export interface ProductReviewData {
  productId: string
  productName: string
  categorySlug?: string
  offers: {
    source: string
    rating?: number
    reviewCount?: number
    price: number
  }[]
  favoritesCount: number
  alertsCount: number
  /** Clickouts nos últimos 30 dias */
  clickoutCount: number
  /** Data da primeira vez que o produto apareceu na plataforma */
  firstSeenAt: Date
  /** Total de ofertas ativas */
  offerCount: number
  /** JSON de especificações do produto (opcional) */
  specsJson?: Record<string, unknown>
}

export type SentimentDirection = 'positive' | 'neutral' | 'negative'

export interface SentimentTheme {
  /** Identificador do tema (e.g., "camera_quality", "battery_life") */
  theme: string
  /** Direção do sentimento */
  sentiment: SentimentDirection
  /** Label em português para exibição */
  label: string
  /** Confiança na inferência, 0-1 */
  confidence: number
}

// ============================================
// CONSTANTS
// ============================================

/** Pesos de credibilidade por marketplace */
const SOURCE_CREDIBILITY_MAP: Record<string, number> = {
  'amazon-br': 0.95,
  'amazon': 0.95,
  'mercadolivre': 0.90,
  'mercado-livre': 0.90,
  'magalu': 0.88,
  'kabum': 0.85,
  'shopee': 0.75,
  'shein': 0.60,
}

/** Labels por nível de trust */
const TRUST_LEVEL_LABELS: Record<TrustLevel, string> = {
  excelente: 'Excelente',
  bom: 'Bom',
  razoavel: 'Razoável',
  fraco: 'Fraco',
  sem_dados: 'Sem dados',
}

/** Mensagens de confiança do comprador por nível */
const BUYER_CONFIDENCE_MESSAGES: Record<TrustLevel, string> = {
  excelente: 'Produto muito bem avaliado em múltiplas lojas — compra segura.',
  bom: 'Boas avaliações na maioria das lojas — recomendado.',
  razoavel: 'Avaliações mistas — pesquise antes de comprar.',
  fraco: 'Poucas avaliações — compre com cautela.',
  sem_dados: 'Produto novo ou sem avaliações disponíveis.',
}

// ============================================
// TEMAS DE SENTIMENTO POR CATEGORIA
// ============================================

interface SpecRule {
  theme: string
  label: string
  /** Função que recebe specs e retorna sentimento ou null se não aplicável */
  evaluate: (specs: Record<string, unknown>, name: string) => SentimentDirection | null
  confidence: number
}

const CATEGORY_SPEC_RULES: Record<string, SpecRule[]> = {
  celulares: [
    {
      theme: 'display_quality',
      label: 'Qualidade da tela',
      evaluate: (specs, name) => {
        const display = normalize(specs.display ?? specs.tela ?? '')
        const n = name.toLowerCase()
        if (/amoled|oled|super\s*retina/i.test(display) || /amoled|oled/i.test(n)) return 'positive'
        if (/ips|lcd/i.test(display)) return 'neutral'
        return null
      },
      confidence: 0.8,
    },
    {
      theme: 'camera_quality',
      label: 'Qualidade da câmera',
      evaluate: (specs, name) => {
        const cam = extractNumber(specs.camera ?? specs.camera_mp ?? '')
        const n = name.toLowerCase()
        if (cam >= 108 || /108\s*mp|200\s*mp/i.test(n)) return 'positive'
        if (cam >= 48) return 'positive'
        if (cam >= 12) return 'neutral'
        if (cam > 0) return 'negative'
        return null
      },
      confidence: 0.7,
    },
    {
      theme: 'battery_life',
      label: 'Duração da bateria',
      evaluate: (specs, name) => {
        const mah = extractNumber(specs.battery ?? specs.bateria ?? specs.battery_mah ?? '')
        const n = name.toLowerCase()
        const mahFromName = extractNumber(n.match(/(\d{4,5})\s*mah/i)?.[1] ?? '')
        const battery = mah || mahFromName
        if (battery >= 5000) return 'positive'
        if (battery >= 4000) return 'neutral'
        if (battery > 0) return 'negative'
        return null
      },
      confidence: 0.85,
    },
    {
      theme: 'performance',
      label: 'Desempenho',
      evaluate: (specs) => {
        const ram = extractNumber(specs.ram ?? specs.memoria_ram ?? '')
        if (ram >= 12) return 'positive'
        if (ram >= 6) return 'neutral'
        if (ram > 0) return 'negative'
        return null
      },
      confidence: 0.75,
    },
    {
      theme: 'storage',
      label: 'Armazenamento',
      evaluate: (specs, name) => {
        const storage = extractNumber(specs.storage ?? specs.armazenamento ?? '')
        const n = name.toLowerCase()
        const storageFromName = extractNumber(n.match(/(\d{2,4})\s*gb/i)?.[1] ?? '')
        const gb = storage || storageFromName
        if (gb >= 256) return 'positive'
        if (gb >= 128) return 'neutral'
        if (gb > 0) return 'negative'
        return null
      },
      confidence: 0.8,
    },
    {
      theme: 'build_quality',
      label: 'Qualidade de construção',
      evaluate: (specs) => {
        const material = normalize(specs.material ?? specs.build ?? '')
        if (/vidro|glass|cer[aâ]mica|titanium|tit[aâ]nio/i.test(material)) return 'positive'
        if (/metal|alum[ií]nio/i.test(material)) return 'neutral'
        if (/pl[aá]stico|plastic/i.test(material)) return 'negative'
        return null
      },
      confidence: 0.65,
    },
    {
      theme: 'update_support',
      label: 'Suporte a atualizações',
      evaluate: (_specs, name) => {
        const n = name.toLowerCase()
        if (/iphone|pixel|samsung\s*galaxy\s*s2[3-9]/i.test(n)) return 'positive'
        if (/xiaomi|redmi|poco/i.test(n)) return 'neutral'
        return null
      },
      confidence: 0.6,
    },
  ],

  notebooks: [
    {
      theme: 'performance',
      label: 'Desempenho',
      evaluate: (specs, name) => {
        const ram = extractNumber(specs.ram ?? specs.memoria_ram ?? '')
        const n = name.toLowerCase()
        const ramFromName = extractNumber(n.match(/(\d{1,2})\s*gb/i)?.[1] ?? '')
        const gb = ram || ramFromName
        if (gb >= 16) return 'positive'
        if (gb >= 8) return 'neutral'
        if (gb > 0) return 'negative'
        return null
      },
      confidence: 0.85,
    },
    {
      theme: 'display',
      label: 'Qualidade da tela',
      evaluate: (specs, name) => {
        const display = normalize(specs.display ?? specs.tela ?? '')
        const n = name.toLowerCase()
        const combined = `${display} ${n}`
        if (/oled|retina|4k|uhd/i.test(combined)) return 'positive'
        if (/full\s*hd|1080p|ips/i.test(combined)) return 'neutral'
        if (/hd\b|768p|tn/i.test(combined)) return 'negative'
        return null
      },
      confidence: 0.75,
    },
    {
      theme: 'battery',
      label: 'Duração da bateria',
      evaluate: (specs) => {
        const hours = extractNumber(specs.battery_hours ?? specs.autonomia ?? '')
        if (hours >= 12) return 'positive'
        if (hours >= 8) return 'neutral'
        if (hours > 0) return 'negative'
        return null
      },
      confidence: 0.7,
    },
    {
      theme: 'portability',
      label: 'Portabilidade',
      evaluate: (specs) => {
        const weight = extractFloat(specs.weight ?? specs.peso ?? '')
        if (weight > 0 && weight <= 1.4) return 'positive'
        if (weight > 0 && weight <= 2.0) return 'neutral'
        if (weight > 0) return 'negative'
        return null
      },
      confidence: 0.8,
    },
    {
      theme: 'storage',
      label: 'Armazenamento',
      evaluate: (specs, name) => {
        const combined = `${normalize(specs.storage ?? specs.armazenamento ?? '')} ${name.toLowerCase()}`
        if (/ssd/i.test(combined)) {
          const gb = extractNumber(combined.match(/(\d{3,4})\s*gb/i)?.[1] ?? '')
          if (gb >= 512) return 'positive'
          return 'positive' // SSD é sempre positivo
        }
        if (/hdd|hd\b/i.test(combined)) return 'negative'
        return null
      },
      confidence: 0.8,
    },
    {
      theme: 'keyboard',
      label: 'Teclado',
      evaluate: (specs) => {
        const kb = normalize(specs.keyboard ?? specs.teclado ?? '')
        if (/retroiluminado|backlit|mec[aâ]nico/i.test(kb)) return 'positive'
        return null
      },
      confidence: 0.6,
    },
    {
      theme: 'value',
      label: 'Custo-benefício',
      evaluate: () => null, // Calculado externamente baseado em preço vs specs
      confidence: 0.5,
    },
  ],

  audio: [
    {
      theme: 'sound_quality',
      label: 'Qualidade de som',
      evaluate: (specs, name) => {
        const combined = `${normalize(specs.driver ?? specs.codec ?? '')} ${name.toLowerCase()}`
        if (/ldac|aptx\s*hd|hi-?res|hi-?fi/i.test(combined)) return 'positive'
        if (/aac|sbc/i.test(combined)) return 'neutral'
        return null
      },
      confidence: 0.7,
    },
    {
      theme: 'noise_cancellation',
      label: 'Cancelamento de ruído',
      evaluate: (specs, name) => {
        const combined = `${normalize(specs.anc ?? specs.noise_cancellation ?? '')} ${name.toLowerCase()}`
        if (/anc|cancelamento.*ativo|noise\s*cancel/i.test(combined)) return 'positive'
        if (/transparência|ambient|transparency/i.test(combined)) return 'positive'
        return null
      },
      confidence: 0.85,
    },
    {
      theme: 'comfort',
      label: 'Conforto',
      evaluate: (specs) => {
        const weight = extractFloat(specs.weight ?? specs.peso ?? '')
        if (weight > 0 && weight <= 5) return 'positive' // gramas, fone leve
        if (weight > 0 && weight <= 8) return 'neutral'
        return null
      },
      confidence: 0.6,
    },
    {
      theme: 'battery',
      label: 'Duração da bateria',
      evaluate: (specs) => {
        const hours = extractNumber(specs.battery_hours ?? specs.autonomia ?? '')
        if (hours >= 30) return 'positive'
        if (hours >= 8) return 'neutral'
        if (hours > 0) return 'negative'
        return null
      },
      confidence: 0.8,
    },
    {
      theme: 'connectivity',
      label: 'Conectividade',
      evaluate: (specs, name) => {
        const combined = `${normalize(specs.bluetooth ?? specs.connectivity ?? '')} ${name.toLowerCase()}`
        if (/bluetooth\s*5\.[3-9]|multipoint/i.test(combined)) return 'positive'
        if (/bluetooth\s*5\.[0-2]/i.test(combined)) return 'neutral'
        return null
      },
      confidence: 0.65,
    },
  ],

  'smart-tvs': [
    {
      theme: 'image_quality',
      label: 'Qualidade de imagem',
      evaluate: (specs, name) => {
        const combined = `${normalize(specs.resolution ?? specs.resolucao ?? '')} ${name.toLowerCase()}`
        if (/8k|qled|oled|mini\s*led|neo\s*qled/i.test(combined)) return 'positive'
        if (/4k|uhd/i.test(combined)) return 'positive'
        if (/full\s*hd|1080p/i.test(combined)) return 'neutral'
        if (/hd\b|720p/i.test(combined)) return 'negative'
        return null
      },
      confidence: 0.85,
    },
    {
      theme: 'smart_features',
      label: 'Recursos smart',
      evaluate: (specs, name) => {
        const combined = `${normalize(specs.os ?? specs.smart_os ?? '')} ${name.toLowerCase()}`
        if (/google\s*tv|android\s*tv|webos|tizen/i.test(combined)) return 'positive'
        if (/roku|fire\s*tv/i.test(combined)) return 'neutral'
        return null
      },
      confidence: 0.7,
    },
    {
      theme: 'sound',
      label: 'Qualidade de som',
      evaluate: (specs) => {
        const watts = extractNumber(specs.audio_watts ?? specs.potencia_audio ?? '')
        if (watts >= 40) return 'positive'
        if (watts >= 20) return 'neutral'
        if (watts > 0) return 'negative'
        return null
      },
      confidence: 0.65,
    },
    {
      theme: 'size',
      label: 'Tamanho',
      evaluate: (specs, name) => {
        const inches = extractNumber(specs.size ?? specs.tamanho ?? '')
        const nameInches = extractNumber(name.match(/(\d{2})["'″]?\s*(?:pol|inch)?/i)?.[1] ?? '')
        const size = inches || nameInches
        if (size >= 55) return 'positive'
        if (size >= 43) return 'neutral'
        if (size > 0) return 'negative'
        return null
      },
      confidence: 0.8,
    },
    {
      theme: 'gaming',
      label: 'Gaming',
      evaluate: (specs, name) => {
        const combined = `${normalize(specs.refresh_rate ?? specs.hdmi ?? '')} ${name.toLowerCase()}`
        if (/120\s*hz|144\s*hz|vrr|allm|hdmi\s*2\.1|game\s*mode/i.test(combined)) return 'positive'
        if (/60\s*hz/i.test(combined)) return 'neutral'
        return null
      },
      confidence: 0.7,
    },
  ],

  casa: [
    {
      theme: 'capacity',
      label: 'Capacidade',
      evaluate: (specs, name) => {
        const liters = extractFloat(specs.capacity ?? specs.capacidade ?? '')
        const n = name.toLowerCase()
        const litersFromName = extractFloat(n.match(/([\d.,]+)\s*l(?:itro)?/i)?.[1] ?? '')
        const cap = liters || litersFromName
        if (cap >= 5) return 'positive'
        if (cap >= 3) return 'neutral'
        if (cap > 0) return 'negative'
        return null
      },
      confidence: 0.8,
    },
    {
      theme: 'power',
      label: 'Potência',
      evaluate: (specs, name) => {
        const watts = extractNumber(specs.power ?? specs.potencia ?? '')
        const n = name.toLowerCase()
        const wattsFromName = extractNumber(n.match(/(\d{3,4})\s*w/i)?.[1] ?? '')
        const w = watts || wattsFromName
        if (w >= 1500) return 'positive'
        if (w >= 800) return 'neutral'
        if (w > 0) return 'negative'
        return null
      },
      confidence: 0.7,
    },
    {
      theme: 'ease_of_use',
      label: 'Facilidade de uso',
      evaluate: (specs, name) => {
        const combined = `${normalize(specs.features ?? '')} ${name.toLowerCase()}`
        if (/digital|touch|app|smart|programável|timer/i.test(combined)) return 'positive'
        return null
      },
      confidence: 0.6,
    },
    {
      theme: 'durability',
      label: 'Durabilidade',
      evaluate: (specs) => {
        const material = normalize(specs.material ?? '')
        if (/inox|a[cç]o\s*inoxid[aá]vel|stainless/i.test(material)) return 'positive'
        if (/alum[ií]nio|metal/i.test(material)) return 'neutral'
        if (/pl[aá]stico/i.test(material)) return 'negative'
        return null
      },
      confidence: 0.65,
    },
    {
      theme: 'design',
      label: 'Design',
      evaluate: () => null, // Subjetivo demais para inferir de specs
      confidence: 0.4,
    },
  ],
}

// ============================================
// MAIN FUNCTION
// ============================================

/**
 * Calcula o TrustScore (0-100) combinando 5 fatores:
 * reviewQuality, reviewVolume, socialProof, sourceCredibility, marketMaturity.
 */
export function computeTrustScore(data: ProductReviewData): TrustScore {
  const reviewSources = buildReviewSources(data.offers)

  // --- Fator 1: Qualidade das avaliações (0-30) ---
  const reviewQuality = computeReviewQuality(reviewSources)

  // --- Fator 2: Volume de avaliações (0-20) ---
  const reviewVolume = computeReviewVolume(reviewSources)

  // --- Fator 3: Prova social (0-20) ---
  const socialProof = computeSocialProof(
    data.clickoutCount,
    data.favoritesCount,
    data.alertsCount
  )

  // --- Fator 4: Credibilidade das fontes (0-15) ---
  const sourceCredibility = computeSourceCredibility(reviewSources)

  // --- Fator 5: Maturidade no mercado (0-15) ---
  const marketMaturity = computeMarketMaturity(data.firstSeenAt, data.offerCount)

  const breakdown: TrustScoreBreakdown = {
    reviewQuality,
    reviewVolume,
    socialProof,
    sourceCredibility,
    marketMaturity,
  }

  const score = clamp(
    reviewQuality + reviewVolume + socialProof + sourceCredibility + marketMaturity,
    0,
    100
  )

  const level = determineTrustLevel(score)
  const label = TRUST_LEVEL_LABELS[level]
  const buyerConfidence = generateBuyerConfidence({ score, level } as TrustScore)

  // Inferir temas de sentimento para prós/contras
  const themes = inferSentimentThemes(
    data.productName,
    data.categorySlug,
    data.specsJson
  )
  const { pros, cons } = generateProsConsFromThemes(themes)

  return {
    score,
    level,
    label,
    breakdown,
    topPros: pros,
    topCons: cons,
    buyerConfidence,
  }
}

// ============================================
// FATOR 1: QUALIDADE DAS AVALIAÇÕES (0-30)
// ============================================

function computeReviewQuality(sources: ReviewSource[]): number {
  const rated = sources.filter(s => s.rating !== null && s.rating > 0)

  if (rated.length === 0) {
    // Sem ratings — pontuação neutra, não penaliza
    return 10
  }

  // Média ponderada por credibilidade
  let weightedSum = 0
  let totalWeight = 0
  for (const s of rated) {
    weightedSum += (s.rating as number) * s.credibilityWeight
    totalWeight += s.credibilityWeight
  }

  const weightedAvg = totalWeight > 0 ? weightedSum / totalWeight : 0

  // Mapear rating para pontuação
  if (weightedAvg >= 4.8) return 30
  if (weightedAvg >= 4.5) return 25
  if (weightedAvg >= 4.0) return 20
  if (weightedAvg >= 3.5) return 15
  if (weightedAvg >= 3.0) return 10
  return 5
}

// ============================================
// FATOR 2: VOLUME DE AVALIAÇÕES (0-20)
// ============================================

function computeReviewVolume(sources: ReviewSource[]): number {
  const totalReviews = sources.reduce((sum, s) => sum + s.reviewCount, 0)

  if (totalReviews >= 1000) return 20
  if (totalReviews >= 500) return 16
  if (totalReviews >= 100) return 12
  if (totalReviews >= 20) return 8
  if (totalReviews >= 5) return 4
  return 2
}

// ============================================
// FATOR 3: PROVA SOCIAL (0-20)
// ============================================

function computeSocialProof(
  clickoutCount: number,
  favoritesCount: number,
  alertsCount: number
): number {
  let score = 0

  // Clickouts (max 8)
  if (clickoutCount >= 10) score += 8
  else if (clickoutCount >= 5) score += 5
  else if (clickoutCount >= 1) score += 3

  // Favoritos (max 5)
  if (favoritesCount >= 5) score += 5
  else if (favoritesCount >= 1) score += 3

  // Alertas (max 7)
  if (alertsCount >= 3) score += 7
  else if (alertsCount >= 1) score += 4

  return clamp(score, 0, 20)
}

// ============================================
// FATOR 4: CREDIBILIDADE DAS FONTES (0-15)
// ============================================

function computeSourceCredibility(sources: ReviewSource[]): number {
  if (sources.length === 0) return 0

  const avgCredibility =
    sources.reduce((sum, s) => sum + s.credibilityWeight, 0) / sources.length

  return clamp(Math.round(avgCredibility * 15), 0, 15)
}

// ============================================
// FATOR 5: MATURIDADE NO MERCADO (0-15)
// ============================================

function computeMarketMaturity(firstSeenAt: Date, offerCount: number): number {
  let score = 0

  // Idade na plataforma
  const now = new Date()
  const ageInDays = Math.floor(
    (now.getTime() - firstSeenAt.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (ageInDays >= 90) score += 8
  else if (ageInDays >= 30) score += 5
  else score += 2

  // Número de ofertas ativas
  if (offerCount >= 5) score += 7
  else if (offerCount >= 3) score += 5
  else if (offerCount >= 1) score += 3

  return clamp(score, 0, 15)
}

// ============================================
// NÍVEL DE CONFIANÇA
// ============================================

function determineTrustLevel(score: number): TrustLevel {
  if (score >= 80) return 'excelente'
  if (score >= 60) return 'bom'
  if (score >= 40) return 'razoavel'
  if (score >= 20) return 'fraco'
  return 'sem_dados'
}

// ============================================
// SENTIMENT THEMES
// ============================================

/**
 * Infere temas de sentimento (prós/contras prováveis) a partir
 * do nome do produto, categoria e especificações.
 *
 * Não requer acesso à rede — usa heurísticas locais.
 */
export function inferSentimentThemes(
  productName: string,
  categorySlug?: string,
  specsJson?: Record<string, unknown>
): SentimentTheme[] {
  const themes: SentimentTheme[] = []
  const specs = specsJson ?? {}

  // Determinar categoria
  const category = categorySlug ?? inferCategoryFromName(productName)
  if (!category) return themes

  // Normalizar slug da categoria para chave do mapa
  const categoryKey = normalizeCategoryKey(category)
  const rules = CATEGORY_SPEC_RULES[categoryKey]
  if (!rules) return themes

  for (const rule of rules) {
    const sentiment = rule.evaluate(specs, productName)
    if (sentiment !== null) {
      themes.push({
        theme: rule.theme,
        sentiment,
        label: rule.label,
        confidence: rule.confidence,
      })
    }
  }

  return themes
}

// ============================================
// BUYER CONFIDENCE
// ============================================

/**
 * Gera resumo de confiança do comprador em uma linha (pt-BR).
 */
export function generateBuyerConfidence(score: Pick<TrustScore, 'level'>): string {
  return BUYER_CONFIDENCE_MESSAGES[score.level]
}

// ============================================
// SOURCE CREDIBILITY
// ============================================

/**
 * Retorna o peso de credibilidade de um marketplace.
 * Fontes desconhecidas recebem peso padrão de 0.50.
 */
export function getSourceCredibilityWeight(source: string): number {
  const key = source.toLowerCase().trim()
  return SOURCE_CREDIBILITY_MAP[key] ?? 0.50
}

// ============================================
// PROS & CONS
// ============================================

/**
 * Extrai até 3 prós e até 3 contras a partir dos temas de sentimento.
 * Ordenados por confiança decrescente.
 */
export function generateProsConsFromThemes(
  themes: SentimentTheme[]
): { pros: string[]; cons: string[] } {
  const sorted = [...themes].sort((a, b) => b.confidence - a.confidence)

  const pros = sorted
    .filter(t => t.sentiment === 'positive')
    .slice(0, 3)
    .map(t => t.label)

  const cons = sorted
    .filter(t => t.sentiment === 'negative')
    .slice(0, 3)
    .map(t => t.label)

  return { pros, cons }
}

// ============================================
// INTERNAL HELPERS
// ============================================

/** Constrói ReviewSource[] a partir das ofertas do produto */
function buildReviewSources(
  offers: ProductReviewData['offers']
): ReviewSource[] {
  return offers.map(offer => ({
    source: offer.source,
    rating: offer.rating ?? null,
    reviewCount: offer.reviewCount ?? 0,
    credibilityWeight: getSourceCredibilityWeight(offer.source),
  }))
}

/** Tenta inferir a categoria a partir do nome do produto */
function inferCategoryFromName(name: string): string | null {
  const n = name.toLowerCase()

  if (/iphone|galaxy|xiaomi|redmi|poco|motorola|moto\s*g|pixel|celular|smartphone/i.test(n)) {
    return 'celulares'
  }
  if (/notebook|laptop|macbook|chromebook/i.test(n)) {
    return 'notebooks'
  }
  if (/fone|headphone|earbuds|airpods|headset|caixa\s*de\s*som|speaker|jbl|soundbar/i.test(n)) {
    return 'audio'
  }
  if (/tv|televisão|televisor|smart\s*tv/i.test(n)) {
    return 'smart-tvs'
  }
  if (/air\s*fryer|fritadeira|liquidificador|aspirador|cafeteira|panela|microondas|geladeira|lavadora|fogão/i.test(n)) {
    return 'casa'
  }

  return null
}

/** Normaliza chave de categoria para lookup no mapa de regras */
function normalizeCategoryKey(slug: string): string {
  const key = slug.toLowerCase().trim()

  // Aliases comuns
  const aliases: Record<string, string> = {
    'celulares': 'celulares',
    'celular': 'celulares',
    'smartphones': 'celulares',
    'smartphone': 'celulares',
    'notebooks': 'notebooks',
    'notebook': 'notebooks',
    'laptops': 'notebooks',
    'laptop': 'notebooks',
    'audio': 'audio',
    'áudio': 'audio',
    'fones': 'audio',
    'fones-de-ouvido': 'audio',
    'smart-tvs': 'smart-tvs',
    'tvs': 'smart-tvs',
    'televisores': 'smart-tvs',
    'casa': 'casa',
    'eletrodomesticos': 'casa',
    'eletrodomésticos': 'casa',
    'cozinha': 'casa',
  }

  return aliases[key] ?? key
}

/** Converte valor desconhecido em string normalizada */
function normalize(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

/** Extrai o primeiro número inteiro de uma string */
function extractNumber(value: unknown): number {
  const str = normalize(value)
  const match = str.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

/** Extrai o primeiro número decimal de uma string (suporta vírgula como separador) */
function extractFloat(value: unknown): number {
  const str = normalize(value)
  const match = str.match(/([\d]+[.,]?\d*)/)
  if (!match) return 0
  return parseFloat(match[1].replace(',', '.'))
}

/** Clamp um valor entre min e max */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
