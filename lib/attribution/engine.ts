// ============================================
// ATTRIBUTION ENGINE — DB-persisted clickout attribution
// ============================================
// Migrated from in-memory Map to Prisma-backed persistence.
// Attribution context is now stored directly on the Clickout record.

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { getSourceProfile } from '@/lib/config/source-profiles'

// ─── Types ──────────────────────────────────────────────────────────────────

export type PageType =
  | 'home'
  | 'search'
  | 'product'
  | 'category'
  | 'brand'
  | 'offer'
  | 'guide'
  | 'comparison'
  | 'email'
  | 'channel'

export type ChannelOrigin =
  | 'direct'
  | 'telegram'
  | 'whatsapp'
  | 'email'
  | 'slack'
  | 'discord'
  | 'referral'

export interface AttributionContext {
  source: string
  category: string
  productId: string
  pageType: PageType
  campaignId?: string
  bannerId?: string
  channelOrigin?: ChannelOrigin
  referralCode?: string
}

export interface AttributionEntry {
  clickoutId: string
  context: Partial<AttributionContext>
  timestamp: string
}

export interface AttributionSummary {
  bySource: Record<string, number>
  byPageType: Record<string, number>
  byChannel: Record<string, number>
  byCampaign: Record<string, number>
  byBanner: Record<string, number>
  total: number
  period: string
}

export interface AttributionFunnelStep {
  stage: string
  count: number
  byDimension?: Record<string, number>
}

export interface AttributionFunnel {
  steps: AttributionFunnelStep[]
  period: string
}

// ─── DB-Persisted Attribution ─────────────────────────────────────────────

/**
 * Enrich a clickout with attribution context.
 * Writes directly to the Clickout record in DB (fire-and-forget safe).
 */
export function enrichClickoutAttribution(
  clickoutId: string,
  context: Partial<AttributionContext>
): void {
  // Fire-and-forget update — don't block the clickout redirect
  prisma.clickout
    .update({
      where: { id: clickoutId },
      data: {
        pageType: context.pageType || null,
        channelOrigin: context.channelOrigin || null,
        campaignId: context.campaignId || null,
        bannerId: context.bannerId || null,
        productId: context.productId || null,
        referralCode: context.referralCode || null,
      },
    })
    .catch((err) => {
      logger.warn('attribution.enrich-failed', {
        clickoutId,
        error: String(err),
      })
    })
}

/**
 * Get attribution data for a specific clickout.
 */
export async function getAttributionForClickout(
  clickoutId: string
): Promise<AttributionEntry | null> {
  try {
    const clickout = await prisma.clickout.findUnique({
      where: { id: clickoutId },
      select: {
        id: true,
        sourceSlug: true,
        categorySlug: true,
        pageType: true,
        channelOrigin: true,
        campaignId: true,
        bannerId: true,
        productId: true,
        referralCode: true,
        clickedAt: true,
      },
    })
    if (!clickout) return null

    return {
      clickoutId: clickout.id,
      context: {
        source: clickout.sourceSlug || undefined,
        category: clickout.categorySlug || undefined,
        productId: clickout.productId || undefined,
        pageType: (clickout.pageType as PageType) || undefined,
        channelOrigin: (clickout.channelOrigin as ChannelOrigin) || undefined,
        campaignId: clickout.campaignId || undefined,
        bannerId: clickout.bannerId || undefined,
        referralCode: clickout.referralCode || undefined,
      },
      timestamp: clickout.clickedAt.toISOString(),
    }
  } catch {
    return null
  }
}

/**
 * Get all attribution entries from DB, optionally filtered by days.
 */
export async function getAllAttributionEntries(days?: number): Promise<AttributionEntry[]> {
  try {
    const where: any = {}
    if (days) {
      where.clickedAt = { gte: new Date(Date.now() - days * 86400000) }
    }

    const clickouts = await prisma.clickout.findMany({
      where,
      select: {
        id: true,
        sourceSlug: true,
        categorySlug: true,
        pageType: true,
        channelOrigin: true,
        campaignId: true,
        bannerId: true,
        productId: true,
        referralCode: true,
        clickedAt: true,
      },
      orderBy: { clickedAt: 'desc' },
      take: 10000, // Safety limit
    })

    return clickouts.map((c) => ({
      clickoutId: c.id,
      context: {
        source: c.sourceSlug || undefined,
        category: c.categorySlug || undefined,
        productId: c.productId || undefined,
        pageType: (c.pageType as PageType) || undefined,
        channelOrigin: (c.channelOrigin as ChannelOrigin) || undefined,
        campaignId: c.campaignId || undefined,
        bannerId: c.bannerId || undefined,
        referralCode: c.referralCode || undefined,
      },
      timestamp: c.clickedAt.toISOString(),
    }))
  } catch {
    return []
  }
}

/**
 * Aggregate attribution data by source, pageType, channel, campaign.
 * Uses efficient SQL GROUP BY instead of loading all records.
 */
