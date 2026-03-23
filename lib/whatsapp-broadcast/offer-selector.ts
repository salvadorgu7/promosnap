// ============================================
// WhatsApp Broadcast — Offer Selection Engine
// DELEGATES to Unified Commerce Engine (lib/commerce/)
// Enhanced with: click demand signals, price-drop re-send, score 90+ detection
// ============================================

import { logger } from "@/lib/logger"
import prisma from "@/lib/db/prisma"
import { Prisma } from "@prisma/client"
import { retrieveOffers } from "@/lib/commerce/retrieval"
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
  /** IDs excluídos do dedup mas permitidos por price drop */
  resentableOfferIds?: string[]
}

export interface SelectionResult {
  offers: SelectedOffer[]
  /** Ofertas com score 90+ encontradas (para alerta urgente) */
  exceptionalOffers: SelectedOffer[]
  /** Categorias populares usadas como boost */
  demandCategories: string[]
}

/**
 * Select the best offers for a broadcast message.
 * Enhanced pipeline:
 * 1. Query click demand signals (popular categories last 7d)
 * 2. Delegate to Commerce Engine with demand-boosted categories
 * 3. Allow re-send of offers with price drops
 * 4. Detect exceptional offers (score 90+) for solo urgent sends
 */
export async function selectOffers(options: SelectionOptions): Promise<SelectedOffer[]> {
  const result = await selectOffersEnhanced(options)
  return result.offers
}

/**
 * Enhanced selection that also returns exceptional offers and demand signals.
 */
export async function selectOffersEnhanced(options: SelectionOptions): Promise<SelectionResult> {
  const { channel, campaign, excludeOfferIds = [], resentableOfferIds = [] } = options
  const limit = campaign?.offerCount || channel.defaultOfferCount || 5
  const minScore = campaign?.minScore || 40
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.promosnap.com.br"

  // ── 1. Query click demand signals ─────────────────────────────────
  const demandCategories = await getTopClickedCategories(7)

  // Merge category filters: channel config + campaign + demand signals
  const configCategories = [
    ...channel.categoriesInclude,
    ...(campaign?.categorySlugs || []),
  ].filter(Boolean)

  // If no explicit category filter, boost popular categories from clicks
  // Otherwise keep the explicit filter (config takes priority)
  const categories = configCategories.length > 0
    ? configCategories
    : demandCategories.slice(0, 5)

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

  // ── 2. Adjust exclude list: remove resentable offers (price dropped) ──
  const effectiveExclude = excludeOfferIds.filter(id => !resentableOfferIds.includes(id))

  try {
    // ── 3. Delegate to Unified Commerce Engine ──────────────────────
    // Fetch extra (limit * 3) to have room after quality gates + dedup + exceptional detection
    // maxPerMarketplace scales with limit to avoid capping too early
    const maxPerMp = Math.max(Math.ceil(limit / 2), 4)
    const retrieved = await retrieveOffers({
      channel: "whatsapp",
      limit: Math.max(limit * 3, 15),
      excludeOfferIds: effectiveExclude,
      categories: categories.length > 0 ? categories : undefined,
      marketplaces: marketplaces.length > 0 ? marketplaces : undefined,
      budget,
      minScore,
      minDiscount: campaign?.minDiscount ?? undefined,
      requireAffiliate: campaign?.requireAffiliate !== false,
      requireImage: true,
      maxPerMarketplace: maxPerMp,
    })

    // ── 4. Map to SelectedOffer with broadcast-specific tracking ────
    const allOffers = retrieved.map((o, i) => {
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

    // ── 5. Detect exceptional offers (score 90+) ────────────────────
    const exceptionalOffers = allOffers.filter(o => o.offerScore >= 90)

    // ── 6. Mark re-sent offers (price dropped) with a boost ─────────
    const resentableSet = new Set(resentableOfferIds)
    const priceDropOffers = allOffers.filter(o => resentableSet.has(o.offerId))

    if (priceDropOffers.length > 0) {
      log.info("offer-selector.price-drop-resends", {
        count: priceDropOffers.length,
        offers: priceDropOffers.map(o => o.productName.slice(0, 40)),
      })
    }

    // ── 7. Final selection: take top N by score ─────────────────────
    const finalOffers = allOffers.slice(0, limit)

    // Re-index positions
    finalOffers.forEach((o, i) => { o.position = i })

    log.info("offer-selector.selected", {
      requested: limit,
      fromCommerceEngine: allOffers.length,
      selected: finalOffers.length,
      exceptional: exceptionalOffers.length,
      priceDropResends: priceDropOffers.length,
      excludedByDedup: excludeOfferIds.length,
      resentable: resentableOfferIds.length,
      maxPerMp,
      demandCategories: demandCategories.slice(0, 3),
    })

    return {
      offers: finalOffers,
      exceptionalOffers,
      demandCategories,
    }
  } catch (error) {
    log.error("offer-selector.query-failed", { error })
    return { offers: [], exceptionalOffers: [], demandCategories: [] }
  }
}

// ============================================
// Click demand signals
// ============================================

/**
 * Get top clicked categories in the last N days.
 * Used to boost offer selection towards what users are interested in.
 */
async function getTopClickedCategories(days: number = 7): Promise<string[]> {
  try {
    const since = new Date(Date.now() - days * 86400000)

    const rows = await prisma.$queryRaw<Array<{ category: string; clicks: bigint }>>(
      Prisma.sql`
        SELECT "categorySlug" as category, COUNT(*) as clicks
        FROM "clickouts"
        WHERE "clickedAt" > ${since} AND "categorySlug" IS NOT NULL
        GROUP BY "categorySlug"
        ORDER BY clicks DESC
        LIMIT 10
      `
    )

    const categories = rows.map(r => r.category).filter(Boolean)
    if (categories.length > 0) {
      log.debug("offer-selector.demand-categories", { categories, days })
    }
    return categories
  } catch (err) {
    log.warn("offer-selector.demand-query-failed", { error: String(err) })
    return []
  }
}
