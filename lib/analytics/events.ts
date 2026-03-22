/**
 * Typed analytics events for PromoSnap.
 *
 * Wraps the GA4 trackEvent with typed, consistent event names.
 * All events follow GA4 naming: snake_case, max 40 chars.
 *
 * Usage:
 *   import { analytics } from "@/lib/analytics/events"
 *   analytics.offerClick({ offerId: "abc", store: "amazon", price: 199.90 })
 */

import { trackEvent } from "@/components/analytics/GoogleAnalytics"

// ── Offer / Product Events ──────────────────────────────

export function offerClick(params: {
  offerId: string
  productId?: string
  store?: string
  price?: number
  position?: number
}) {
  trackEvent("offer_click", params)
}

export function offerView(params: {
  offerId: string
  productId?: string
  store?: string
  price?: number
}) {
  trackEvent("offer_view", params)
}

export function productView(params: {
  productId: string
  slug: string
  category?: string
  price?: number
}) {
  trackEvent("product_view", params)
}

// ── Comparison & Price ──────────────────────────────────

export function priceCompare(params: {
  productId: string
  storeCount: number
  minPrice?: number
  maxPrice?: number
}) {
  trackEvent("price_compare", params)
}

export function priceAlertSet(params: {
  productId: string
  targetPrice: number
}) {
  trackEvent("price_alert_set", params)
}

// ── Search ──────────────────────────────────────────────

export function searchPerformed(params: {
  query: string
  resultCount: number
}) {
  trackEvent("search", {
    search_term: params.query,
    result_count: params.resultCount,
  })
}

export function searchResultClick(params: {
  query: string
  productId: string
  position: number
}) {
  trackEvent("search_result_click", params)
}

export function searchZeroResults(params: {
  query: string
}) {
  trackEvent("search_zero_results", {
    search_term: params.query,
    result_count: 0,
  })
}

export function railImpression(params: {
  railId: string
  position: number
  productId?: string
}) {
  trackEvent("rail_impression", params)
}

// ── Engagement ──────────────────────────────────────────

export function favoriteToggle(params: {
  productId: string
  action: "add" | "remove"
}) {
  trackEvent("favorite_toggle", params)
}

export function shareClick(params: {
  contentType: "product" | "offer" | "article" | "guide"
  contentId: string
  method?: string
}) {
  trackEvent("share", {
    content_type: params.contentType,
    item_id: params.contentId,
    method: params.method,
  })
}

export function newsletterSignup(params: {
  source: string
}) {
  trackEvent("newsletter_signup", params)
}

// ── Conversion / Affiliate ──────────────────────────────

export function affiliateClickout(params: {
  offerId: string
  store: string
  price: number
  url: string
}) {
  trackEvent("affiliate_clickout", {
    offer_id: params.offerId,
    store: params.store,
    price: params.price,
    destination_url: params.store, // don't leak full URL to GA
  })
}

// ── Navigation ──────────────────────────────────────────

export function categoryView(params: {
  categorySlug: string
  productCount?: number
}) {
  trackEvent("category_view", params)
}

export function guideView(params: {
  guideSlug: string
  guideType: "buying" | "comparison" | "worth-it" | "best"
}) {
  trackEvent("guide_view", params)
}

// ── Expanded Search (Busca Ampliada) ──────────────────────

export function expandedSearchTriggered(params: {
  query: string
  internalCount: number
  expandedCount: number
  coverageScore: number
  /** Where the event fires: "search" | "pdp" | "assistant" */
  sourceLocation?: string
  /** A/B experiment assignments (e.g., expanded_feature_name: "mais_opcoes") */
  experiments?: Record<string, string>
}) {
  trackEvent("expanded_search_triggered", {
    search_term: params.query,
    internal_count: params.internalCount,
    expanded_count: params.expandedCount,
    coverage_score: params.coverageScore,
    source_location: params.sourceLocation || "search",
    ...(params.experiments || {}),
  })
}

export function expandedResultClick(params: {
  query: string
  resultId: string
  marketplace: string
  price: number
  position: number
  affiliateStatus: string
  /** Where the click happens: "search" | "pdp" | "assistant" */
  sourceLocation?: string
  /** A/B experiment assignments */
  experiments?: Record<string, string>
}) {
  trackEvent("expanded_result_click", {
    search_term: params.query,
    result_id: params.resultId,
    marketplace: params.marketplace,
    price: params.price,
    position: params.position,
    affiliate_status: params.affiliateStatus,
    source_location: params.sourceLocation || "search",
    ...(params.experiments || {}),
  })
}

export function expandedResultImpression(params: {
  query: string
  resultCount: number
  visibleCount: number
  coverageScore: number
  /** Where the impression fires: "search" | "pdp" | "assistant" */
  sourceLocation?: string
  /** A/B experiment assignments */
  experiments?: Record<string, string>
}) {
  trackEvent("expanded_result_impression", {
    search_term: params.query,
    result_count: params.resultCount,
    visible_count: params.visibleCount,
    coverage_score: params.coverageScore,
    source_location: params.sourceLocation || "search",
    ...(params.experiments || {}),
  })
}

export function expandedShowMore(params: {
  query: string
  totalResults: number
  /** Where: "search" | "pdp" | "assistant" */
  sourceLocation?: string
}) {
  trackEvent("expanded_show_more", {
    search_term: params.query,
    total_results: params.totalResults,
    source_location: params.sourceLocation || "search",
  })
}

export function weakResultsExpand(params: {
  query: string
  internalCount: number
}) {
  trackEvent("weak_results_expand", {
    search_term: params.query,
    internal_count: params.internalCount,
  })
}

export function weakResultsCtaClick(params: {
  query: string
  internalCount: number
  expandedCount: number
}) {
  trackEvent("weak_results_cta_click", {
    search_term: params.query,
    internal_count: params.internalCount,
    expanded_count: params.expandedCount,
  })
}

// ── Bundle export ───────────────────────────────────────

export const analytics = {
  offerClick,
  offerView,
  productView,
  priceCompare,
  priceAlertSet,
  searchPerformed,
  searchResultClick,
  searchZeroResults,
  railImpression,
  favoriteToggle,
  shareClick,
  newsletterSignup,
  affiliateClickout,
  categoryView,
  guideView,
  expandedSearchTriggered,
  expandedResultClick,
  expandedResultImpression,
  expandedShowMore,
  weakResultsExpand,
  weakResultsCtaClick,
}
