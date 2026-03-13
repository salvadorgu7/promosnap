// ============================================================================
// ML Discovery Engine — Type Definitions
// ============================================================================

/** Strategy modes for product discovery */
export type DiscoveryMode =
  | 'manual-admin'          // Admin triggers via UI
  | 'category-bestsellers'  // Fetch best sellers for specific categories
  | 'trending-capture'      // Discover via ML trends
  | 'mixed-discovery'       // Combined: categories + trends
  | 'scheduled-auto-import' // Cron-driven full pipeline

/** A resolved ML category */
export interface MLCategory {
  id: string    // e.g. "MLB1055"
  name: string  // e.g. "Celulares e Smartphones"
  priority: number // 1=highest, lower = more important
}

/** A trending keyword from ML */
export interface MLTrend {
  keyword: string
  url: string
  resolvedCategory?: MLCategory
}

/** Raw highlight entry from /highlights endpoint */
export interface MLHighlightEntry {
  id: string       // Product or item ID
  position: number
  type: string     // "PRODUCT" | "ITEM"
}

/** Hydrated product details — normalized from ML API */
export interface MLProduct {
  externalId: string     // ML item ID (e.g. "MLB12345678")
  catalogProductId?: string // ML catalog product ID
  title: string
  currentPrice: number
  originalPrice?: number
  currency: string
  productUrl: string
  imageUrl?: string
  isFreeShipping: boolean
  availability: 'in_stock' | 'out_of_stock' | 'unknown'
  soldQuantity?: number
  availableQuantity?: number
  condition?: string
  categoryId?: string
  officialStoreName?: string
}

/** Discovery result with metadata about the pipeline path */
export interface DiscoveryResult {
  products: MLProduct[]
  meta: DiscoveryMeta
}

/** Metadata about how discovery was performed */
export interface DiscoveryMeta {
  mode: DiscoveryMode
  inputQuery?: string
  resolvedCategories: MLCategory[]
  trendsUsed: string[]
  pipeline: PipelineStage[]
  timing: { totalMs: number; stageTimings: Record<string, number> }
  stats: {
    highlightsFetched: number
    itemsHydrated: number
    itemsFailed: number
    duplicatesSkipped: number
  }
}

/** A single pipeline execution stage */
export interface PipelineStage {
  stage: 'intent' | 'trends' | 'highlights' | 'hydrate' | 'normalize' | 'rank' | 'import'
  status: 'success' | 'partial' | 'failure' | 'skipped'
  itemsIn: number
  itemsOut: number
  durationMs: number
  error?: string
}

/** Import result for a single product */
export interface ImportedItem {
  externalId: string
  action: 'created' | 'updated' | 'skipped'
  productId?: string
  error?: string
}

/** Full import result */
export interface ImportResult {
  imported: number
  updated: number
  skipped: number
  failed: number
  total: number
  items: ImportedItem[]
  durationMs: number
}

/** Audit report for ML integration health */
export interface MLAuditReport {
  timestamp: string
  endpoints: {
    name: string
    url: string
    status: 'operational' | 'blocked' | 'degraded' | 'unknown'
    lastChecked?: string
    latencyMs?: number
  }[]
  tokenStatus: {
    userToken: boolean
    appToken: boolean
    expiresIn?: number
  }
  categories: {
    total: number
    covered: string[]
  }
  lastSync?: {
    timestamp: string
    mode: DiscoveryMode
    productsImported: number
    errors: number
  }
  capabilities: {
    cronReady: boolean
    autoImportReady: boolean
    fallbackActive: boolean
  }
}

/** Structured log entry */
export interface DiscoveryLogEntry {
  source: 'ml'
  stage: PipelineStage['stage']
  status: 'success' | 'failure'
  error_code?: string
  items_found?: number
  items_imported?: number
  duration_ms?: number
  detail?: string
}
