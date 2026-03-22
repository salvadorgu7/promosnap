/**
 * Smart Suggestions Engine — context-aware suggestions that adapt to user journey.
 *
 * Instead of static "melhor celular ate R$ 2000" chips, this generates
 * dynamic suggestions based on:
 * - User's conversation history (what they already asked)
 * - Their purchase phase (browsing vs deciding)
 * - Current trending topics
 * - Their segment/interests
 * - Time of day / seasonal events
 * - What they HAVEN'T explored yet (diversification)
 */

// ============================================
// TYPES
// ============================================

export interface SuggestionContext {
  conversationHistory: { role: string; content: string }[]
  purchasePhase?: 'browsing' | 'researching' | 'comparing' | 'deciding' | 'ready_to_buy'
  userSegment?: string
  userInterests?: string[]
  lastProducts?: { name: string; price: number; category?: string }[]
  currentTime?: Date
}

export type SuggestionType =
  | 'trending'
  | 'follow_up'
  | 'deepdive'
  | 'discovery'
  | 'deal'
  | 'comparison'
  | 'seasonal'
  | 'complementary'

export interface SmartSuggestion {
  text: string
  query: string
  icon: string
  type: SuggestionType
  relevanceScore: number
  reason: string
}

// ============================================
// SEGMENT SUGGESTION MAPS
// ============================================

