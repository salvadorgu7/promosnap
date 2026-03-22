/**
 * Conversation Intelligence — extracts insights from assistant interactions.
 *
 * Every conversation is a signal. This module mines conversations for:
 * - Product demand signals (what people want but we don't have)
 * - Price sensitivity (budget distributions)
 * - Category trends (rising/falling interest)
 * - Common objections ("muito caro", "nao confio", "prefiro esperar")
 * - Satisfaction signals (follow-ups, abandonment)
 * - Feature requests (what specs/features people ask about most)
 */

import type { ClassifiedIntent, IntentType } from './intent-classifier'
import type { AssistantMessage } from './shopping-assistant'

// ============================================
// TYPES
// ============================================

export interface ExtractedEntity {
  type: 'product' | 'brand' | 'category' | 'feature' | 'store' | 'budget'
  value: string
  confidence: number
}

export interface ConversationInsight {
  sessionId: string
  timestamp: Date
  userQuery: string
  intentType: IntentType
  purchasePhase: 'browsing' | 'researching' | 'comparing' | 'deciding' | 'ready_to_buy'
  sentiment: 'positive' | 'neutral' | 'negative' | 'frustrated'
  extractedEntities: ExtractedEntity[]
  catalogGap: boolean
  objections: string[]
  pricePoint: { mentioned: number; category?: string } | null
  satisfactionSignal: 'engaged' | 'lost_interest' | 'converted' | 'unknown'
}

export interface ConversationSummary {
  totalConversations: number
  avgMessagesPerConversation: number
  topCategories: { category: string; count: number; avgBudget: number }[]
  topBrands: { brand: string; count: number }[]
  priceDistribution: { range: string; count: number }[]
  commonObjections: { objection: string; count: number }[]
  catalogGaps: { query: string; count: number; category?: string }[]
  sentimentBreakdown: { positive: number; neutral: number; negative: number; frustrated: number }
  conversionFunnel: {
    browsing: number
    researching: number
    comparing: number
    deciding: number
    ready_to_buy: number
  }
  topFeatureRequests: { feature: string; category: string; count: number }[]
}

// ============================================
// CONSTANTS
// ============================================

const KNOWN_BRANDS = [
  'apple', 'samsung', 'xiaomi', 'motorola', 'lg', 'sony', 'dell', 'lenovo', 'hp', 'asus',
  'acer', 'jbl', 'bose', 'nike', 'adidas', 'philips', 'electrolux', 'brastemp', 'consul',
  'multilaser', 'positivo', 'realme', 'oppo', 'oneplus', 'google pixel', 'huawei',
  'logitech', 'razer', 'hyperx', 'corsair', 'redragon', 'nintendo', 'playstation', 'xbox',
  'edifier', 'anker', 'baseus', 'mondial', 'arno', 'tramontina', 'intelbras',
]

const CATEGORY_MAP: [RegExp, string][] = [
  [/celular|smartphone|iphone|galaxy|xiaomi|motorola|telefone/i, 'celulares'],
  [/notebook|laptop|macbook|chromebook/i, 'notebooks'],
  [/fone|headphone|earphone|airpods|headset|caixa.?de.?som|speaker/i, 'audio'],
  [/tv|televis[aã]o|televisor|smart.?tv/i, 'smart-tvs'],
  [/console|playstation|ps5|xbox|nintendo|switch|videogame/i, 'gamer'],
  [/smartwatch|rel[oó]gio.?inteligente|apple.?watch|galaxy.?watch/i, 'wearables'],
  [/tablet|ipad/i, 'tablets'],
  [/monitor|tela.?gamer/i, 'informatica'],
  [/mouse|teclado|placa.?de.?v[ií]deo|gpu|ssd|processador|mem[oó]ria.?ram|desktop|pc.?gamer/i, 'informatica'],
  [/airfryer|fritadeira|cafeteira|aspirador|geladeira|lavadora|micro.?ondas|ar.?condicionado/i, 'casa'],
  [/perfume|maquiagem|skincare|creme|shampoo|chapinha|secador/i, 'beleza'],
  [/t[eê]nis|sneaker|nike|adidas/i, 'tenis'],
  [/mochila|bolsa|mala/i, 'moda'],
  [/brinquedo|lego|boneca/i, 'infantil'],
  [/c[aâ]mera|gopro|webcam/i, 'informatica'],
  [/impressora/i, 'informatica'],
]

