/**
 * Intent Classifier — understands what the user really wants.
 *
 * Extracts: intent type, budget range, use case, brand preference,
 * urgency level, and whether intent is exploratory or decisional.
 *
 * Uses heuristics first (fast, free), with optional LLM enhancement.
 */

// ============================================
// TYPES
// ============================================

export type IntentType =
  | 'best_under_budget'    // "melhor celular até R$2000"
  | 'cheapest'             // "mais barato", "menor preço"
  | 'best_cost_benefit'    // "melhor custo-benefício"
  | 'best_for_use'         // "melhor para fotografia"
  | 'compare_models'       // "iPhone 15 vs Galaxy S24"
  | 'alternative_to'       // "alternativa ao MacBook"
  | 'worth_it'             // "vale a pena comprar X?"
  | 'has_promo'            // "tem promoção de notebook?"
  | 'similar_to'           // "algo parecido com X"
  | 'discovery'            // "o que tem de bom em fone?"
  | 'specific_product'     // "iPhone 15 Pro 256GB"
  | 'general_question'     // non-commercial questions

export type IntentUrgency = 'high' | 'medium' | 'low'
export type IntentMode = 'exploratory' | 'comparative' | 'decisional' | 'urgent'

export interface ClassifiedIntent {
  type: IntentType
  mode: IntentMode
  urgency: IntentUrgency
  budget?: { min?: number; max?: number }
  useCase?: string
  brands?: string[]
  categories?: string[]
  productMentions?: string[]
  priceKeywords: boolean
  comparisonKeywords: boolean
  confidence: number // 0-1
}

// ============================================
// KEYWORD MAPS
// ============================================

const BUDGET_PATTERNS = [
  /at[eé]\s*(?:R\$?\s*)?(\d[\d.,]*)/i,
  /menos\s*(?:de|que)\s*(?:R\$?\s*)?(\d[\d.,]*)/i,
  /no\s*m[aá]ximo\s*(?:R\$?\s*)?(\d[\d.,]*)/i,
  /(?:R\$?\s*)(\d[\d.,]*)\s*(?:a|[-–])\s*(?:R\$?\s*)?(\d[\d.,]*)/i,
  /(?:por|de|entre)\s*(?:R\$?\s*)?(\d[\d.,]*)\s*(?:e|a|[-–])\s*(?:R\$?\s*)?(\d[\d.,]*)/i,
]

const CHEAPEST_KEYWORDS = ['mais barato', 'menor preco', 'menor preço', 'mais em conta', 'econom', 'baratinho']
const COST_BENEFIT_KEYWORDS = ['custo.?beneficio', 'custo.?benefício', 'vale o preco', 'bom e barato', 'melhor pelo preco']
const COMPARE_KEYWORDS = [' vs ', ' versus ', 'comparar', 'comparação', 'comparacao', 'diferença entre', 'diferenca entre', ' ou ']
const PROMO_KEYWORDS = ['promo', 'promoção', 'promocao', 'desconto', 'oferta', 'cupom', 'black friday']
const WORTH_IT_KEYWORDS = ['vale a pena', 'vale apena', 'compensa', 'recomenda', 'é bom']
const ALTERNATIVE_KEYWORDS = ['alternativa', 'parecido', 'similar', 'substituto', 'no lugar de', 'em vez de']
const USE_CASE_KEYWORDS = ['para ', 'pra ', 'ideal para', 'bom para', 'melhor para']
const URGENCY_KEYWORDS = ['urgente', 'preciso agora', 'hoje', 'rápido', 'rapido', 'pressa']
const BEST_KEYWORDS = ['melhor', 'top', 'recomend']

const BRAND_PATTERNS = [
  'apple', 'samsung', 'xiaomi', 'motorola', 'lg', 'sony', 'dell', 'lenovo', 'hp', 'asus',
  'acer', 'jbl', 'bose', 'nike', 'adidas', 'philips', 'electrolux', 'brastemp', 'consul',
  'multilaser', 'positivo', 'realme', 'oppo', 'oneplus', 'google pixel', 'huawei',
  'logitech', 'razer', 'hyperx', 'corsair', 'redragon', 'nintendo', 'playstation', 'xbox',
]

// ============================================
// CLASSIFIER
// ============================================