const SEGMENT_SUGGESTIONS: Record<string, SmartSuggestion[]> = {
  tech_enthusiast: [
    {
      text: 'Melhor notebook para programar',
      query: 'melhor notebook para programar',
      icon: '\u{1F4BB}',
      type: 'discovery',
      relevanceScore: 0.9,
      reason: 'segment:tech_enthusiast + categoria popular',
    },
    {
      text: 'Monitor 4K custo-beneficio',
      query: 'melhor monitor 4k custo-beneficio',
      icon: '\u{1F5A5}\u{FE0F}',
      type: 'discovery',
      relevanceScore: 0.85,
      reason: 'segment:tech_enthusiast + periferico trending',
    },
    {
      text: 'SSD NVMe ate R$ 300',
      query: 'melhor ssd nvme ate 300 reais',
      icon: '\u{1F4BE}',
      type: 'deal',
      relevanceScore: 0.8,
      reason: 'segment:tech_enthusiast + budget pick',
    },
    {
      text: 'Teclado mecanico para trabalho',
      query: 'melhor teclado mecanico para trabalho',
      icon: '\u{2328}\u{FE0F}',
      type: 'discovery',
      relevanceScore: 0.75,
      reason: 'segment:tech_enthusiast + periferico',
    },
    {
      text: 'Hub USB-C bom e barato',
      query: 'hub usb-c bom e barato',
      icon: '\u{1F50C}',
      type: 'deal',
      relevanceScore: 0.7,
      reason: 'segment:tech_enthusiast + acessorio',
    },
    {
      text: 'Fone com cancelamento de ruido',
      query: 'melhor fone cancelamento de ruido',
      icon: '\u{1F3A7}',
      type: 'discovery',
      relevanceScore: 0.7,
      reason: 'segment:tech_enthusiast + audio trending',
    },
  ],

  bargain_hunter: [
    {
      text: 'Ofertas do dia com maior desconto',
      query: 'maiores descontos do dia',
      icon: '\u{1F525}',
      type: 'deal',
      relevanceScore: 0.95,
      reason: 'segment:bargain_hunter + deals priority',
    },
    {
      text: 'Produtos com menor preco historico',
      query: 'produtos no menor preco historico',
      icon: '\u{1F4C9}',
      type: 'deal',
      relevanceScore: 0.9,
      reason: 'segment:bargain_hunter + preco historico',
    },
    {
      text: 'Cupons ativos das maiores lojas',
      query: 'cupons ativos amazon mercado livre',
      icon: '\u{1F39F}\u{FE0F}',
      type: 'deal',
      relevanceScore: 0.85,
      reason: 'segment:bargain_hunter + cupons',
    },
    {
      text: 'Eletronicos com mais de 30% OFF',
      query: 'eletronicos com desconto acima de 30 porcento',
      icon: '\u{26A1}',
      type: 'deal',
      relevanceScore: 0.8,
      reason: 'segment:bargain_hunter + desconto alto',
    },
    {
      text: 'Melhores ofertas da Amazon hoje',
      query: 'melhores ofertas amazon hoje',
      icon: '\u{1F4E6}',
      type: 'deal',
      relevanceScore: 0.75,
      reason: 'segment:bargain_hunter + marketplace popular',
    },
    {
      text: 'Queda de preco nesta semana',
      query: 'produtos que tiveram queda de preco esta semana',
      icon: '\u{1F4B8}',
      type: 'deal',
      relevanceScore: 0.7,
      reason: 'segment:bargain_hunter + tendencia de preco',
    },
  ],

  gamer: [
    {
      text: 'Melhor placa de video ate R$ 3.000',
      query: 'melhor placa de video ate 3000 reais',
      icon: '\u{1F3AE}',
      type: 'discovery',
      relevanceScore: 0.9,
      reason: 'segment:gamer + GPU alta demanda',
    },
    {
      text: 'Headset gamer custo-beneficio',
      query: 'melhor headset gamer custo-beneficio',
      icon: '\u{1F3A7}',
      type: 'discovery',
      relevanceScore: 0.85,
      reason: 'segment:gamer + periferico',
    },
    {
      text: 'Mouse gamer ate R$ 200',
      query: 'melhor mouse gamer ate 200 reais',
      icon: '\u{1F5B1}\u{FE0F}',
      type: 'deal',
      relevanceScore: 0.8,
      reason: 'segment:gamer + periferico budget',
    },
    {
      text: 'Monitor 144Hz vale a pena?',
      query: 'monitor 144hz vale a pena para jogos',
      icon: '\u{1F5A5}\u{FE0F}',
      type: 'deepdive',
      relevanceScore: 0.75,
      reason: 'segment:gamer + especificacao decisional',
    },
    {
      text: 'PC Gamer completo ate R$ 5.000',
      query: 'melhor pc gamer completo ate 5000 reais',
      icon: '\u{1F4BB}',
      type: 'discovery',
      relevanceScore: 0.75,
      reason: 'segment:gamer + setup completo',
    },
    {
      text: 'Cadeira gamer boa e barata',
      query: 'melhor cadeira gamer boa e barata',
      icon: '\u{1FA91}',
      type: 'deal',
      relevanceScore: 0.7,
      reason: 'segment:gamer + conforto',
    },
  ],

  casa_cozinha: [
    {
      text: 'Air Fryer boa e barata',
      query: 'melhor air fryer boa e barata',
      icon: '\u{1F373}',
      type: 'discovery',
      relevanceScore: 0.9,
      reason: 'segment:casa_cozinha + top categoria',
    },
    {
      text: 'Aspirador robo vale a pena?',
      query: 'aspirador robo vale a pena comprar',
      icon: '\u{1F916}',
      type: 'deepdive',
      relevanceScore: 0.85,
      reason: 'segment:casa_cozinha + categoria trending',
    },
    {
      text: 'Cafeteira expresso ate R$ 500',
      query: 'melhor cafeteira expresso ate 500 reais',
      icon: '\u{2615}',
      type: 'deal',
      relevanceScore: 0.8,
      reason: 'segment:casa_cozinha + budget pick',
    },
    {
      text: 'Panela eletrica de pressao',
      query: 'melhor panela eletrica de pressao',
      icon: '\u{1F372}',
      type: 'discovery',
      relevanceScore: 0.75,
      reason: 'segment:casa_cozinha + utensilio popular',
    },
    {
      text: 'Liquidificador potente',
      query: 'melhor liquidificador potente',
      icon: '\u{1F964}',
      type: 'discovery',
      relevanceScore: 0.7,
      reason: 'segment:casa_cozinha + utensilio basico',
    },
    {
      text: 'Ar condicionado econom\u00edco',
      query: 'ar condicionado mais economico custo-beneficio',
      icon: '\u{2744}\u{FE0F}',
      type: 'discovery',
      relevanceScore: 0.7,
      reason: 'segment:casa_cozinha + eletrodomestico grande',
    },
  ],

  mobile_first: [
    {
      text: 'Melhor celular ate R$ 2.000',
      query: 'melhor celular ate 2000 reais',
      icon: '\u{1F4F1}',
      type: 'discovery',
      relevanceScore: 0.95,
      reason: 'segment:mobile_first + #1 categoria BR',
    },
    {
      text: 'AirPods vs Galaxy Buds',
      query: 'comparar airpods e galaxy buds',
      icon: '\u{1F3A7}',
      type: 'comparison',
      relevanceScore: 0.85,
      reason: 'segment:mobile_first + comparacao popular',
    },
    {
      text: 'Celular com melhor camera',
      query: 'celular com melhor camera para fotos',
      icon: '\u{1F4F7}',
      type: 'deepdive',
      relevanceScore: 0.8,
      reason: 'segment:mobile_first + feature decisional',
    },
    {
      text: 'Smartwatch custo-beneficio',
      query: 'melhor smartwatch custo-beneficio',
      icon: '\u{231A}',
      type: 'discovery',
      relevanceScore: 0.75,
      reason: 'segment:mobile_first + wearable trending',
    },
    {
      text: 'Carregador turbo portatil',
      query: 'melhor carregador portatil power bank',
      icon: '\u{1F50B}',
      type: 'complementary',
      relevanceScore: 0.7,
      reason: 'segment:mobile_first + acessorio mobile',
    },
    {
      text: 'iPhone vale a pena no Brasil?',
      query: 'iphone vale a pena comprar no brasil',
      icon: '\u{1F34E}',
      type: 'deepdive',
      relevanceScore: 0.7,
      reason: 'segment:mobile_first + duvida frequente',
    },
  ],
}

