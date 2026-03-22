// ============================================
// WhatsApp Broadcast — Offer Selection Engine
// DELEGATES to Unified Commerce Engine (lib/commerce/)
// Preserves API contract for existing callers.
// ============================================

import { logger } from "@/lib/logger"
import { retrieveOffers } from "@/lib/commerce/retrieval"
import { buildAffiliateUrl } from "@/lib/commerce/affiliate-manager"
import type { SelectedOffer, BroadcastChannel, BroadcastCampaign } from "./types"
import { buildBroadcastAffiliateUrl } from "./affiliate-builder"

const log = logger.child({ module: "wa-broadcast.offer-selector" })

// ============================================
// Selection engine — delegated to commerce engine
// ============================================

export interface SelectionOptions {
  channel: BroadcastChannel
  campaign?: BroadcastCampaign | null
  limit?: number
  excludeOfferIds?: string[]
}

/**
 * Select the best offers for a broadcast message.
 * Delegates to the Unified Commerce Engine for retrieval + quality gates,
 * then maps to SelectedOffer with WhatsApp-specific tracking.
 */
export async function selectOffers(options: SelectionOptions): Promise<SelectedOffer[]> {
  const { channel, campaign, excludeOfferIds = [] } = options
  const limit = campaign?.offerCount || channel.defaultOfferCount || 5
  const minScore = campaign?.minScore || 40
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.promosnap.com.br"

  // Merge category filters from channel + campaign
  const categories = [
    ...channel.categoriesInclude,
    ...(campaign?.categorySlugs || []),
  ].filter(Boolean)

  // Merge marketplace filters from channel + campaign
  const marketplaces = [
    ...channel.marketplacesInclude,
    ...(campaign?.marketplaces || []),
  ].filter(Boolean)

  // Budget from campaign ticket filters
  const budget: { min?: number; max?: number } | undefined =
    (campaign?.minTicket || campaign?.maxTicket)
      ? { min: campaign?.minTicket ?? undefined, max: campaign?.maxTicket ?? undefined }
      : undefined

  try {
    // ── Delegate to Unified Commerce Engine ────────────────────────────
    const retrieved = await retrieveOffers({
      channel: "whatsapp",
      limit,
      excludeOfferIds,
      categories: categories.length > 0 ? categories : undefined,
      marketplaces: marketplaces.length > 0 ? marketplaces : undefined,
      budget,
      minScore,
      minDiscount: campaign?.minDiscount ?? undefined,
      requireAffiliate: campaign?.requireAffiliate !== false,
      requireImage: true,
      maxPerMarketplace: 2,
    })

    // ── Map to SelectedOffer with broadcast-specific tracking ─────────
    return retrieved.map((o, i) => {
      const baseUrl = o.affiliateUrl || `${APP_URL}/produto/${o.productSlug}`
      const campaignTrackingUrl = buildBroadcastAffiliateUrl(baseUrl, {
        channelId: channel.id,
        campaignId: campaign?.id || "manual",
        slotPosition: i,
      })

      return {
        offerId: o.offerId,
        productName: o.productName,
        productSlug: o.productSlug,
        currentPrice: o.currentPrice,
        originalPrice: o.originalPrice,
        discount: o.discount,
        offerScore: o.offerScore,
        sourceSlug: o.sourceSlug,
        sourceName: o.sourceName,
        affiliateUrl: campaignTrackingUrl,
        productUrl: `${APP_URL}/produto/${o.productSlug}`,
        imageUrl: o.imageUrl,
        isFreeShipping: o.isFreeShipping,
        rating: o.rating,
        couponText: o.couponText,
        position: i,
        campaignTrackingUrl,
      }
    })
  } catch (error) {
    log.error("offer-selector.query-failed", { error })
    return []
  }
}
