// ============================================================================
// PromosApp Integration — Public API
// ============================================================================

export { processPromosAppBatch } from './pipeline'
export { parseRawEvent, parseRawEvents, computeMessageHash } from './parser'
export { canonicalizeItems, deduplicateBatch } from './canonicalizer'
export { enrichBatch, mergeEnrichment } from './enricher'
export { scoreItem, scoreBatch, decideAction } from './scorer'
export type {
  PromosAppRawEvent,
  PromosAppNormalizedItem,
  PromosAppPipelineResult,
  PromosAppPipelineConfig,
  PromosAppScore,
  PromosAppScoreFactors,
  PromosAppDecision,
  PromosAppItemResult,
} from './types'
export { DEFAULT_PIPELINE_CONFIG } from './types'