// ============================================
// SEASONAL MAPS
// ============================================

interface SeasonalEntry {
  months: number[]
  text: string
  query: string
  icon: string
}

const SEASONAL_EVENTS: SeasonalEntry[] = [
  { months: [1], text: 'Promocoes de volta as aulas', query: 'ofertas volta as aulas material escolar', icon: '\u{1F4DA}' },
  { months: [2], text: 'Ofertas de Carnaval', query: 'ofertas carnaval eletronicos', icon: '\u{1F389}' },
  { months: [3], text: 'Dia do Consumidor \u2014 melhores ofertas', query: 'melhores ofertas dia do consumidor', icon: '\u{1F6CD}\u{FE0F}' },
  { months: [5], text: 'Presente Dia das Maes', query: 'presente dia das maes', icon: '\u{1F490}' },
  { months: [6], text: 'Ofertas de Sao Joao / Festa Junina', query: 'ofertas festa junina eletrodomesticos', icon: '\u{1F389}' },
  { months: [7], text: 'Liquidacao de inverno', query: 'liquidacao inverno moda eletronicos', icon: '\u{2744}\u{FE0F}' },
  { months: [8], text: 'Presente Dia dos Pais', query: 'presente dia dos pais', icon: '\u{1F454}' },
  { months: [9], text: 'Semana do Brasil', query: 'melhores ofertas semana do brasil', icon: '\u{1F1E7}\u{1F1F7}' },
  { months: [10], text: 'Ofertas pre-Black Friday', query: 'ofertas pre black friday outubro', icon: '\u{1F3F7}\u{FE0F}' },
  { months: [11], text: 'Black Friday \u2014 melhores ofertas', query: 'melhores ofertas black friday', icon: '\u{1F5A4}' },
  { months: [12], text: 'Presentes de Natal ate R$ 200', query: 'presentes natal ate 200 reais', icon: '\u{1F384}' },
]