const STORE_PATTERNS: [RegExp, string][] = [
  [/amazon/i, 'Amazon'],
  [/mercado\s*livre|mercadolivre|\bml\b/i, 'Mercado Livre'],
  [/shopee/i, 'Shopee'],
  [/shein/i, 'Shein'],
  [/magazin[ea]\s*luiza|magalu/i, 'Magazine Luiza'],
  [/casas\s*bahia/i, 'Casas Bahia'],
  [/americanas/i, 'Americanas'],
  [/kabum/i, 'KaBuM'],
  [/pichau/i, 'Pichau'],
  [/aliexpress/i, 'AliExpress'],
]

const FEATURE_PATTERNS: [RegExp, string, string][] = [
  // [pattern, feature label, related category]
  [/(\d+)\s*gb\s*(?:de\s*)?ram/i, 'RAM', 'celulares'],
  [/(\d+)\s*gb\s*(?:de\s*)?(?:armazenamento|storage|mem[oó]ria\s*interna)/i, 'armazenamento', 'celulares'],
  [/(\d+)\s*(?:mah|milliamp)/i, 'bateria', 'celulares'],
  [/(\d+)\s*(?:pol(?:egadas)?|")\s*(?:tela)?/i, 'tela', 'smart-tvs'],
  [/(\d+)\s*mp\s*(?:c[aâ]mera)?/i, 'camera', 'celulares'],
  [/(\d+)\s*hz\s*(?:refresh|taxa)/i, 'taxa de atualiza\u00e7\u00e3o', 'gamer'],
  [/anc|cancelamento\s*(?:de\s*)?ru[ií]do/i, 'cancelamento de ruido', 'audio'],
  [/5g/i, '5G', 'celulares'],
  [/amoled|oled|ips|lcd/i, 'tipo de tela', 'celulares'],
  [/nfc/i, 'NFC', 'celulares'],
  [/prova\s*d['\s]?[aá]gua|ip\d{2}/i, 'resistencia a agua', 'celulares'],
  [/dolby|atmos|surround/i, 'audio surround', 'audio'],
  [/bluetooth\s*(\d[\d.]*)?/i, 'bluetooth', 'audio'],
  [/wifi\s*6[e]?|wi-fi\s*6[e]?/i, 'WiFi 6', 'informatica'],
  [/ssd\s*(\d+)\s*(?:gb|tb)/i, 'SSD', 'notebooks'],
  [/rtx\s*\d{4}|gtx\s*\d{4}/i, 'GPU dedicada', 'notebooks'],
]

const PRODUCT_PATTERNS = [
  // Specific product model numbers and names
  /iphone\s*\d{1,2}\s*(?:pro\s*)?(?:max)?/i,
  /galaxy\s*s\d{2}\s*(?:ultra|plus|\+|fe)?/i,
  /galaxy\s*a\d{2}[s]?/i,
  /macbook\s*(?:air|pro)\s*(?:m\d)?/i,
  /airpods?\s*(?:pro|max)?\s*\d?/i,
  /pixel\s*\d[a]?/i,
  /redmi\s*note?\s*\d{1,2}\s*(?:pro|s)?/i,
  /ps5|playstation\s*5/i,
  /xbox\s*series\s*[xs]/i,
  /switch\s*(?:oled|lite)?/i,
]

/** Padroes de precos em BRL */
const PRICE_PATTERNS = [
  /R\$\s*(\d[\d.,]*)/i,
  /(\d[\d.,]*)\s*(?:reais|conto)/i,
  /at[eé]\s*(\d[\d.,]*)/i,
]

/** Mapa de objections: keyword -> tipo normalizado */
const OBJECTION_MAP: [RegExp, string][] = [
  [/(?:muito\s*)?caro|pre[cç]o\s*alto|puxado|salgado|absurdo/i, 'preco_alto'],
  [/n[aã]o\s*confi[oa]|golpe|fake|picaretagem|fraude/i, 'desconfianca'],
  [/esperar|black\s*friday|promo[cç][aã]o|aguardar|baixar/i, 'quer_esperar'],
  [/frete|entrega|demora|prazo/i, 'custo_frete'],
  [/usado|seminovo|semi.?novo|segunda\s*m[aã]o/i, 'quer_usado'],
  [/importado|taxa|imposto|alfandega|alf[aâ]ndega/i, 'medo_importacao'],
  [/garantia|assist[eê]ncia|suporte|autorizada/i, 'quer_garantia'],
  [/review|opini[aã]o|avalia[cç][aã]o|resenha|nota/i, 'quer_avaliacoes'],
]

/** Keywords positivos */
const POSITIVE_KEYWORDS = [
  /[oó]timo/i, /perfeito/i, /adorei/i, /show/i, /obrigad[oa]/i,
  /excelente/i, /maravilh/i, /incr[ií]vel/i, /top/i, /massa/i,
  /sensacional/i, /amei/i, /valeu/i, /genial/i, /demais/i,
]

/** Keywords negativos */
const NEGATIVE_KEYWORDS = [
  /n[aã]o gostei/i, /ruim/i, /horr[ií]vel/i, /p[eé]ssimo/i,
  /decepcion/i, /lixo/i, /fra[cg]o/i, /decepciona/i,
]

/** Keywords de frustracao */
const FRUSTRATED_KEYWORDS = [
  /n[aã]o funciona/i, /n[aã]o achei/i, /nada serve/i, /muito caro tudo/i,
  /n[aã]o tem nada/i, /desist/i, /cans[ae]i/i, /imposs[ií]vel/i,
  /n[aã]o ajud/i, /n[aã]o resolveu/i, /in[uú]til/i,
]

/** Ranges de preco para distribuicao */
const PRICE_RANGES: { label: string; min: number; max: number }[] = [
  { label: 'ate R$ 200', min: 0, max: 200 },
  { label: 'R$ 200-500', min: 200, max: 500 },
  { label: 'R$ 500-1.000', min: 500, max: 1_000 },
  { label: 'R$ 1.000-2.000', min: 1_000, max: 2_000 },
  { label: 'R$ 2.000-5.000', min: 2_000, max: 5_000 },
  { label: 'R$ 5.000+', min: 5_000, max: Infinity },
]

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Analyze a single conversation and extract actionable insights.
 *
 * @param messages - The conversation messages (user + assistant turns)
 * @param intent  - Pre-classified intent from intent-classifier
 * @param productsFoundCount - Number of products returned by the assistant
 * @returns A structured insight object for aggregation
 */
export function analyzeConversation(
  messages: AssistantMessage[],
  intent: ClassifiedIntent,
  productsFoundCount: number
): ConversationInsight {
  const userMessages = messages.filter(m => m.role === 'user')
  const firstUserQuery = userMessages[0]?.content ?? ''
  const allUserText = userMessages.map(m => m.content).join(' ')

  const entities = extractEntities(allUserText)
  const sentiment = detectSentiment(messages)
  const objections = detectObjections(allUserText)
  const catalogGap = detectCatalogGap(firstUserQuery, productsFoundCount, intent.type)
  const pricePoint = extractPricePoint(allUserText, entities)
  const satisfactionSignal = inferSatisfaction(messages, productsFoundCount)
  const purchasePhase = inferPurchasePhase(intent)

  return {
    sessionId: '',
    timestamp: new Date(),
    userQuery: firstUserQuery,
    intentType: intent.type,
    purchasePhase,
    sentiment,
    extractedEntities: entities,
    catalogGap,
    objections,
    pricePoint,
    satisfactionSignal,
  }
}

/**
 * Extract named entities from a user query.
 * Detects products, brands, categories, features, stores, and budgets.
 */
export function extractEntities(query: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = []
  const q = query.toLowerCase()

  // Products (specific models)
  for (const pattern of PRODUCT_PATTERNS) {
    const match = q.match(pattern)
    if (match) {
      entities.push({
        type: 'product',
        value: match[0].trim(),
        confidence: 0.9,
      })
    }
  }

  // Brands
  for (const brand of KNOWN_BRANDS) {
    if (q.includes(brand)) {
      // Avoid false positives: "lg" must be word-bounded
      if (brand.length <= 2) {
        const wordBoundary = new RegExp(`\\b${brand}\\b`, 'i')
        if (!wordBoundary.test(q)) continue
      }
      entities.push({
        type: 'brand',
        value: brand,
        confidence: 0.85,
      })
    }
  }

  // Categories
  const seenCategories = new Set<string>()
  for (const [pattern, slug] of CATEGORY_MAP) {
    if (pattern.test(q) && !seenCategories.has(slug)) {
      seenCategories.add(slug)
      entities.push({
        type: 'category',
        value: slug,
        confidence: 0.8,
      })
    }
  }

  // Features
  const seenFeatures = new Set<string>()
  for (const [pattern, featureLabel, category] of FEATURE_PATTERNS) {
    if (pattern.test(q) && !seenFeatures.has(featureLabel)) {
      seenFeatures.add(featureLabel)
      entities.push({
        type: 'feature',
        value: `${featureLabel} (${category})`,
        confidence: 0.75,
      })
    }
  }

  // Stores
  for (const [pattern, storeName] of STORE_PATTERNS) {
    if (pattern.test(q)) {
      entities.push({
        type: 'store',
        value: storeName,
        confidence: 0.9,
      })
    }
  }

  // Budget
  for (const pattern of PRICE_PATTERNS) {
    const match = q.match(pattern)
    if (match) {
      const value = parsePrice(match[1])
      if (value > 0) {
        entities.push({
          type: 'budget',
          value: `R$ ${value}`,
          confidence: 0.85,
        })
      }
      break // Only capture first price mention for budget
    }
  }

  return entities
}

/**
 * Detect overall sentiment from conversation messages.
 * Analyzes all user messages (not assistant) for emotional signals.
 */
export function detectSentiment(
  messages: AssistantMessage[]
): 'positive' | 'neutral' | 'negative' | 'frustrated' {
  const userText = messages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join(' ')

  let positiveScore = 0
  let negativeScore = 0
  let frustratedScore = 0

  for (const pattern of POSITIVE_KEYWORDS) {
    if (pattern.test(userText)) positiveScore++
  }

  for (const pattern of NEGATIVE_KEYWORDS) {
    if (pattern.test(userText)) negativeScore += 2 // Negative signals weigh more
  }

  for (const pattern of FRUSTRATED_KEYWORDS) {
    if (pattern.test(userText)) frustratedScore += 3 // Frustrated signals weigh most
  }

  if (frustratedScore >= 3) return 'frustrated'
  if (negativeScore > positiveScore && negativeScore >= 2) return 'negative'
  if (positiveScore > negativeScore && positiveScore >= 1) return 'positive'
  return 'neutral'
}

/**
 * Detect objections from user text.
 * Returns an array of normalized objection labels.
 */
export function detectObjections(query: string): string[] {
  const objections: string[] = []

  for (const [pattern, label] of OBJECTION_MAP) {
    if (pattern.test(query) && !objections.includes(label)) {
      objections.push(label)
    }
  }

  return objections
}

/**
 * Determine whether a conversation reveals a catalog gap.
 * True when a user searched for something specific and got zero results.
 */
export function detectCatalogGap(
  query: string,
  productsFoundCount: number,
  intentType: IntentType
): boolean {
  if (intentType === 'general_question') return false
  if (productsFoundCount > 0) return false
  // Only flag as gap if query is specific enough (>3 words or has brand/model)
  const words = query.trim().split(/\s+/)
  if (words.length <= 2) {
    // Short queries are only gaps if they reference a specific product/brand
    const q = query.toLowerCase()
    const hasBrand = KNOWN_BRANDS.some(b => q.includes(b))
    const hasModel = PRODUCT_PATTERNS.some(p => p.test(q))
    return hasBrand || hasModel
  }
  return true
}

/**
 * Build a dashboard-friendly summary from a batch of conversation insights.
 */
export function buildConversationSummary(
  insights: ConversationInsight[],
  avgMessagesPerConversation = 0
): ConversationSummary {
  const totalConversations = insights.length

  // -- Top categories --
  const categoryBudgets = new Map<string, { count: number; totalBudget: number; budgetEntries: number }>()
  for (const insight of insights) {
    const categories = insight.extractedEntities
      .filter(e => e.type === 'category')
      .map(e => e.value)

    for (const cat of categories) {
      const existing = categoryBudgets.get(cat) || { count: 0, totalBudget: 0, budgetEntries: 0 }
      existing.count++
      if (insight.pricePoint) {
        existing.totalBudget += insight.pricePoint.mentioned
        existing.budgetEntries++
      }
      categoryBudgets.set(cat, existing)
    }
  }

  const topCategories = [...categoryBudgets.entries()]
    .map(([category, data]) => ({
      category,
      count: data.count,
      avgBudget: data.budgetEntries > 0
        ? Math.round(data.totalBudget / data.budgetEntries)
        : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)

  // -- Top brands --
  const brandCounts = countBy(
    insights.flatMap(i => i.extractedEntities.filter(e => e.type === 'brand').map(e => e.value))
  )
  const topBrands = mapToSorted(brandCounts, 'brand', 20)

  // -- Price distribution --
  const priceDistribution = buildPriceDistribution(insights)

  // -- Common objections --
  const objectionCounts = countBy(insights.flatMap(i => i.objections))
  const commonObjections = mapToSorted(objectionCounts, 'objection', 20)

  // -- Catalog gaps --
  const gapCounts = new Map<string, { count: number; category?: string }>()
  for (const insight of insights) {
    if (!insight.catalogGap) continue
    const key = insight.userQuery.toLowerCase().trim()
    const existing = gapCounts.get(key) || { count: 0 }
    existing.count++
    // Attach category if available
    const catEntity = insight.extractedEntities.find(e => e.type === 'category')
    if (catEntity) existing.category = catEntity.value
    gapCounts.set(key, existing)
  }
  const catalogGaps = [...gapCounts.entries()]
    .map(([query, data]) => ({ query, count: data.count, category: data.category }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30)

  // -- Sentiment breakdown --
  const sentimentBreakdown = { positive: 0, neutral: 0, negative: 0, frustrated: 0 }
  for (const insight of insights) {
    sentimentBreakdown[insight.sentiment]++
  }

  // -- Conversion funnel --
  const conversionFunnel = { browsing: 0, researching: 0, comparing: 0, deciding: 0, ready_to_buy: 0 }
  for (const insight of insights) {
    conversionFunnel[insight.purchasePhase]++
  }

  // -- Top feature requests --
  const featureCounts = new Map<string, { feature: string; category: string; count: number }>()
  for (const insight of insights) {
    for (const entity of insight.extractedEntities) {
      if (entity.type !== 'feature') continue
      // value format: "feature (category)"
      const match = entity.value.match(/^(.+?)\s*\((.+)\)$/)
      if (!match) continue
      const [, feature, category] = match
      const key = `${feature}|${category}`
      const existing = featureCounts.get(key) || { feature, category, count: 0 }
      existing.count++
      featureCounts.set(key, existing)
    }
  }
  const topFeatureRequests = [...featureCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)

  return {
    totalConversations,
    avgMessagesPerConversation,
    topCategories,
    topBrands,
    priceDistribution,
    commonObjections,
    catalogGaps,
    sentimentBreakdown,
    conversionFunnel,
    topFeatureRequests,
  }
}

/**
 * Get price sensitivity distribution across conversations.
 * Returns count and percentage for each price range.
 */
export function getPriceSensitivityDistribution(
  insights: ConversationInsight[]
): { range: string; count: number; pct: number }[] {
  const withPrice = insights.filter(i => i.pricePoint !== null)
  const total = withPrice.length || 1 // Avoid division by zero

  return PRICE_RANGES.map(({ label, min, max }) => {
    const count = withPrice.filter(i => {
      const price = i.pricePoint!.mentioned
      return price >= min && price < max
    }).length
    return {
      range: label,
      count,
      pct: Math.round((count / total) * 100),
    }
  })
}

/**
 * Get the most requested products/categories that we don't have in catalog.
 * Critical signal for catalog expansion decisions.
 */
export function getTopCatalogGaps(
  insights: ConversationInsight[],
  limit = 20
): { query: string; count: number; suggestedCategory?: string }[] {
  const gaps = new Map<string, { count: number; suggestedCategory?: string }>()

  for (const insight of insights) {
    if (!insight.catalogGap) continue

    const normalizedQuery = insight.userQuery.toLowerCase().trim()
    const existing = gaps.get(normalizedQuery) || { count: 0 }
    existing.count++

    // Try to infer a suggested category from entities
    if (!existing.suggestedCategory) {
      const catEntity = insight.extractedEntities.find(e => e.type === 'category')
      if (catEntity) {
        existing.suggestedCategory = catEntity.value
      }
    }

    gaps.set(normalizedQuery, existing)
  }

  return [...gaps.entries()]
    .map(([query, data]) => ({
      query,
      count: data.count,
      suggestedCategory: data.suggestedCategory,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

// ============================================
// INTERNAL HELPERS
// ============================================

/**
 * Infer the purchase phase from the classified intent.
 */
function inferPurchasePhase(
  intent: ClassifiedIntent
): ConversationInsight['purchasePhase'] {
  switch (intent.type) {
    case 'discovery':
    case 'has_promo':
      return 'browsing'
    case 'general_question':
    case 'best_for_use':
      return 'researching'
    case 'compare_models':
    case 'alternative_to':
    case 'similar_to':
      return 'comparing'
    case 'worth_it':
    case 'best_cost_benefit':
    case 'best_under_budget':
      return 'deciding'
    case 'cheapest':
    case 'specific_product':
      return 'ready_to_buy'
    default:
      return 'browsing'
  }
}

/**
 * Infer user satisfaction from conversation patterns.
 *
 * - "engaged": user sent follow-up messages after getting results
 * - "converted": user got results and conversation ended positively
 * - "lost_interest": single message, no follow-up, negative sentiment
 * - "unknown": not enough signals
 */
function inferSatisfaction(
  messages: AssistantMessage[],
  productsFoundCount: number
): ConversationInsight['satisfactionSignal'] {
  const userMessages = messages.filter(m => m.role === 'user')
  const totalMessages = messages.length

  // Multiple user messages = engaged
  if (userMessages.length >= 3) return 'engaged'

  // Two user messages + products found = likely converting
  if (userMessages.length >= 2 && productsFoundCount > 0) return 'engaged'

  // Single message + products found + positive keywords = converted
  if (userMessages.length === 1 && productsFoundCount > 0) {
    // Check if assistant provided useful results (has >1 turn = assistant responded)
    if (totalMessages >= 2) return 'converted'
  }

  // Single message + no products = potentially lost
  if (userMessages.length === 1 && productsFoundCount === 0) return 'lost_interest'

  return 'unknown'
}

/**
 * Extract the primary price point mentioned by the user.
 */
function extractPricePoint(
  text: string,
  entities: ExtractedEntity[]
): ConversationInsight['pricePoint'] {
  for (const pattern of PRICE_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      const value = parsePrice(match[1])
      if (value > 0) {
        const catEntity = entities.find(e => e.type === 'category')
        return {
          mentioned: value,
          category: catEntity?.value,
        }
      }
    }
  }
  return null
}

/**
 * Build price distribution histogram from insights.
 */
function buildPriceDistribution(
  insights: ConversationInsight[]
): { range: string; count: number }[] {
  const withPrice = insights.filter(i => i.pricePoint !== null)

  return PRICE_RANGES.map(({ label, min, max }) => ({
    range: label,
    count: withPrice.filter(i => {
      const price = i.pricePoint!.mentioned
      return price >= min && price < max
    }).length,
  }))
}

/** Count occurrences of each value in an array */
function countBy(values: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const v of values) {
    counts.set(v, (counts.get(v) || 0) + 1)
  }
  return counts
}

/** Convert a count map to a sorted array with a named key */
function mapToSorted<K extends string>(
  counts: Map<string, number>,
  keyName: K,
  limit: number
): ({ [P in K]: string } & { count: number })[] {
  return [...counts.entries()]
    .map(([value, count]) => ({ [keyName]: value, count } as { [P in K]: string } & { count: number }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/** Parse a Brazilian price string into a number */
function parsePrice(s: string): number {
  return Number(s.replace(/\./g, '').replace(',', '.')) || 0
}
