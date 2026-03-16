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

// ── Bundle export ───────────────────────────────────────

export const analytics = {
  offerClick,
  offerView,
  productView,
  priceCompare,
  priceAlertSet,
  searchPerformed,
  searchResultClick,
  favoriteToggle,
  shareClick,
  newsletterSignup,
  affiliateClickout,
  categoryView,
  guideView,
}