const EVERGREEN_SEASONAL: SmartSuggestion = {
  text: 'Produtos em queda de preco hoje',
  query: 'produtos com queda de preco hoje',
  icon: '\u{1F4C9}',
  type: 'deal',
  relevanceScore: 0.6,
  reason: 'seasonal:evergreen',
}

// ============================================
// COMPLEMENTARY PRODUCT MAP
// ============================================

const COMPLEMENTARY_MAP: Record<string, { text: string; query: string; icon: string }[]> = {
  celulares: [
    { text: 'Fone bluetooth compativel', query: 'melhor fone bluetooth custo-beneficio', icon: '\u{1F3A7}' },
    { text: 'Capinha para proteger', query: 'capinha celular boa e barata', icon: '\u{1F6E1}\u{FE0F}' },
    { text: 'Pelicula de vidro', query: 'pelicula vidro temperado celular', icon: '\u{1F4F1}' },
    { text: 'Carregador turbo', query: 'carregador turbo celular', icon: '\u{26A1}' },
  ],
  notebooks: [
    { text: 'Mouse sem fio para notebook', query: 'melhor mouse sem fio para notebook', icon: '\u{1F5B1}\u{FE0F}' },
    { text: 'Suporte para notebook', query: 'suporte notebook ergonomico', icon: '\u{1F4BB}' },
    { text: 'Monitor externo', query: 'melhor monitor externo para notebook', icon: '\u{1F5A5}\u{FE0F}' },
    { text: 'Mochila para notebook', query: 'mochila para notebook ate 15 polegadas', icon: '\u{1F392}' },
  ],
  'smart-tvs': [
    { text: 'Soundbar para sua TV', query: 'melhor soundbar custo-beneficio', icon: '\u{1F50A}' },
    { text: 'Chromecast ou Fire Stick', query: 'chromecast vs fire stick qual melhor', icon: '\u{1F4FA}' },
    { text: 'Suporte de parede para TV', query: 'suporte parede tv articulado', icon: '\u{1F6E0}\u{FE0F}' },
  ],
  audio: [
    { text: 'Case protetor para fone', query: 'case protetor fone bluetooth', icon: '\u{1F510}' },
    { text: 'Espuma de reposicao', query: 'espuma reposicao fone over-ear', icon: '\u{1F3B5}' },
  ],
  gamer: [
    { text: 'Mousepad gamer grande', query: 'melhor mousepad gamer grande', icon: '\u{1F5B1}\u{FE0F}' },
    { text: 'Headset gamer', query: 'melhor headset gamer custo-beneficio', icon: '\u{1F3A7}' },
    { text: 'Webcam para stream', query: 'melhor webcam para stream', icon: '\u{1F4F7}' },
  ],
  informatica: [
    { text: 'Organizador de cabos', query: 'organizador cabos escritorio', icon: '\u{1F50C}' },
    { text: 'No-break para PC', query: 'melhor nobreak para computador', icon: '\u{1F50B}' },
  ],
  casa: [
    { text: 'Extensao de tomada inteligente', query: 'tomada inteligente wifi', icon: '\u{1F50C}' },
    { text: 'Organizador de cozinha', query: 'organizadores cozinha custo-beneficio', icon: '\u{1F3E0}' },
  ],
}

// ============================================
// TRENDING (hardcoded, seasonally-rotated)
// ============================================

