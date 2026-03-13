// ============================================================================
// Query Understanding — Public API
// ============================================================================

export { understandQuery } from './engine'
export { expandWithSynonyms, correctTypos, resolveBrand, KNOWN_BRANDS, SYNONYMS, TYPO_CORRECTIONS, ABBREVIATION_EXPANSIONS } from './synonyms'
export type {
  QueryIntent, ConfidenceLevel, QueryEntity,
  QueryUnderstanding, QueryPipelineStage, QueryPipelineResult,
  SearchMetrics, CommercialIntentType,
} from './types'
