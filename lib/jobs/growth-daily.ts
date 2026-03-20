/**
 * Growth Daily Ritual — automated daily operations for the growth engine.
 *
 * Runs as a cron job and executes:
 * 1. Generate daily briefing
 * 2. Detect opportunities (price drops, trending, high-intent)
 * 3. Check campaign calendar (prep/activate/deactivate)
 * 4. Auto-fill merchandising slots
 * 5. Generate distribution suggestions
 * 6. Anomaly detection
 */

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { generateDailyBriefing } from '@/lib/growth/command-center'
import { getActiveCampaigns, getCampaignsToPrep } from '@/lib/growth/promo-calendar'

export async function runGrowthDaily(): Promise<{
  briefing: Awaited<ReturnType<typeof generateDailyBriefing>>
  activeCampaigns: number
  campaignsToPrep: number
  opportunitiesDetected: number
  slotsRefreshed: number
  anomalies: string[]
  agentSummary: { agents: number; executed: number; succeeded: number; failed: number }
}> {
  logger.info('[GROWTH-DAILY] Starting daily growth ritual')

  // 1. Generate daily briefing
  const briefing = await generateDailyBriefing()

  // 2. Check campaign calendar
  const active = getActiveCampaigns()
  const toPrep = getCampaignsToPrep(4)

  // 3. Detect opportunities — offers that dropped significantly
  const opportunitiesDetected = await detectOpportunities()

  // 4. Auto-fill merchandising slots
  let slotsRefreshed = 0
  try {
    const { autoFillHeroSlot, autoFillCarousel, autoFillDealOfDay, autoFillBanners } = await import('@/lib/automation/auto-merchandising')
    await autoFillHeroSlot()
    await autoFillCarousel()
    await autoFillDealOfDay()
    await autoFillBanners()
    slotsRefreshed = 4
  } catch (err) {
    logger.warn('[GROWTH-DAILY] Auto-merchandising failed', { err })
  }

  // 5. Run autonomous agents — detect, auto-approve, execute
  let agentSummary = { agents: 0, executed: 0, succeeded: 0, failed: 0 }
  try {
    const { runAllAgents } = await import('@/lib/growth/agent-executor')
    const { ALL_AGENTS } = await import('@/lib/growth/agents')
    const summaries = await runAllAgents(ALL_AGENTS)
    agentSummary = {
      agents: summaries.length,
      executed: summaries.reduce((s, a) => s + a.executed, 0),
      succeeded: summaries.reduce((s, a) => s + a.succeeded, 0),
      failed: summaries.reduce((s, a) => s + a.failed, 0),
    }
  } catch (err) {
    logger.warn('[GROWTH-DAILY] Agent execution failed', { err })
  }

  // 6. Anomaly detection (legacy — anomaly-agent also does this now)
  const anomalies: string[] = []
  try {
    const now = new Date()
    const yesterday = new Date(now.getTime() - 86_400_000)
    const twoDaysAgo = new Date(now.getTime() - 2 * 86_400_000)

    const [clickoutsYesterday, clickoutsTwoDaysAgo] = await Promise.all([
      prisma.clickout.count({ where: { clickedAt: { gte: yesterday, lt: now } } }),
      prisma.clickout.count({ where: { clickedAt: { gte: twoDaysAgo, lt: yesterday } } }),
    ])

    if (clickoutsTwoDaysAgo > 0) {
      const changeRate = ((clickoutsYesterday - clickoutsTwoDaysAgo) / clickoutsTwoDaysAgo) * 100
      if (changeRate < -50) {
        anomalies.push(`Clickouts caíram ${Math.abs(Math.round(changeRate))}% ontem vs anteontem`)
      }
      if (changeRate > 200) {
        anomalies.push(`Clickouts subiram ${Math.round(changeRate)}% ontem vs anteontem — verificar se é real`)
      }
    }
  } catch { /* non-blocking */ }

  const result = {
    briefing,
    activeCampaigns: active.length,
    campaignsToPrep: toPrep.length,
    opportunitiesDetected,
    slotsRefreshed,
    anomalies,
    agentSummary,
  }

  logger.info('[GROWTH-DAILY] Daily growth ritual complete', {
    activeCampaigns: result.activeCampaigns,
    campaignsToPrep: result.campaignsToPrep,
    opportunities: result.opportunitiesDetected,
    anomalies: result.anomalies.length,
    agents: agentSummary,
  })

  return result
}

// ============================================
// OPPORTUNITY DETECTION
// ============================================

async function detectOpportunities(): Promise<number> {
  try {
    // Find offers with significant price drops in last 24h
    const since = new Date(Date.now() - 24 * 3_600_000)

    const drops = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT DISTINCT o.id
      FROM offers o
      JOIN price_snapshots ps ON ps."offerId" = o.id
      WHERE o."isActive" = true
        AND ps."capturedAt" < ${since}
        AND ps.price > o."currentPrice" * 1.10
      LIMIT 50
    `.catch(() => [])

    return drops.length
  } catch {
    return 0
  }
}
