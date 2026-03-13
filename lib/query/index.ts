// ============================================================================
// Query Understanding — Public API
// ============================================================================

export { understandQuery } from './engine'
export { expandWithSynonyms, resolveBrand, KNOWN_BRANDS, SYNONYMS } from './synonyms'
export type {
  QueryIntent, ConfidenceLevel, QueryEntity,
  QueryUnderstanding, QueryPipelineStage, QueryPipelineResult,
  SearchMetrics,
} from './types'
