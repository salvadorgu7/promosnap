// ============================================================================
// Engagement Score — 0-100 score per user based on behavioral signals
// ============================================================================

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

export interface EngagementResult {
  score: number
  level: 'power' | 'engaged' | 'casual' | 'dormant' | 'new'
  breakdown: {
    clickouts: number    // 0-30
    alerts: number       // 0-20
    searches: number     // 0-15
    emailActivity: number // 0-15
    recency: number      // 0-20
  }
}

const MS_PER_DAY = 86_400_000

/**
 * Compute engagement score for a user identified by email.
 */
export async function computeEngagementScore(email: string): Promise<EngagementResult> {
  const breakdown = { clickouts: 0, alerts: 0, searches: 0, emailActivity: 0, recency: 0 }

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * MS_PER_DAY)

    const [alertCount, emailCount, subscriber] = await Promise.all([
      // Active alerts
      prisma.priceAlert.count({
        where: { email, isActive: true },
      }),

      // Emails sent in last 30d
      prisma.emailLog.count({
        where: { to: email, sentAt: { gt: thirtyDaysAgo } },
      }),

      // Subscriber info
      prisma.subscriber.findUnique({
        where: { email },
        select: { createdAt: true, updatedAt: true },
      }),
    ])

    // Alerts score (0-20)
    breakdown.alerts = Math.min(20, alertCount * 5)

    // Email activity (0-15)
    breakdown.emailActivity = Math.min(15, emailCount * 3)

    // Recency score (0-20) — based on subscriber updatedAt
    if (subscriber) {
      const daysSinceActive = (Date.now() - subscriber.updatedAt.getTime()) / MS_PER_DAY
      if (daysSinceActive < 1) breakdown.recency = 20
      else if (daysSinceActive < 7) breakdown.recency = 15
      else if (daysSinceActive < 14) breakdown.recency = 10
      else if (daysSinceActive < 30) breakdown.recency = 5
      else breakdown.recency = 0
    }

    // Clickouts are harder to attribute without user auth — estimate from alerts
    // If user has alerts, they likely clicked through
    breakdown.clickouts = Math.min(30, alertCount * 8 + emailCount * 2)

    // Searches — estimate from alert categories (users who create alerts searched first)
    breakdown.searches = Math.min(15, alertCount * 3)
  } catch (err) {
    logger.debug('engagement-score.failed', { email, error: err })
  }

  const score = Math.min(100, Object.values(breakdown).reduce((a, b) => a + b, 0))

  let level: EngagementResult['level']
  if (score >= 70) level = 'power'
  else if (score >= 45) level = 'engaged'
  else if (score >= 20) level = 'casual'
  else if (score >= 5) level = 'dormant'
  else level = 'new'

  return { score, level, breakdown }
}

/**
 * Get engagement scores for all active subscribers.
 * Used for admin dashboard and email targeting.
 */
export async function getEngagementDistribution(): Promise<{
  total: number
  power: number
  engaged: number
  casual: number
  dormant: number
  new_users: number
  avgScore: number
}> {
  const subscribers = await prisma.subscriber.findMany({
    where: { status: 'ACTIVE' },
    select: { email: true },
    take: 500,
  })

  const distribution = { total: subscribers.length, power: 0, engaged: 0, casual: 0, dormant: 0, new_users: 0, avgScore: 0 }
  let totalScore = 0

  for (const sub of subscribers) {
    const result = await computeEngagementScore(sub.email)
    totalScore += result.score

    switch (result.level) {
      case 'power': distribution.power++; break
      case 'engaged': distribution.engaged++; break
      case 'casual': distribution.casual++; break
      case 'dormant': distribution.dormant++; break
      case 'new': distribution.new_users++; break
    }
  }

  distribution.avgScore = subscribers.length > 0 ? Math.round(totalScore / subscribers.length) : 0

  return distribution
}
