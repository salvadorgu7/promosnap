// ============================================================================
// Query Understanding — Type Definitions
// ============================================================================

/** The kind of search intent detected */
export type QueryIntent =
  | 'product'          // Looking for a specific product (e.g. "iPhone 15 Pro")
  | 'category'         // Browsing a category (e.g. "notebooks", "fones")
  | 'brand'            // Looking for a brand (e.g. "Samsung", "Apple")
  | 'attribute'        // Filtering by attribute (e.g. "128gb", "bluetooth")
  | 'deal'             // Looking for deals/offers (e.g. "promoção", "desconto")
  | 'comparison'       // Comparing products (e.g. "vs", "ou", "melhor entre")
  | 'exploratory'      // Inspirational/broad (e.g. "presentes", "ideias")

/** Confidence level of intent classification */
export type ConfidenceLevel = 'high' | 'medium' | 'low'

/** A resolved entity from the query */
export interface QueryEntity {
  type: 'brand' | 'category' | 'model' | 'attribute' | 'modifier'
  value: string
  original: string    // original text from query
  confidence: ConfidenceLevel
}

/** The full result of query understanding */
export interface QueryUnderstanding {
  /** The original raw query */
  raw: string
  /** Normalized version */
  normalized: string
  /** Primary detected intent */
  intent: QueryIntent
  /** Confidence in the intent classification */
  confidence: ConfidenceLevel
  /** Extracted entities */
  entities: QueryEntity[]
  /** Expanded terms for broader matching */
  expansions: string[]
  /** Suggested corrections/alternatives */
  suggestions: string[]
  /** Whether fallback logic was used */
  fallbackUsed: boolean
  /** Processing time in ms */
  processingMs: number
}

/** Pipeline stage for query processing */
export interface QueryPipelineStage {
  stage: 'normalize' | 'classify' | 'extract' | 'expand' | 'resolve'
  status: 'success' | 'partial' | 'skipped'
  durationMs: number
  detail?: string
}

/** Full query pipeline result */
export interface QueryPipelineResult {
  understanding: QueryUnderstanding
  stages: QueryPipelineStage[]
  totalMs: number
}

/** Search intelligence metrics for observability */
export interface SearchMetrics {
  query: string
  intent: QueryIntent
  confidence: ConfidenceLevel
  resultsCount: number
  fallbackUsed: boolean
  zeroResult: boolean
  expansionsUsed: number
  processingMs: number
  timestamp: string
}
