/**
 * Centralized clickout URL builder.
 * Single source of truth for all clickout tracking parameters.
 * Replaces 11+ components manually building clickout URLs.
 */

// ── Types ───────────────────────────────────────────────────────────────────

export type ClickoutPage =
  | 'home'
  | 'search'
  | 'product'
  | 'category'
  | 'brand'
  | 'compare'
  | 'price'
  | 'menor-preco'
  | 'vale-a-pena'
  | 'melhores'
  | 'preco-hoje'
  | 'guide'
  | 'email'

export type ClickoutBlock =
  | 'hero'
  | 'hot-offers'
  | 'best-sellers'
  | 'lowest-prices'
  | 'best-value'
  | 'recently-imported'
  | 'deal-of-day'
  | 'carousel'
  | 'source-comparison'
  | 'price-comparison'
  | 'decision-summary'
  | 'commercial-cta'
  | 'mobile-cta'
  | 'mobile-bar'
  | 'canonical-view'
  | 'quick-compare'
  | 'category-grid'
  | 'brand-grid'
  | 'search-results'
  | 'similar-products'
  | 'alternatives'
  | 'recommendation'

export type RecommendationType =
  | 'best-price'
  | 'best-value'
  | 'best-trust'
  | 'best-shipping'
  | 'best-rated'
  | 'best-overall'
  | 'price-drop'
  | 'trending'
  | 'editorial'
  | 'personalized'

export interface ClickoutParams {
  /** Offer ID (required) */
  offerId: string
  /** Page where click happened */
  page: ClickoutPage
  /** UI block/section that contains the link */
  block?: ClickoutBlock
  /** Position within the block (0-indexed) */
  position?: number
  /** Recommendation type that surfaced this offer */
  recommendation?: RecommendationType
  /** Product slug being viewed */
  product?: string
  /** Rail/carousel source (legacy compat) */
  rail?: string
  /** Origin type (legacy compat) */
  origin?: string
  /** Label shown to user on the CTA */
  label?: string
}

// ── Builder ─────────────────────────────────────────────────────────────────

/**
 * Builds a clickout URL with full tracking context.
 *
 * @example
 * buildClickoutUrl({
 *   offerId: 'abc123',
 *   page: 'product',
 *   block: 'price-comparison',
 *   position: 0,
 *   recommendation: 'best-price',
 *   product: 'iphone-15-pro',
 * })
 * // → "/api/clickout/abc123?page=product&block=price-comparison&pos=0&rec=best-price&product=iphone-15-pro"
 */
export function buildClickoutUrl(params: ClickoutParams): string {
  const url = new URL(`/api/clickout/${params.offerId}`, 'http://localhost')

  url.searchParams.set('page', params.page)

  if (params.block) url.searchParams.set('block', params.block)
  if (params.position !== undefined) url.searchParams.set('pos', String(params.position))
  if (params.recommendation) url.searchParams.set('rec', params.recommendation)
  if (params.product) url.searchParams.set('product', params.product)
  if (params.rail) url.searchParams.set('rail', params.rail)
  if (params.origin) url.searchParams.set('origin', params.origin)
  if (params.label) url.searchParams.set('label', params.label)

  // Return path + search (no hostname)
  return `${url.pathname}${url.search}`
}

/**
 * Shorthand for simple clickout URL — when you just need offerId + page + block.
 */
export function clickoutHref(
  offerId: string,
  page: ClickoutPage,
  block?: ClickoutBlock,
  extras?: Partial<ClickoutParams>
): string {
  return buildClickoutUrl({ offerId, page, block, ...extras })
}