export async function getAttributionSummary(days = 7): Promise<AttributionSummary> {
  const since = new Date(Date.now() - days * 86400000)

  try {
    const [bySourceRaw, byPageTypeRaw, byChannelRaw, byCampaignRaw, byBannerRaw, totalRaw] =
      await Promise.all([
        prisma.$queryRaw<Array<{ key: string; cnt: bigint }>>`
          SELECT "sourceSlug" as key, COUNT(*) as cnt FROM "clickouts"
          WHERE "clickedAt" >= ${since} AND "sourceSlug" IS NOT NULL
          GROUP BY "sourceSlug" ORDER BY cnt DESC
        `,
        prisma.$queryRaw<Array<{ key: string; cnt: bigint }>>`
          SELECT "pageType" as key, COUNT(*) as cnt FROM "clickouts"
          WHERE "clickedAt" >= ${since} AND "pageType" IS NOT NULL
          GROUP BY "pageType" ORDER BY cnt DESC
        `,
        prisma.$queryRaw<Array<{ key: string; cnt: bigint }>>`
          SELECT "channelOrigin" as key, COUNT(*) as cnt FROM "clickouts"
          WHERE "clickedAt" >= ${since} AND "channelOrigin" IS NOT NULL
          GROUP BY "channelOrigin" ORDER BY cnt DESC
        `,
        prisma.$queryRaw<Array<{ key: string; cnt: bigint }>>`
          SELECT "campaignId" as key, COUNT(*) as cnt FROM "clickouts"
          WHERE "clickedAt" >= ${since} AND "campaignId" IS NOT NULL
          GROUP BY "campaignId" ORDER BY cnt DESC
        `,
        prisma.$queryRaw<Array<{ key: string; cnt: bigint }>>`
          SELECT "bannerId" as key, COUNT(*) as cnt FROM "clickouts"
          WHERE "clickedAt" >= ${since} AND "bannerId" IS NOT NULL
          GROUP BY "bannerId" ORDER BY cnt DESC
        `,
        prisma.clickout.count({ where: { clickedAt: { gte: since } } }),
      ])

    const toRecord = (rows: Array<{ key: string; cnt: bigint }>): Record<string, number> =>
      Object.fromEntries(rows.map((r) => [r.key, Number(r.cnt)]))

    return {
      bySource: toRecord(bySourceRaw),
      byPageType: toRecord(byPageTypeRaw),
      byChannel: toRecord(byChannelRaw),
      byCampaign: toRecord(byCampaignRaw),
      byBanner: toRecord(byBannerRaw),
      total: totalRaw,
      period: `${days}d`,
    }
  } catch (err) {
    logger.error('attribution.summary-failed', { error: String(err) })
    return {
      bySource: {},
      byPageType: {},
      byChannel: {},
      byCampaign: {},
      byBanner: {},
      total: 0,
      period: `${days}d`,
    }
  }
}

/**
 * Full attribution funnel: page views -> clicks -> clickouts -> estimated revenue.
 * Uses real DB data with per-source revenue estimation.
 */
export async function getAttributionFunnel(): Promise<AttributionFunnel> {
  try {
    const since = new Date(Date.now() - 7 * 86400000)

    const [bySourceRaw, byPageTypeRaw, totalClickouts] = await Promise.all([
      prisma.$queryRaw<Array<{ key: string; cnt: bigint }>>`
        SELECT "sourceSlug" as key, COUNT(*) as cnt FROM "clickouts"
        WHERE "clickedAt" >= ${since} AND "sourceSlug" IS NOT NULL
        GROUP BY "sourceSlug"
      `,
      prisma.$queryRaw<Array<{ key: string; cnt: bigint }>>`
        SELECT "pageType" as key, COUNT(*) as cnt FROM "clickouts"
        WHERE "clickedAt" >= ${since} AND "pageType" IS NOT NULL
        GROUP BY "pageType"
      `,
      prisma.clickout.count({ where: { clickedAt: { gte: since } } }),
    ])

    const byPageType = Object.fromEntries(
      byPageTypeRaw.map((r) => [r.key, Number(r.cnt)])
    )
    const bySource = Object.fromEntries(
      bySourceRaw.map((r) => [r.key, Number(r.cnt)])
    )

    // Estimate page views as 20x clickouts (typical 5% CTR)
    const estimatedPageViews = totalClickouts * 20
    const estimatedClicks = totalClickouts * 3

    // Calculate revenue per source using real profiles
    const revenueBySource: Record<string, number> = {}
    let totalRevenue = 0
    for (const [slug, clicks] of Object.entries(bySource)) {
      const profile = getSourceProfile(slug)
      const rev = Math.round(clicks * profile.conversionRate * profile.avgTicket * profile.commissionRate)
      revenueBySource[slug] = rev
      totalRevenue += rev
    }

    return {
      steps: [
        {
          stage: 'page_views_estimado',
          count: estimatedPageViews,
          byDimension: Object.fromEntries(
            Object.entries(byPageType).map(([k, v]) => [k, v * 20])
          ),
        },
        {
          stage: 'clicks_estimado',
          count: estimatedClicks,
          byDimension: Object.fromEntries(
            Object.entries(byPageType).map(([k, v]) => [k, v * 3])
          ),
        },
        {
          stage: 'clickouts',
          count: totalClickouts,
          byDimension: byPageType,
        },
        {
          stage: 'revenue_estimado',
          count: totalRevenue,
          byDimension: revenueBySource,
        },
      ],
      period: '7d',
    }
  } catch (err) {
    logger.error('attribution.funnel-failed', { error: String(err) })
    return {
      steps: [
        { stage: 'page_views_estimado', count: 0 },
        { stage: 'clicks_estimado', count: 0 },
        { stage: 'clickouts', count: 0 },
        { stage: 'revenue_estimado', count: 0 },
      ],
      period: '7d',
    }
  }
}
