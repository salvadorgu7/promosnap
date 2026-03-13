// ============================================================================
// ML Discovery Engine — public API
// ============================================================================

export { runDiscovery } from './engine'
export type { DiscoveryOptions } from './engine'
export { resolveIntentToCategories, getAllCategories, getCronCategories } from './categories'
export { fetchTrendingSignals, getTrendCategories } from './trends'
export { fetchHighlightsForCategory, fetchHighlightsForCategories } from './highlights'
export { hydrateItem, batchHydrateItems, mlFetch } from './items'
export { rankDiscoveryResults, deduplicateProducts } from './ranking'
export type {
  MLCategory,
  MLTrend,
  MLProduct,
  MLHighlightEntry,
  DiscoveryResult,
  DiscoveryMeta,
  DiscoveryMode,
  PipelineStage,
  ImportResult,
  ImportedItem,
  MLAuditReport,
  DiscoveryLogEntry,
} from './types'
