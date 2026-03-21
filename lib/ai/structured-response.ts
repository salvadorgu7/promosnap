/**
 * Structured Response Types — rich blocks for the assistant UI.
 *
 * Instead of a flat text response, the assistant returns blocks
 * that the frontend renders as smart components.
 */

// ── Block Types ─────────────────────────────────────────────────────────────

export type StructuredBlock =
  | TextBlock
  | ProductCardsBlock
  | ComparisonTableBlock
  | DealVerdictBlock
  | AlertSuggestionBlock
  | FollowUpBlock

export interface TextBlock {
  type: 'text'
  content: string
}

export interface ProductCardsBlock {
  type: 'product_cards'
  products: EnrichedProduct[]
  layout: 'list' | 'grid' | 'compact'
}

export interface ComparisonTableBlock {
  type: 'comparison_table'
  products: EnrichedProduct[]
  specs: { key: string; label: string; unit?: string; values: (string | number | null)[] }[]
  verdict?: string
}

export interface DealVerdictBlock {
  type: 'deal_verdict'
  productName: string
  verdict: 'comprar' | 'esperar' | 'neutro'
  reasons: string[]
  priceContext?: PriceContext
}

export interface AlertSuggestionBlock {
  type: 'alert_suggestion'
  productName: string
  currentPrice: number
  suggestedTargetPrice: number
  slug: string
}

export interface FollowUpBlock {
  type: 'follow_up_buttons'
  suggestions: FollowUpSuggestion[]
}

// ── Supporting Types ────────────────────────────────────────────────────────

export interface PriceContext {
  avg30d: number
  min90d: number
  allTimeMin: number
  trend: 'up' | 'down' | 'stable'
  /** 0 = at min, 100 = at max within 90d range */
  position: number
  isHistoricalLow: boolean
  pctBelowAvg: number | null
}

export interface ExtractedSpec {
  key: string
  label: string
  value: string | number
  unit?: string
}

export interface EnrichedProduct {
  name: string
  price?: number
  originalPrice?: number
  discount?: number
  source: string
  url: string
  affiliateUrl: string
  imageUrl?: string
  slug?: string
  isFromCatalog: boolean
  confidence: 'verified' | 'resolved' | 'raw'
  monetization: 'verified' | 'best_effort' | 'none'
  // Enrichment data
  priceContext?: PriceContext
  buySignal?: {
    level: 'excelente' | 'bom' | 'neutro' | 'aguarde'
    headline: string
    color: 'green' | 'blue' | 'gray' | 'orange'
  }
  dealScore?: number
  specs?: ExtractedSpec[]
  sourceCredibility?: number
}

export interface FollowUpSuggestion {
  label: string
  query: string
  icon?: 'search' | 'compare' | 'alert' | 'filter' | 'category'
}
