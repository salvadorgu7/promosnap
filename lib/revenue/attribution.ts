// ============================================================================
// Revenue Attribution — breakdown by rail, channel, page, and product
// ============================================================================

import prisma from '@/lib/db/prisma'
import { getSourceProfile } from '@/lib/config/source-profiles'
import { logger } from '@/lib/logger'

// ── Types ───────────────────────────────────────────────────────────────────

export interface AttributionRow {
  dimension: string
  clickouts: number
  estimatedConversions: number
  estimatedGMV: number
  estimatedRevenue: number
}

export interface AttributionReport {
  period: string
  byRail: AttributionRow[]
  byChannel: AttributionRow[]
  byPage: AttributionRow[]
  topProducts: Array<{
    productId: string
    productName: string
    productSlug: string
    clickouts: number
    estimatedRevenue: number
  }>
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function estimateFromClickouts(
  rows: Array<{ dimension: string; source: string; clicks: number; avgPrice: number }>
): AttributionRow[] {
  const grouped = new Map<string, AttributionRow>()

  for (const row of rows) {
    const profile = getSourceProfile(row.source)
    const conversions = Math.round(row.clicks * profile.conversionRate)
    const gmv = conversions * (row.avgPrice || profile.avgTicket)
    const revenue = gmv * profile.commissionRate

    const existing = grouped.get(row.dimension) || {
      dimension: row.dimension,
      clickouts: 0,
      estimatedConversions: 0,
      estimatedGMV: 0,
      estimatedRevenue: 0,
    }

    existing.clickouts += row.clicks
    existing.estimatedConversions += conversions
    existing.estimatedGMV += gmv
    existing.estimatedRevenue += revenue
    grouped.set(row.dimension, existing)
  }

  return Array.from(grouped.values()).sort((a, b) => b.estimatedRevenue - a.estimatedRevenue)
}

// ── Main Functions ──────────────────────────────────────────────────────────

export async function getRevenueAttribution(days = 30): Promise<AttributionReport> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  try {
    const [byRailRaw, byChannelRaw, byPageRaw, topProducts] = await Promise.all([
      // By Rail
      prisma.$queryRaw<Array<{ dimension: string; source: string; clicks: number; avgPrice: number }>>`
        SELECT
          COALESCE(c."railSource", 'unknown') as dimension,
          COALESCE(c."sourceSlug", 'unknown') as source,
          COUNT(*)::int as clicks,
          AVG(o."currentPrice")::float as "avgPrice"
        FROM clickouts c
        JOIN offers o ON c."offerId" = o.id
        WHERE c."clickedAt" >= ${since}
        GROUP BY c."railSource", c."sourceSlug"
      `,

      // By Channel
      prisma.$queryRaw<Array<{ dimension: string; source: string; clicks: number; avgPrice: number }>>`
        SELECT
          COALESCE(c."channelOrigin", 'direct') as dimension,
          COALESCE(c."sourceSlug", 'unknown') as source,
          COUNT(*)::int as clicks,
          AVG(o."currentPrice")::float as "avgPrice"
        FROM clickouts c
        JOIN offers o ON c."offerId" = o.id
        WHERE c."clickedAt" >= ${since}
        GROUP BY c."channelOrigin", c."sourceSlug"
      `,

      // By Page
      prisma.$queryRaw<Array<{ dimension: string; source: string; clicks: number; avgPrice: number }>>`
        SELECT
          COALESCE(c."pageType", 'unknown') as dimension,
          COALESCE(c."sourceSlug", 'unknown') as source,
          COUNT(*)::int as clicks,
          AVG(o."currentPrice")::float as "avgPrice"
        FROM clickouts c
        JOIN offers o ON c."offerId" = o.id
        WHERE c."clickedAt" >= ${since}
        GROUP BY c."pageType", c."sourceSlug"
      `,

      // Top Products
      prisma.$queryRaw<Array<{
        productId: string; productName: string; productSlug: string;
        source: string; clicks: number; avgPrice: number
      }>>`
        SELECT
          p.id as "productId", p.name as "productName", p.slug as "productSlug",
          COALESCE(c."sourceSlug", 'unknown') as source,
          COUNT(c.id)::int as clicks,
          AVG(o."currentPrice")::float as "avgPrice"
        FROM clickouts c
        JOIN offers o ON c."offerId" = o.id
        JOIN listings l ON o."listingId" = l.id
        JOIN products p ON l."productId" = p.id
        WHERE c."clickedAt" >= ${since}
        GROUP BY p.id, p.name, p.slug, c."sourceSlug"
        ORDER BY clicks DESC
        LIMIT 30
      `,
    ])

    // Process top products
    const productMap = new Map<string, { productId: string; productName: string; productSlug: string; clickouts: number; estimatedRevenue: number }>()
    for (const row of topProducts) {
      const profile = getSourceProfile(row.source)
      const conversions = Math.round(row.clicks * profile.conversionRate)
      const revenue = conversions * (row.avgPrice || profile.avgTicket) * profile.commissionRate

      const existing = productMap.get(row.productId) || {
        productId: row.productId,
        productName: row.productName,
        productSlug: row.productSlug,
        clickouts: 0,
        estimatedRevenue: 0,
      }
      existing.clickouts += row.clicks
      existing.estimatedRevenue += revenue
      productMap.set(row.productId, existing)
    }

    return {
      period: `${days}d`,
      byRail: estimateFromClickouts(byRailRaw),
      byChannel: estimateFromClickouts(byChannelRaw),
      byPage: estimateFromClickouts(byPageRaw),
      topProducts: Array.from(productMap.values())
        .sort((a, b) => b.estimatedRevenue - a.estimatedRevenue)
        .slice(0, 20),
    }
  } catch (err) {
    logger.error('revenue-attribution.failed', { error: err })
    return { period: `${days}d`, byRail: [], byChannel: [], byPage: [], topProducts: [] }
  }
}
