// ============================================
// WhatsApp Broadcast — Affiliate Link Builder
// Ensures all broadcast links use our affiliate + campaign tracking
// ============================================

import { buildAffiliateUrl } from "@/lib/affiliate"

interface BroadcastTrackingParams {
  channelId: string
  campaignId: string
  slotPosition: number
  templateKey?: string
  timeWindow?: string
}

/**
 * Build affiliate URL with broadcast-specific tracking params.
 *
 * Rule: NEVER send a link without our affiliate tag.
 * Adds campaign, channel, slot, and time tracking.
 */
export function buildBroadcastAffiliateUrl(
  baseUrl: string,
  params: BroadcastTrackingParams
): string {
  // First ensure affiliate tag is present
  let url = buildAffiliateUrl(baseUrl)

  // Add broadcast tracking via UTM-like params
  try {
    const parsed = new URL(url)
    parsed.searchParams.set("utm_source", "whatsapp")
    parsed.searchParams.set("utm_medium", "broadcast")
    parsed.searchParams.set("utm_campaign", params.campaignId)
    parsed.searchParams.set("utm_content", `ch_${params.channelId}_pos_${params.slotPosition}`)
    if (params.templateKey) {
      parsed.searchParams.set("utm_term", params.templateKey)
    }
    return parsed.toString()
  } catch {
    // Fallback: append as query string
    const sep = url.includes("?") ? "&" : "?"
    return `${url}${sep}utm_source=whatsapp&utm_medium=broadcast&utm_campaign=${params.campaignId}`
  }
}

/**
 * Validate that a URL has affiliate tracking.
 * Returns true if affiliate tag is present.
 */
export function hasAffiliateTracking(url: string): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    // Check for common affiliate params
    const affiliateParams = [
      "matt_tool", "tag", "af_id", "aff_id", "partner_id",
      "utm_source",
    ]
    return affiliateParams.some(p => parsed.searchParams.has(p))
  } catch {
    return false
  }
}

/**
 * Build PromoSnap clickout URL for proper attribution.
 * Uses /api/clickout/[offerId] to record the click before redirecting.
 */
export function buildClickoutUrl(
  offerId: string,
  params: BroadcastTrackingParams
): string {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.promosnap.com.br"
  const base = `${APP_URL}/api/clickout/${offerId}`
  const searchParams = new URLSearchParams({
    page: "whatsapp",
    channel: params.channelId,
    campaign: params.campaignId,
    pos: String(params.slotPosition),
  })
  return `${base}?${searchParams.toString()}`
}
