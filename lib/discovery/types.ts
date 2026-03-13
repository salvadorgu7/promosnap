// ============================================================================
// Opportunity Engine — Type Definitions
// ============================================================================

/** Sources of opportunity signals */
export type OpportunitySource =
  | 'trending'        // From ML trending keywords
  | 'best_seller'     // High sales velocity items
  | 'catalog_gap'     // Searched but not in catalog
  | 'price_drop'      // Significant price decrease
  | 'new_listing'     // Recently added to marketplace
  | 'high_demand'     // High search frequency + alerts
  | 'underserved'     // Category with few products

/** Priority for opportunity action */
export type OpportunityPriority = 'critical' | 'high' | 'medium' | 'low'

/** A single discovered opportunity */
export interface Opportunity {
  id: string
  source: OpportunitySource
  priority: OpportunityPriority
  score: number          // 0-100
  title: string          // Human-readable description
  keyword?: string       // Related search term
  categoryId?: string
  categoryName?: string
  productCount?: number  // How many products match
  estimatedDemand?: number
  actionUrl?: string     // Admin link to act on it
  metadata?: Record<string, unknown>
  detectedAt: string     // ISO timestamp
}

/** Summary of catalog health */
export interface CatalogHealth {
  totalProducts: number
  activeProducts: number
  productsWithOffers: number
  productsStale7d: number
  productsNoPrice: number
  categoryCoverage: CategoryCoverage[]
  sourceBreakdown: SourceBreakdown[]
}

export interface CategoryCoverage {
  id: string
  name: string
  slug: string
  productCount: number
  activeOfferCount: number
  avgOfferScore: number
  healthStatus: 'healthy' | 'thin' | 'empty' | 'stale'
}

export interface SourceBreakdown {
  id: string
  name: string
  slug: string
  totalListings: number
  activeOffers: number
  avgPrice: number
  lastImport?: string
}

/** Full opportunity report */
export interface OpportunityReport {
  opportunities: Opportunity[]
  catalogHealth: CatalogHealth
  generatedAt: string
  processingMs: number
}

/** Zero-result search entry */
export interface ZeroResultSearch {
  query: string
  normalizedQuery: string
  count: number
  lastSearched: Date
}
