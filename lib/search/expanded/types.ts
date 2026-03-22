/**
 * Busca Ampliada — Unified Types
 *
 * All types for the expanded search subsystem.
 * Separates internal results, expanded results, coverage decisions,
 * and the final unified response.
 */

import type { ProductCard } from '@/types'
import type { QueryUnderstanding } from '@/lib/query/types'

// ── Result Source Types ──────────────────────────────────────────────────────

/** Where a result originated */
export type ResultSourceType = 'internal' | 'expanded'

/** Marketplace identifier */
export type MarketplaceKey =
  | 'amazon-br'
  | 'mercadolivre'
  | 'shopee'
  | 'shein'
  | 'magalu'
  | 'kabum'
  | 'casasbahia'
  | 'americanas'
  | 'carrefour'
  | 'google-shopping'
  | 'unknown'

/** How confident we are in the affiliate link */
export type AffiliateStatus = 'verified' | 'best_effort' | 'none'

/** Quality level of a result */
export type QualityLevel = 'high' | 'medium' | 'low' | 'rejected'

// ── Unified Search Result ────────────────────────────────────────────────────

export interface UnifiedResult {
  /** Unique ID (internal product ID or generated hash) */
  id: string
  /** Display title (normalized) */
  title: string
  /** Price in BRL */
  price: number
  /** Original/list price (for discount calc) */
  originalPrice?: number
  /** Discount percentage (0-100) */
  discount?: number
  /** Image URL */
  imageUrl?: string
  /** Product page URL (internal slug for catalog, external URL for expanded) */
  href: string
  /** Clickout or affiliate URL */
  affiliateUrl: string
  /** Where this result came from */
  sourceType: ResultSourceType
  /** Marketplace slug */
  marketplace: MarketplaceKey
  /** Store display name */
  storeName: string
  /** Brand if detected */
  brand?: string
  /** Category slug if detected */
  categoryGuess?: string
  /** Affiliate status */
  affiliateStatus: AffiliateStatus
  /** Quality score 0-100 */
  qualityScore: number
  /** Relevance score 0-100 (from ranking) */
  relevanceScore: number
  /** Confidence score 0-1 */
  confidenceScore: number
  /** Whether this is a monetizable result */
  isMonetizable: boolean
  /** Free shipping flag */
  isFreeShipping?: boolean
  /** Offer score (from internal or estimated) */
  offerScore?: number
  /** Connector that provided this result */
  sourceConnector?: string
  /** Internal product slug (if matched to catalog) */
  localProductSlug?: string
  /** Fingerprint for dedup */
  fingerprint: string
}

// ── Coverage Evaluation ──────────────────────────────────────────────────────

export interface CoverageEvaluation {
  /** Overall coverage score 0-100 */
  coverageScore: number
  /** How relevant are the internal results to the query */
  relevanceScore: number
  /** How many monetizable results exist */
  monetizationScore: number
  /** Diversity of sources */
  diversityScore: number
  /** How many quality results exist */
  qualityCount: number
  /** Total internal results */
  totalCount: number
  /** Should we expand? */
  shouldExpand: boolean
  /** Expansion aggressiveness level */
  expansionLevel: 'none' | 'light' | 'moderate' | 'aggressive'
  /** Reasons for the decision */
  reasons: string[]
}

// ── Expansion Decision ───────────────────────────────────────────────────────

export interface ExpansionDecision {
  /** Should expand at all */
  expand: boolean
  /** Which connectors to use, in priority order */
  connectors: string[]
  /** Max results to fetch per connector */
  limitPerConnector: number
  /** Max total expansion time in ms */
  timeoutMs: number
  /** Max price filter (from query budget) */
  maxPrice?: number
  /** Reason string for debug/analytics */
  reason: string
}

// ── Pipeline Trace (observability) ───────────────────────────────────────────

export interface PipelineStage {
  stage: string
  durationMs: number
  itemsIn: number
  itemsOut: number
  detail?: string
}

export interface ExpansionTrace {
  /** Full pipeline stages */
  stages: PipelineStage[]
  /** Total pipeline duration */
  totalMs: number
  /** Coverage evaluation */
  coverage: CoverageEvaluation
  /** Expansion decision */
  decision: ExpansionDecision
  /** Connectors called and their results */
  connectorResults: {
    connector: string
    resultsCount: number
    durationMs: number
    error?: string
  }[]
  /** Quality gates applied */
  qualityGates: {
    before: number
    afterQuality: number
    afterDedup: number
    afterAffiliate: number
  }
}

// ── Expanded Search Response ─────────────────────────────────────────────────

export interface ExpandedSearchResponse {
  /** Internal catalog results */
  internalResults: UnifiedResult[]
  /** Expanded/external results */
  expandedResults: UnifiedResult[]
  /** All results blended and ranked */
  blendedResults: UnifiedResult[]
  /** Total internal count */
  internalTotal: number
  /** Was expansion performed? */
  expanded: boolean
  /** Coverage evaluation */
  coverage: CoverageEvaluation
  /** Query understanding */
  understanding: QueryUnderstanding
  /** Pipeline trace (admin-only) */
  trace?: ExpansionTrace
  /** Search log ID */
  searchLogId?: string
  /** UX framing text for expanded section */
  expandedFraming?: string
}

// ── Expanded Search Params ───────────────────────────────────────────────────

export interface ExpandedSearchParams {
  query: string
  page?: number
  limit?: number
  category?: string
  brand?: string
  source?: string
  minPrice?: number
  maxPrice?: number
  freeShipping?: boolean
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'popularity' | 'score'
  /** Force expansion even if internal coverage is good */
  forceExpand?: boolean
  /** Return admin trace info */
  isAdmin?: boolean
}