const TRENDING_QUERIES: SmartSuggestion[] = [
  {
    text: 'Celulares mais vendidos do momento',
    query: 'celulares mais vendidos',
    icon: '\u{1F4F1}',
    type: 'trending',
    relevanceScore: 0.85,
    reason: 'trending:#1 categoria Brasil',
  },
  {
    text: 'Air Fryer ate R$ 400',
    query: 'melhor air fryer ate 400 reais',
    icon: '\u{1F373}',
    type: 'trending',
    relevanceScore: 0.8,
    reason: 'trending:air fryer categoria em alta',
  },
  {
    text: 'Smartwatch bom e barato',
    query: 'melhor smartwatch bom e barato',
    icon: '\u{231A}',
    type: 'trending',
    relevanceScore: 0.75,
    reason: 'trending:wearables categoria em crescimento',
  },
  {
    text: 'Notebook para estudar',
    query: 'melhor notebook para estudar custo-beneficio',
    icon: '\u{1F4BB}',
    type: 'trending',
    relevanceScore: 0.75,
    reason: 'trending:notebook sempre procurado',
  },
  {
    text: 'Fone de ouvido bluetooth ate R$ 200',
    query: 'melhor fone bluetooth ate 200 reais',
    icon: '\u{1F3B6}',
    type: 'trending',
    relevanceScore: 0.7,
    reason: 'trending:audio wearable alta demanda',
  },
  {
    text: 'TV 50 polegadas em promocao',
    query: 'tv 50 polegadas em promocao',
    icon: '\u{1F4FA}',
    type: 'trending',
    relevanceScore: 0.7,
    reason: 'trending:tv smart alta busca',
  },
  {
    text: 'Tenis de corrida custo-beneficio',
    query: 'melhor tenis de corrida custo-beneficio',
    icon: '\u{1F45F}',
    type: 'trending',
    relevanceScore: 0.65,
    reason: 'trending:moda esportiva',
  },
  {
    text: 'Aspirador robo que funciona',
    query: 'melhor aspirador robo custo-beneficio',
    icon: '\u{1F916}',
    type: 'trending',
    relevanceScore: 0.65,
    reason: 'trending:casa inteligente em alta',
  },
]

// ============================================
// MAIN FUNCTION
// ============================================

/**
 * Generate context-aware smart suggestions.
 *
 * Returns 4-6 suggestions sorted by relevance, diversified by type and category.
 *
 * Strategy:
 * a) No conversation history -> initial suggestions based on segment + trending
 * b) Has history -> follow-up + deepdive + complementary + seasonal
 * c) Always diversify: max 1 per type in top results, mix categories
 */
export function generateSmartSuggestions(context: SuggestionContext): SmartSuggestion[] {
  const hasHistory = context.conversationHistory.length > 0
  const now = context.currentTime ?? new Date()

  let candidates: SmartSuggestion[]

  if (!hasHistory) {
    candidates = getInitialSuggestions(context.userSegment, context.userInterests)
  } else {
    candidates = [
      ...getFollowUpSuggestions(context.conversationHistory, context.lastProducts),
      ...getComplementarySuggestions(context.lastProducts),
      ...getSeasonalSuggestions(now),
      ...getTrendingSuggestions().slice(0, 2),
    ]
  }

  // Phase-based scoring boost
  candidates = applyPhaseBoost(candidates, context.purchasePhase)

  // Deduplicate by query (case-insensitive)
  candidates = deduplicateByQuery(candidates)

  // Diversify: at most 2 suggestions of the same type in the final results
  candidates = diversifyByType(candidates)

  // Sort by relevance descending
  candidates.sort((a, b) => b.relevanceScore - a.relevanceScore)

  // Return top 6
  return candidates.slice(0, 6)
}

// ============================================
// INITIAL SUGGESTIONS (empty conversation)
// ============================================

/**
 * Suggestions for new conversations.
 * Prioritizes segment-specific if available, fills remaining with trending.
 */
