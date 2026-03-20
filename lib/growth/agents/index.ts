/**
 * Concrete Agent Executors — each agent detects opportunities and executes actions.
 *
 * Agents registered here are run by the growth-daily cron via runAllAgents().
 */

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import type { GrowthAction } from '../command-center'
import type { AgentExecutor } from '../agent-executor'

const log = logger.child({ module: 'agents' })
const now = () => new Date()

// ── Opportunity Agent ──────────────────────────────────────────────────────

export const opportunityAgent: AgentExecutor = {
  agentName: 'opportunity-agent',

  async detect(): Promise<GrowthAction[]> {
    const actions: GrowthAction[] = []
    const since = new Date(Date.now() - 24 * 3_600_000)

    // Find offers with significant recent price drops
    const drops = await prisma.$queryRaw<Array<{
      id: string; currentPrice: number; productId: string; offerScore: number
    }>>`
      SELECT o.id, o."currentPrice", o."productId", o."offerScore"
      FROM offers o
      JOIN price_snapshots ps ON ps."offerId" = o.id
      WHERE o."isActive" = true
        AND o."affiliateUrl" IS NOT NULL
        AND o."affiliateUrl" != '#'
        AND ps."capturedAt" < ${since}
        AND ps.price > o."currentPrice" * 1.10
      LIMIT 20
    `.catch(() => [])

    for (const drop of drops) {
      actions.push({
        id: `opp-${drop.id}`,
        agentName: 'opportunity-agent',
        actionType: 'promote_price_drop',
        description: `Promover queda de preço da oferta ${drop.id}`,
        priorityScore: Math.min(100, (drop.offerScore || 50) + 20),
        impactScore: 70,
        confidenceScore: 85,
        status: 'suggested',
        metadata: {
          offerId: drop.id,
          productId: drop.productId,
          offerScore: drop.offerScore,
          affiliateUrl: 'present',
          imageUrl: 'present',
          discount: 10,
        },
        createdAt: now(),
      })
    }

    // Find high-engagement products with zero clickouts
    const highEngNoClick = await prisma.product.findMany({
      where: {
        popularityScore: { gte: 50 },
        listings: { some: { offers: { none: {} } } },
      },
      select: { id: true, name: true, popularityScore: true },
      take: 5,
    }).catch(() => [])

    for (const prod of highEngNoClick) {
      actions.push({
        id: `opp-noclick-${prod.id}`,
        agentName: 'opportunity-agent',
        actionType: 'boost_visibility',
        description: `Produto popular sem clickouts: ${prod.name?.slice(0, 40)}`,
        priorityScore: 60,
        impactScore: 50,
        confidenceScore: 70,
        status: 'suggested',
        metadata: { productId: prod.id, score: prod.popularityScore },
        createdAt: now(),
      })
    }

    return actions
  },

  async execute(action) {
    // promote_price_drop → highlight in editorial block
    if (action.actionType === 'promote_price_drop') {
      const offerId = action.metadata.offerId as string
      try {
        // Update offer score boost for merchandising
        await prisma.offer.update({
          where: { id: offerId },
          data: { offerScore: { increment: 5 } },
        })
        return { success: true, result: { offerId, boosted: true } }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
    return { success: true, result: { action: action.actionType, noted: true } }
  },
}

// ── Ranking Agent ──────────────────────────────────────────────────────────

export const rankingAgent: AgentExecutor = {
  agentName: 'ranking-agent',

  async detect(): Promise<GrowthAction[]> {
    const actions: GrowthAction[] = []

    // Check if hero slot needs refresh
    const heroBlock = await prisma.editorialBlock.findFirst({
      where: { slug: 'hero', status: 'PUBLISHED' },
      select: { updatedAt: true },
    }).catch(() => null)

    const hoursSinceUpdate = heroBlock
      ? (Date.now() - heroBlock.updatedAt.getTime()) / 3_600_000
      : 999

    if (hoursSinceUpdate > 12) {
      actions.push({
        id: 'ranking-hero-refresh',
        agentName: 'ranking-agent',
        actionType: 'refresh_hero_slot',
        description: `Hero slot não atualizado há ${Math.round(hoursSinceUpdate)}h`,
        priorityScore: 75,
        impactScore: 80,
        confidenceScore: 90,
        status: 'suggested',
        metadata: { hoursSinceUpdate, decisionValue: 80 },
        createdAt: now(),
      })
    }

    return actions
  },

  async execute(action) {
    if (action.actionType === 'refresh_hero_slot') {
      try {
        const { autoFillHeroSlot } = await import('@/lib/automation/auto-merchandising')
        const result = await autoFillHeroSlot()
        return { success: true, result: { slot: 'hero', refreshed: true } }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
    return { success: true }
  },
}

// ── Quality Agent ──────────────────────────────────────────────────────────

export const qualityAgent: AgentExecutor = {
  agentName: 'quality-agent',

  async detect(): Promise<GrowthAction[]> {
    const actions: GrowthAction[] = []

    // Find active offers without affiliate URL
    const noAffiliate = await prisma.offer.count({
      where: { isActive: true, OR: [{ affiliateUrl: null }, { affiliateUrl: '#' }] },
    }).catch(() => 0)

    if (noAffiliate > 0) {
      actions.push({
        id: 'quality-no-affiliate',
        agentName: 'quality-agent',
        actionType: 'alert_missing_affiliate',
        description: `${noAffiliate} ofertas ativas sem link de afiliado`,
        priorityScore: 90,
        impactScore: 85,
        confidenceScore: 100,
        status: 'suggested',
        metadata: { count: noAffiliate },
        createdAt: now(),
      })
    }

    // Find products without images
    const noImage = await prisma.product.count({
      where: { imageUrl: null, hidden: false },
    }).catch(() => 0)

    if (noImage > 5) {
      actions.push({
        id: 'quality-no-image',
        agentName: 'quality-agent',
        actionType: 'alert_missing_images',
        description: `${noImage} produtos sem imagem`,
        priorityScore: 60,
        impactScore: 40,
        confidenceScore: 100,
        status: 'suggested',
        metadata: { count: noImage },
        createdAt: now(),
      })
    }

    return actions
  },

  async execute(action) {
    if (action.actionType === 'alert_missing_affiliate') {
      // Deactivate offers without affiliate — they waste impressions
      const updated = await prisma.offer.updateMany({
        where: { isActive: true, OR: [{ affiliateUrl: null }, { affiliateUrl: '#' }] },
        data: { isActive: false },
      }).catch(() => ({ count: 0 }))

      log.info('quality.deactivated-no-affiliate', { count: updated.count })
      return { success: true, result: { deactivated: updated.count } }
    }

    if (action.actionType === 'alert_missing_images') {
      // Trigger backfill job
      try {
        const { backfillImages } = await import('@/lib/jobs/backfill-images')
        const result = await backfillImages()
        return { success: true, result: { backfilled: result } }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }

    return { success: true }
  },
}

// ── Alert Agent ────────────────────────────────────────────────────────────

export const alertAgent: AgentExecutor = {
  agentName: 'alert-agent',

  async detect(): Promise<GrowthAction[]> {
    const actions: GrowthAction[] = []

    // Count unfired price alerts
    const pendingAlerts = await prisma.priceAlert.count({
      where: { isActive: true, triggeredAt: null },
    }).catch(() => 0)

    if (pendingAlerts > 0) {
      actions.push({
        id: 'alert-check-triggers',
        agentName: 'alert-agent',
        actionType: 'check_price_alerts',
        description: `${pendingAlerts} alertas de preço ativos para verificar`,
        priorityScore: 80,
        impactScore: 75,
        confidenceScore: 95,
        status: 'suggested',
        metadata: { pendingAlerts, dropPercent: 5 },
        createdAt: now(),
      })
    }

    return actions
  },

  async execute(action) {
    if (action.actionType === 'check_price_alerts') {
      try {
        const { runCrmEngineJob } = await import('@/lib/jobs/crm-engine')
        const result = await runCrmEngineJob()
        return { success: true, result: { fired: result } }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
    return { success: true }
  },
}

// ── Calendar Agent ─────────────────────────────────────────────────────────

export const calendarAgent: AgentExecutor = {
  agentName: 'calendar-agent',

  async detect(): Promise<GrowthAction[]> {
    const actions: GrowthAction[] = []
    const { getCampaignsToPrep, getActiveCampaigns } = await import('../promo-calendar')

    const toPrep = getCampaignsToPrep(3)
    for (const campaign of toPrep) {
      // Check if landing exists
      const landing = await prisma.editorialBlock.findFirst({
        where: { slug: campaign.slug },
      }).catch(() => null)

      const products = await prisma.product.count({
        where: { category: { slug: { in: campaign.categories } } },
      }).catch(() => 0)

      actions.push({
        id: `cal-${campaign.slug}`,
        agentName: 'calendar-agent',
        actionType: 'prepare_campaign',
        description: `Preparar campanha: ${campaign.name}`,
        priorityScore: Math.min(100, 80),
        impactScore: 80,
        confidenceScore: 85,
        status: 'suggested',
        metadata: {
          campaignSlug: campaign.slug,
          hasLanding: !!landing,
          productCount: products,
        },
        createdAt: now(),
      })
    }

    return actions
  },

  async execute(action) {
    if (action.actionType === 'prepare_campaign') {
      try {
        const { generateCampaignLandings } = await import('@/lib/jobs/campaign-landings')
        const result = await generateCampaignLandings()
        return { success: true, result: { landings: result } }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    }
    return { success: true }
  },
}

// ── Anomaly Agent ──────────────────────────────────────────────────────────

export const anomalyAgent: AgentExecutor = {
  agentName: 'anomaly-agent',

  async detect(): Promise<GrowthAction[]> {
    const actions: GrowthAction[] = []
    const yesterday = new Date(Date.now() - 86_400_000)
    const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000)

    const [clickoutsYesterday, clickoutsTwoDaysAgo] = await Promise.all([
      prisma.clickout.count({ where: { clickedAt: { gte: yesterday } } }),
      prisma.clickout.count({ where: { clickedAt: { gte: twoDaysAgo, lt: yesterday } } }),
    ]).catch(() => [0, 0])

    if (clickoutsTwoDaysAgo > 0) {
      const changeRate = ((clickoutsYesterday - clickoutsTwoDaysAgo) / clickoutsTwoDaysAgo) * 100
      if (changeRate < -50) {
        actions.push({
          id: 'anomaly-clickout-drop',
          agentName: 'anomaly-agent',
          actionType: 'alert_clickout_drop',
          description: `Clickouts caíram ${Math.abs(Math.round(changeRate))}%`,
          priorityScore: 95,
          impactScore: 90,
          confidenceScore: 80,
          status: 'suggested',
          metadata: { changeRate, yesterday: clickoutsYesterday, twoDaysAgo: clickoutsTwoDaysAgo },
          createdAt: now(),
        })
      }
    }

    return actions
  },

  async execute(action) {
    // Anomaly actions are informational — log and mark done
    log.warn('anomaly.detected', { action: action.actionType, metadata: action.metadata })
    return { success: true, result: { logged: true } }
  },
}

// ── Export all executors ────────────────────────────────────────────────────

export const ALL_AGENTS: AgentExecutor[] = [
  opportunityAgent,
  rankingAgent,
  qualityAgent,
  alertAgent,
  calendarAgent,
  anomalyAgent,
]
