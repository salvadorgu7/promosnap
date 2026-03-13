// ============================================================================
// Query Understanding Engine — intent classification + entity extraction
// ============================================================================

import type {
  QueryIntent, ConfidenceLevel, QueryEntity,
  QueryUnderstanding, QueryPipelineStage, QueryPipelineResult,
} from './types'
import {
  KNOWN_BRANDS, DEAL_MODIFIERS, EXPLORATORY_MODIFIERS,
  COMPARISON_MODIFIERS, ATTRIBUTE_TERMS, BRAND_ALIASES,
  expandWithSynonyms, resolveBrand,
} from './synonyms'

// ── Normalization ───────────────────────────────────────────────────────────

function normalize(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Intent Classification ────────────────────────────────────────────────────

function classifyIntent(normalized: string, entities: QueryEntity[]): { intent: QueryIntent; confidence: ConfidenceLevel } {
  const words = normalized.split(/\s+/)

  // Comparison check (highest priority — structural signal)
  if (COMPARISON_MODIFIERS.some(m => normalized.includes(m))) {
    return { intent: 'comparison', confidence: 'high' }
  }

  // Deal/offer intent
  const dealMatchCount = DEAL_MODIFIERS.filter(m => normalized.includes(m)).length
  if (dealMatchCount >= 2) return { intent: 'deal', confidence: 'high' }
  if (dealMatchCount === 1) {
    // Deal + another entity = probably looking for deals on that thing
    return { intent: 'deal', confidence: entities.length > 0 ? 'high' : 'medium' }
  }

  // Exploratory intent
  const exploratoryCount = EXPLORATORY_MODIFIERS.filter(m => normalized.includes(m)).length
  if (exploratoryCount >= 1) {
    return { intent: 'exploratory', confidence: exploratoryCount >= 2 ? 'high' : 'medium' }
  }

  // Brand-only queries
  const brandEntities = entities.filter(e => e.type === 'brand')
  const hasOnlyBrand = brandEntities.length > 0 && entities.filter(e => e.type !== 'brand' && e.type !== 'modifier').length === 0
  if (hasOnlyBrand && words.length <= 2) {
    return { intent: 'brand', confidence: 'high' }
  }

  // Attribute-focused
  const attrEntities = entities.filter(e => e.type === 'attribute')
  if (attrEntities.length >= 2) {
    return { intent: 'attribute', confidence: 'medium' }
  }

  // Category detection (single generic term)
  const categoryTerms = [
    'celular', 'smartphone', 'notebook', 'laptop', 'tablet', 'fone', 'headphone',
    'tv', 'televisao', 'monitor', 'camera', 'console', 'teclado', 'mouse',
    'impressora', 'ssd', 'geladeira', 'microondas', 'aspirador', 'cafeteira',
    'perfume', 'tenis', 'mochila', 'ar condicionado', 'air fryer', 'smartwatch',
    'gpu', 'placa de video',
  ]
  if (categoryTerms.some(cat => normalized.includes(cat))) {
    // If it's a category term + brand or model, it's a product search
    if (brandEntities.length > 0 || words.length >= 3) {
      return { intent: 'product', confidence: 'high' }
    }
    return { intent: 'category', confidence: words.length <= 2 ? 'high' : 'medium' }
  }

  // Brand + model/specific = product
  if (brandEntities.length > 0 && words.length >= 2) {
    return { intent: 'product', confidence: 'medium' }
  }

  // Default: product search if >2 words, exploratory if very short
  if (words.length === 1) {
    return { intent: 'exploratory', confidence: 'low' }
  }
  return { intent: 'product', confidence: 'low' }
}

// ── Entity Extraction ────────────────────────────────────────────────────────

function extractEntities(normalized: string): QueryEntity[] {
  const entities: QueryEntity[] = []
  const words = normalized.split(/\s+/)

  // Brand detection
  for (const word of words) {
    const brand = resolveBrand(word)
    if (brand) {
      entities.push({
        type: 'brand',
        value: brand,
        original: word,
        confidence: word === brand ? 'high' : 'medium',
      })
    }
  }

  // Multi-word brand detection
  for (const brand of KNOWN_BRANDS) {
    if (brand.includes(' ') && normalized.includes(brand)) {
      if (!entities.some(e => e.type === 'brand' && e.value === brand)) {
        entities.push({
          type: 'brand',
          value: brand,
          original: brand,
          confidence: 'high',
        })
      }
    }
  }

  // Brand alias correction
  for (const [brand, aliases] of Object.entries(BRAND_ALIASES)) {
    for (const alias of aliases) {
      if (normalized.includes(alias) && !entities.some(e => e.value === brand)) {
        entities.push({
          type: 'brand',
          value: brand,
          original: alias,
          confidence: 'medium',
        })
      }
    }
  }

  // Attribute detection
  for (const [attrType, terms] of Object.entries(ATTRIBUTE_TERMS)) {
    for (const term of terms) {
      if (normalized.includes(term) || words.includes(term)) {
        entities.push({
          type: 'attribute',
          value: `${attrType}:${term}`,
          original: term,
          confidence: 'high',
        })
        break // one per attribute type
      }
    }
  }

  // Model detection (alphanumeric patterns like "s24", "15 pro", "a54")
  const modelPatterns = [
    /\b([a-z]\d{1,2})\b/g,           // s24, a54, m12
    /\b(\d{1,2}\s?pro\s?max?)\b/g,   // 15 pro max
    /\b(\d{1,2}\s?pro)\b/g,          // 15 pro
    /\b(galaxy\s?[a-z]\d{1,2})\b/g,  // galaxy s24
    /\b(iphone\s?\d{1,2})\b/g,       // iphone 15
    /\b(redmi\s?note?\s?\d{1,2})\b/g, // redmi note 13
  ]

  for (const pattern of modelPatterns) {
    const matches = normalized.matchAll(pattern)
    for (const match of matches) {
      if (match[1] && !entities.some(e => e.type === 'model' && e.value === match[1])) {
        entities.push({
          type: 'model',
          value: match[1],
          original: match[1],
          confidence: 'medium',
        })
      }
    }
  }

  // Deal modifier detection
  for (const mod of DEAL_MODIFIERS) {
    if (normalized.includes(mod)) {
      entities.push({
        type: 'modifier',
        value: `deal:${mod}`,
        original: mod,
        confidence: 'high',
      })
      break // one deal modifier is enough
    }
  }

  return entities
}

// ── Suggestions ──────────────────────────────────────────────────────────────

function generateSuggestions(normalized: string, entities: QueryEntity[], intent: QueryIntent): string[] {
  const suggestions: string[] = []

  // If brand typo was corrected, suggest the corrected version
  for (const entity of entities) {
    if (entity.type === 'brand' && entity.original !== entity.value) {
      suggestions.push(normalized.replace(entity.original, entity.value))
    }
  }

  // If very short query, suggest more specific searches
  if (normalized.split(/\s+/).length === 1 && intent === 'exploratory') {
    const brandEntities = entities.filter(e => e.type === 'brand')
    if (brandEntities.length > 0) {
      suggestions.push(`${normalized} celular`)
      suggestions.push(`${normalized} fone`)
    }
  }

  return suggestions.slice(0, 3)
}

// ============================================================================
// Main Pipeline
// ============================================================================

/**
 * Run the full query understanding pipeline.
 *
 * Pipeline: raw → normalize → extract entities → classify intent → expand → resolve
 */
export function understandQuery(raw: string): QueryPipelineResult {
  const totalStart = Date.now()
  const stages: QueryPipelineStage[] = []

  // ── Stage 1: Normalize ────────────────────────────────────────────────
  const normStart = Date.now()
  const normalized = normalize(raw)
  stages.push({ stage: 'normalize', status: 'success', durationMs: Date.now() - normStart })

  // ── Stage 2: Extract entities ─────────────────────────────────────────
  const extractStart = Date.now()
  const entities = extractEntities(normalized)
  stages.push({
    stage: 'extract',
    status: entities.length > 0 ? 'success' : 'partial',
    durationMs: Date.now() - extractStart,
    detail: `${entities.length} entities found`,
  })

  // ── Stage 3: Classify intent ──────────────────────────────────────────
  const classifyStart = Date.now()
  const { intent, confidence } = classifyIntent(normalized, entities)
  stages.push({
    stage: 'classify',
    status: 'success',
    durationMs: Date.now() - classifyStart,
    detail: `${intent} (${confidence})`,
  })

  // ── Stage 4: Expand ───────────────────────────────────────────────────
  const expandStart = Date.now()
  const expansions = expandWithSynonyms(normalized)
  stages.push({
    stage: 'expand',
    status: expansions.length > 0 ? 'success' : 'skipped',
    durationMs: Date.now() - expandStart,
    detail: `${expansions.length} expansions`,
  })

  // ── Stage 5: Resolve suggestions ──────────────────────────────────────
  const resolveStart = Date.now()
  const suggestions = generateSuggestions(normalized, entities, intent)
  stages.push({
    stage: 'resolve',
    status: 'success',
    durationMs: Date.now() - resolveStart,
  })

  // ── Build result ──────────────────────────────────────────────────────
  const totalMs = Date.now() - totalStart

  const understanding: QueryUnderstanding = {
    raw,
    normalized,
    intent,
    confidence,
    entities,
    expansions,
    suggestions,
    fallbackUsed: confidence === 'low',
    processingMs: totalMs,
  }

  return { understanding, stages, totalMs }
}