export function getInitialSuggestions(segment?: string, interests?: string[]): SmartSuggestion[] {
  const results: SmartSuggestion[] = []

  // Segment-specific suggestions
  if (segment && SEGMENT_SUGGESTIONS[segment]) {
    results.push(...SEGMENT_SUGGESTIONS[segment])
  }

  // Interest-based additions: add trending from categories they care about
  if (interests && interests.length > 0) {
    for (const interest of interests) {
      const trending = TRENDING_QUERIES.find(t =>
        t.query.toLowerCase().includes(interest.toLowerCase())
      )
      if (trending && !results.some(r => r.query === trending.query)) {
        results.push({ ...trending, relevanceScore: trending.relevanceScore + 0.05, reason: `interest:${interest}` })
      }
    }
  }

  // Fill up with trending if not enough
  if (results.length < 6) {
    const remaining = TRENDING_QUERIES.filter(t => !results.some(r => r.query === t.query))
    results.push(...remaining.slice(0, 6 - results.length))
  }

  // Add a seasonal suggestion as the last item for variety
  const seasonal = getSeasonalSuggestions()
  if (seasonal.length > 0 && !results.some(r => r.query === seasonal[0].query)) {
    results.push(seasonal[0])
  }

  return results.slice(0, 6)
}

// ============================================
// FOLLOW-UP SUGGESTIONS (has conversation)
// ============================================

/**
 * Contextual suggestions based on recent conversation and products shown.
 */
export function getFollowUpSuggestions(
  history: { role: string; content: string }[],
  lastProducts?: { name: string; price: number; category?: string }[]
): SmartSuggestion[] {
  const suggestions: SmartSuggestion[] = []

  if (!lastProducts || lastProducts.length === 0) {
    // No products context: generate from last user query
    const lastUserMsg = [...history].reverse().find(m => m.role === 'user')
    if (lastUserMsg) {
      suggestions.push({
        text: 'Mais opcoes como essa',
        query: `mais opcoes: ${lastUserMsg.content}`,
        icon: '\u{1F50D}',
        type: 'follow_up',
        relevanceScore: 0.8,
        reason: 'follow_up:repeat_broader',
      })
      suggestions.push({
        text: 'Opcao mais barata',
        query: `alternativa mais barata: ${lastUserMsg.content}`,
        icon: '\u{1F4B0}',
        type: 'follow_up',
        relevanceScore: 0.75,
        reason: 'follow_up:cheaper_alternative',
      })
    }
    return suggestions
  }

  const first = lastProducts[0]
  const firstName = shortenName(first.name)

  // "More affordable than X?"
  suggestions.push({
    text: `Mais barato que ${firstName}?`,
    query: `alternativa mais barata que ${firstName}`,
    icon: '\u{1F4B0}',
    type: 'follow_up',
    relevanceScore: 0.9,
    reason: 'follow_up:cheaper_than_shown',
  })

  // Comparison if 2+ products
  if (lastProducts.length >= 2) {
    const secondName = shortenName(lastProducts[1].name)
    suggestions.push({
      text: `Comparar ${firstName} vs ${secondName}`,
      query: `comparar ${firstName} e ${secondName}`,
      icon: '\u{2696}\u{FE0F}',
      type: 'comparison',
      relevanceScore: 0.85,
      reason: 'follow_up:compare_top2',
    })
  }

  // Deepdive into feature (category-specific)
  const category = first.category || detectCategoryFromName(first.name)
  if (category) {
    const featureSuggestion = getCategoryFeatureSuggestion(category)
    if (featureSuggestion) {
      suggestions.push({
        ...featureSuggestion,
        relevanceScore: 0.8,
        reason: `follow_up:deepdive:${category}`,
      })
    }
  }

  // Price alert
  suggestions.push({
    text: `Criar alerta para ${firstName}`,
    query: `criar alerta de preco para ${firstName}`,
    icon: '\u{1F514}',
    type: 'follow_up',
    relevanceScore: 0.75,
    reason: 'follow_up:alert_suggestion',
  })

  // Always-useful: generic cheaper alternative
  suggestions.push({
    text: 'Alternativa mais barata',
    query: `alternativa mais barata para ${category || firstName}`,
    icon: '\u{1F4B8}',
    type: 'follow_up',
    relevanceScore: 0.7,
    reason: 'follow_up:generic_cheaper',
  })

  return suggestions
}