export function classifyIntent(query: string): ClassifiedIntent {
  const q = query.toLowerCase().trim()

  const result: ClassifiedIntent = {
    type: 'discovery',
    mode: 'exploratory',
    urgency: 'medium',
    priceKeywords: false,
    comparisonKeywords: false,
    confidence: 0.5,
  }

  // Extract budget
  for (const pattern of BUDGET_PATTERNS) {
    const match = q.match(pattern)
    if (match) {
      const v1 = parsePrice(match[1])
      const v2 = match[2] ? parsePrice(match[2]) : undefined
      if (v2) {
        result.budget = { min: Math.min(v1, v2), max: Math.max(v1, v2) }
      } else {
        result.budget = { max: v1 }
      }
      result.priceKeywords = true
      break
    }
  }

  // Detect brands
  const brands = BRAND_PATTERNS.filter(b => q.includes(b))
  if (brands.length > 0) result.brands = brands

  // Detect use case
  for (const kw of USE_CASE_KEYWORDS) {
    const idx = q.indexOf(kw)
    if (idx >= 0) {
      const after = q.slice(idx + kw.length).trim()
      const useCase = after.split(/[,.\?!]/)[0]?.trim()
      if (useCase && useCase.length > 2 && useCase.length < 50) {
        result.useCase = useCase
      }
    }
  }

  // Classify intent type
  if (matchesAny(q, COMPARE_KEYWORDS)) {
    result.type = 'compare_models'
    result.mode = 'comparative'
    result.comparisonKeywords = true
    result.confidence = 0.8
  } else if (matchesAny(q, WORTH_IT_KEYWORDS)) {
    result.type = 'worth_it'
    result.mode = 'decisional'
    result.confidence = 0.8
  } else if (matchesAny(q, ALTERNATIVE_KEYWORDS)) {
    result.type = 'alternative_to'
    result.mode = 'comparative'
    result.confidence = 0.7
  } else if (matchesAny(q, CHEAPEST_KEYWORDS)) {
    result.type = 'cheapest'
    result.mode = 'decisional'
    result.priceKeywords = true
    result.confidence = 0.85
  } else if (matchesAny(q, COST_BENEFIT_KEYWORDS)) {
    result.type = 'best_cost_benefit'
    result.mode = 'decisional'
    result.confidence = 0.8
  } else if (matchesAny(q, PROMO_KEYWORDS)) {
    result.type = 'has_promo'
    result.mode = 'exploratory'
    result.confidence = 0.7
  } else if (result.useCase && matchesAny(q, BEST_KEYWORDS)) {
    result.type = 'best_for_use'
    result.mode = 'decisional'
    result.confidence = 0.8
  } else if (result.budget && matchesAny(q, BEST_KEYWORDS)) {
    result.type = 'best_under_budget'
    result.mode = 'decisional'
    result.confidence = 0.85
  } else if (brands.length === 1 && q.match(/\d{2,}/)) {
    result.type = 'specific_product'
    result.mode = 'decisional'
    result.confidence = 0.9
  } else if (result.budget) {
    result.type = 'best_under_budget'
    result.mode = 'decisional'
    result.confidence = 0.7
  }

  // Urgency
  if (matchesAny(q, URGENCY_KEYWORDS)) {
    result.urgency = 'high'
    result.mode = 'urgent'
  } else if (result.type === 'specific_product' || result.budget) {
    result.urgency = 'medium'
  } else {
    result.urgency = 'low'
  }

  return result
}

// ============================================
// HELPERS
// ============================================

function matchesAny(text: string, keywords: string[]): boolean {
  return keywords.some(kw => text.match(new RegExp(kw, 'i')))
}

function parsePrice(s: string): number {
  return Number(s.replace(/\./g, '').replace(',', '.')) || 0
}

/**
 * Get the response tone based on intent classification.
 * Used by the response composer to adjust copy style.
 */
export function getIntentTone(intent: ClassifiedIntent): {
  style: 'objective' | 'consultive' | 'enthusiastic' | 'comparative' | 'urgent'
  maxItems: number
  showAlternatives: boolean
  suggestAlert: boolean
  suggestExternalSearch: boolean
} {
  switch (intent.mode) {
    case 'urgent':
      return { style: 'urgent', maxItems: 3, showAlternatives: false, suggestAlert: false, suggestExternalSearch: false }
    case 'comparative':
      return { style: 'comparative', maxItems: 4, showAlternatives: true, suggestAlert: true, suggestExternalSearch: true }
    case 'decisional':
      return { style: 'objective', maxItems: 5, showAlternatives: true, suggestAlert: true, suggestExternalSearch: true }
    case 'exploratory':
    default:
      return { style: 'consultive', maxItems: 6, showAlternatives: true, suggestAlert: true, suggestExternalSearch: true }
  }
}
