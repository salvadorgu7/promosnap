// ============================================
// WhatsApp Broadcast — Offer Selection Engine
// Selects and prioritizes offers for broadcast
// ============================================

import prisma from "@/lib/db/prisma"
import { logger } from "@/lib/logger"
import type { SelectedOffer, BroadcastChannel, BroadcastCampaign } from "./types"
import { buildBroadcastAffiliateUrl } from "./affiliate-builder"

const log = logger.child({ module: "wa-broadcast.offer-selector" })

// ============================================
// Quality gates (aligned with distribution engine)
// ============================================

const MIN_PRICE = 5
const MAX_DISCOUNT = 85
const MIN_RATING = 2

interface RawOffer {
  id: string
  currentPrice: number
  originalPrice: number | null
  offerScore: number
  affiliateUrl: string | null
  isFreeShipping: boolean
  couponText: string | null
  listing: {
    rating: number | null
    imageUrl: string | null
    product: {
      id: string
      name: string
      slug: string
      imageUrl: string | null
      categoryId: string | null
      category?: { slug: string } | null
    } | null
    source: {
      name: string
      slug: string
    }
  }
}

function failsQualityGate(o: RawOffer): boolean {
  const current = Number(o.currentPrice)
  const original = o.originalPrice ? Number(o.originalPrice) : null

  if (current < MIN_PRICE) return true

  if (original && original > current) {
    const discount = Math.round(((original - current) / original) * 100)
    if (discount >= MAX_DISCOUNT) return true
  }

  const rating = o.listing.rating
  if (rating !== null && rating !== undefined && Number(rating) <= MIN_RATING) return true

  if (!o.listing.product?.imageUrl) return true

  return false
}

// ============================================
// Selection engine
// ============================================

export interface SelectionOptions {
  channel: BroadcastChannel
  campaign?: BroadcastCampaign | null
  limit?: number
  excludeOfferIds?: string[]
}

/**
 * Select the best offers for a broadcast message.
 * Applies quality gates, channel filters, campaign rules, and deduplication.
 */
export async function selectOffers(options: SelectionOptions): Promise<SelectedOffer[]> {
  const { channel, campaign, excludeOfferIds = [] } = options
  const limit = campaign?.offerCount || channel.defaultOfferCount || 5
  const minScore = campaign?.minScore || 40
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.promosnap.com.br"

  // Build where clause
  const where: any = {
    isActive: true,
    offerScore: { gte: minScore },
    currentPrice: { gte: MIN_PRICE },
    listing: {
      status: "ACTIVE",
      OR: [
        { rating: null },
        { rating: { gt: MIN_RATING } },
      ],
      product: {
        status: "ACTIVE",
        hidden: false,
        imageUrl: { not: null },
      },
    },
  }

  // Exclude already-sent offers
  if (excludeOfferIds.length > 0) {
    where.id = { notIn: excludeOfferIds }
  }

  // Category filters (channel + campaign)
  const includeCategories = [
    ...channel.categoriesInclude,
    ...(campaign?.categorySlugs || []),
  ].filter(Boolean)

  const excludeCategories = channel.categoriesExclude.filter(Boolean)

  if (includeCategories.length > 0) {
    where.listing.product.category = { slug: { in: includeCategories } }
  } else if (excludeCategories.length > 0) {
    where.listing.product.category = {
      OR: [
        { slug: { notIn: excludeCategories } },
        { is: null },
      ],
    }
  }

  // Marketplace filters
  const includeMarketplaces = [
    ...channel.marketplacesInclude,
    ...(campaign?.marketplaces || []),
  ].filter(Boolean)

  const excludeMarketplaces = channel.marketplacesExclude.filter(Boolean)

  if (includeMarketplaces.length > 0) {
    where.listing.source = { slug: { in: includeMarketplaces } }
  } else if (excludeMarketplaces.length > 0) {
    where.listing.source = { slug: { notIn: excludeMarketplaces } }
  }

  // Ticket filters from campaign
  if (campaign?.minTicket) {
    where.currentPrice = { ...where.currentPrice, gte: Math.max(MIN_PRICE, campaign.minTicket) }
  }
  if (campaign?.maxTicket) {
    where.currentPrice = { ...where.currentPrice, lte: campaign.maxTicket }
  }

  // Min discount from campaign
  if (campaign?.minDiscount) {
    where.originalPrice = { not: null }
  }

  // Require affiliate
  if (campaign?.requireAffiliate !== false) {
    where.affiliateUrl = { not: null }
  }

  // Fetch more than needed for quality gate filtering
  const fetchLimit = limit * 4

  try {
    const offers = await prisma.offer.findMany({
      where,
      orderBy: [
        ...(campaign?.prioritizeTopSellers !== false
          ? [{ offerScore: "desc" as const }]
          : []),
        { currentPrice: "asc" as const },
      ],
      take: fetchLimit,
      include: {
        listing: {
          include: {
            product: { include: { category: true } },
            source: true,
          },
        },
      },
    }) as unknown as RawOffer[]

    // Apply quality gates
    let filtered = offers
      .filter(o => o.listing.product !== null && o.listing.source !== null)
      .filter(o => !failsQualityGate(o))

    // Apply min discount filter
    if (campaign?.minDiscount) {
      filtered = filtered.filter(o => {
        if (!o.originalPrice || o.originalPrice <= o.currentPrice) return false
        const discount = Math.round(((o.originalPrice - o.currentPrice) / o.originalPrice) * 100)
        return discount >= campaign.minDiscount!
      })
    }

    // Dedup: max 2 from same marketplace to ensure variety
    const marketplaceCounts: Record<string, number> = {}
    filtered = filtered.filter(o => {
      const mp = o.listing.source.slug
      marketplaceCounts[mp] = (marketplaceCounts[mp] || 0) + 1
      return marketplaceCounts[mp] <= 2
    })

    // Dedup: no duplicate products (same product name normalized)
    const seenProducts = new Set<string>()
    filtered = filtered.filter(o => {
      const key = o.listing.product!.name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40)
      if (seenProducts.has(key)) return false
      seenProducts.add(key)
      return true
    })

    // Take final slice
    const selected = filtered.slice(0, limit)

    // Map to SelectedOffer with broadcast tracking
    return selected.map((o, i) => {
      const product = o.listing.product!
      const source = o.listing.source
      const originalPrice = o.originalPrice ?? null
      const discount = originalPrice && originalPrice > o.currentPrice
        ? Math.round(((originalPrice - o.currentPrice) / originalPrice) * 100)
        : 0

      const baseUrl = o.affiliateUrl || `${APP_URL}/produto/${product.slug}`
      const campaignTrackingUrl = buildBroadcastAffiliateUrl(baseUrl, {
        channelId: channel.id,
        campaignId: campaign?.id || "manual",
        slotPosition: i,
      })

      return {
        offerId: o.id,
        productName: product.name,
        productSlug: product.slug,
        currentPrice: o.currentPrice,
        originalPrice,
        discount,
        offerScore: o.offerScore,
        sourceSlug: source.slug,
        sourceName: source.name,
        affiliateUrl: campaignTrackingUrl,
        productUrl: `${APP_URL}/produto/${product.slug}`,
        imageUrl: product.imageUrl,
        isFreeShipping: o.isFreeShipping,
        rating: o.listing.rating,
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