// ============================================
// SEASONAL SUGGESTIONS
// ============================================

/**
 * Seasonal suggestions based on Brazilian commerce calendar.
 * Always includes at least one suggestion (evergreen fallback).
 */
export function getSeasonalSuggestions(date?: Date): SmartSuggestion[] {
  const now = date ?? new Date()
  const month = now.getMonth() + 1 // 1-indexed

  const suggestions: SmartSuggestion[] = []

  for (const event of SEASONAL_EVENTS) {
    if (event.months.includes(month)) {
      suggestions.push({
        text: event.text,
        query: event.query,
        icon: event.icon,
        type: 'seasonal',
        relevanceScore: 0.75,
        reason: `seasonal:month_${month}`,
      })
    }
  }

  // Always include evergreen
  suggestions.push({ ...EVERGREEN_SEASONAL })

  return suggestions
}

// ============================================
// COMPLEMENTARY SUGGESTIONS
// ============================================

/**
 * Based on what the user is looking at, suggest complementary products.
 */
export function getComplementarySuggestions(
  lastProducts?: { name: string; price: number; category?: string }[]
): SmartSuggestion[] {
  if (!lastProducts || lastProducts.length === 0) return []

  const suggestions: SmartSuggestion[] = []
  const seenQueries = new Set<string>()

  for (const product of lastProducts) {
    const category = product.category || detectCategoryFromName(product.name)
    if (!category) continue

    const complements = COMPLEMENTARY_MAP[category]
    if (!complements) continue

    for (const comp of complements) {
      if (seenQueries.has(comp.query)) continue
      seenQueries.add(comp.query)

      suggestions.push({
        text: comp.text,
        query: comp.query,
        icon: comp.icon,
        type: 'complementary',
        relevanceScore: 0.65,
        reason: `complementary:${category}`,
      })
    }
  }

  // Return at most 3 complementary suggestions
  return suggestions.slice(0, 3)
}

// ============================================
// TRENDING SUGGESTIONS
// ============================================

/**
 * Hardcoded but diverse trending queries for Brazil e-commerce.
 * Rotated: pick different items each day to keep suggestions fresh.
 */
export function getTrendingSuggestions(): SmartSuggestion[] {
  const dayOfYear = getDayOfYear(new Date())
  const offset = dayOfYear % TRENDING_QUERIES.length

  // Rotate the array so different suggestions appear first each day
  const rotated = [
    ...TRENDING_QUERIES.slice(offset),
    ...TRENDING_QUERIES.slice(0, offset),
  ]

  return rotated
}

// ============================================
// PHASE BOOST
// ============================================

/**
 * Boost relevance scores based on the user's purchase phase.
 *
 * - browsing: boost discovery + trending
 * - researching: boost deepdive + comparison
 * - comparing: boost comparison + follow_up
 * - deciding: boost deal + follow_up
 * - ready_to_buy: boost deal + complementary
 */
function applyPhaseBoost(
  suggestions: SmartSuggestion[],
  phase?: SuggestionContext['purchasePhase']
): SmartSuggestion[] {
  if (!phase) return suggestions

  const boostMap: Record<string, SuggestionType[]> = {
    browsing: ['discovery', 'trending'],
    researching: ['deepdive', 'comparison'],
    comparing: ['comparison', 'follow_up'],
    deciding: ['deal', 'follow_up'],
    ready_to_buy: ['deal', 'complementary'],
  }

  const boostedTypes = boostMap[phase] || []

  return suggestions.map(s => {
    if (boostedTypes.includes(s.type)) {
      return { ...s, relevanceScore: Math.min(1, s.relevanceScore + 0.1) }
    }
    return s
  })
}

// ============================================
// DEDUP & DIVERSIFICATION
// ============================================

function deduplicateByQuery(suggestions: SmartSuggestion[]): SmartSuggestion[] {
  const seen = new Set<string>()
  return suggestions.filter(s => {
    const key = s.query.toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Keep at most 2 suggestions of the same type to ensure variety.
 * Sorts by relevance first, then filters.
 */
function diversifyByType(suggestions: SmartSuggestion[]): SmartSuggestion[] {
  const sorted = [...suggestions].sort((a, b) => b.relevanceScore - a.relevanceScore)
  const typeCounts = new Map<SuggestionType, number>()
  const result: SmartSuggestion[] = []

  for (const s of sorted) {
    const count = typeCounts.get(s.type) || 0
    if (count < 2) {
      result.push(s)
      typeCounts.set(s.type, count + 1)
    }
  }

  return result
}

// ============================================
// HELPERS
// ============================================

function shortenName(name: string): string {
  const words = name.split(/\s+/).filter(w => w.length > 1)
  if (words.length <= 4) return name
  return words.slice(0, 4).join(' ')
}

/** Detect category slug from product name using common keywords */
function detectCategoryFromName(name: string): string | null {
  const lower = name.toLowerCase()
  const patterns: [RegExp, string][] = [
    [/celular|smartphone|iphone|galaxy|xiaomi|motorola/i, 'celulares'],
    [/notebook|laptop|macbook/i, 'notebooks'],
    [/fone|headphone|earphone|airpods|headset/i, 'audio'],
    [/tv|televisao|smart.?tv/i, 'smart-tvs'],
    [/console|playstation|ps5|xbox|nintendo|placa.?de.?video|gpu/i, 'gamer'],
    [/smartwatch|relogio/i, 'wearables'],
    [/monitor|mouse|teclado|ssd|processador/i, 'informatica'],
    [/airfryer|fritadeira|cafeteira|aspirador|geladeira|lavadora|micro.?ondas/i, 'casa'],
  ]

  for (const [pattern, slug] of patterns) {
    if (pattern.test(lower)) return slug
  }
  return null
}

/** Get a category-specific feature deepdive suggestion */
function getCategoryFeatureSuggestion(category: string): Omit<SmartSuggestion, 'relevanceScore' | 'reason'> | null {
  const map: Record<string, Omit<SmartSuggestion, 'relevanceScore' | 'reason'>> = {
    celulares: {
      text: 'Qual tem a melhor camera?',
      query: 'celular com melhor camera custo-beneficio',
      icon: '\u{1F4F7}',
      type: 'deepdive',
    },
    notebooks: {
      text: 'Qual tem melhor bateria?',
      query: 'notebook com melhor duracao de bateria',
      icon: '\u{1F50B}',
      type: 'deepdive',
    },
    'smart-tvs': {
      text: 'Qual tem melhor imagem?',
      query: 'tv com melhor qualidade de imagem 4k',
      icon: '\u{2728}',
      type: 'deepdive',
    },
    audio: {
      text: 'Qual tem melhor cancelamento de ruido?',
      query: 'fone com melhor cancelamento de ruido',
      icon: '\u{1F50C}',
      type: 'deepdive',
    },
    gamer: {
      text: 'Qual roda jogos em 4K?',
      query: 'placa de video que roda jogos em 4k',
      icon: '\u{1F3AE}',
      type: 'deepdive',
    },
    casa: {
      text: 'Qual consome menos energia?',
      query: 'eletrodomestico mais economico consumo energia',
      icon: '\u{26A1}',
      type: 'deepdive',
    },
    informatica: {
      text: 'Qual e mais rapido?',
      query: 'componente mais rapido custo-beneficio benchmark',
      icon: '\u{1F680}',
      type: 'deepdive',
    },
    wearables: {
      text: 'Qual mede saude melhor?',
      query: 'smartwatch melhor monitoramento de saude',
      icon: '\u{2764}\u{FE0F}',
      type: 'deepdive',
    },
  }

  return map[category] ?? null
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const oneDay = 1000 * 60 * 60 * 24
  return Math.floor(diff / oneDay)
}
