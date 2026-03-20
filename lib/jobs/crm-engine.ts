/**
 * CRM Engine Job — runs periodically to:
 * 1. Classify all active subscribers
 * 2. Fire pending alert notifications via CRM pipeline
 * 3. Send scheduled digests
 * 4. Re-engagement campaigns
 * 5. Update engagement scores
 *
 * Designed to run as a cron job (daily or every 6h).
 */

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { runCrmPipeline, type PipelineInput } from '@/lib/crm/pipeline'
import { classifySubscriber } from '@/lib/crm/segment-engine'

const MAX_MESSAGES_PER_RUN = 100
const MAX_REENGAGEMENTS_PER_RUN = 30
const REENGAGEMENT_COOLDOWN_DAYS = 14

// ============================================
// MAIN JOB
// ============================================

export async function runCrmEngineJob(): Promise<{
  segmentsUpdated: number
  alertsFired: number
  digestsSent: number
  reengagementsSent: number
  errors: number
}> {
  logger.info('[CRM-JOB] Starting CRM engine run')
  const stats = { segmentsUpdated: 0, alertsFired: 0, digestsSent: 0, reengagementsSent: 0, errors: 0 }

  // 1. Fire triggered price alerts via CRM pipeline
  const triggeredAlerts = await getTriggeredAlerts()
  for (const alert of triggeredAlerts.slice(0, MAX_MESSAGES_PER_RUN)) {
    try {
      const subscriber = await findOrCreateSubscriber(alert.email)
      if (!subscriber) continue

      const result = await runCrmPipeline({
        subscriberId: subscriber.id,
        email: alert.email,
        reason: 'alert_triggered',
        targetPrice: alert.targetPrice,
        product: {
          id: alert.productId,
          name: alert.productName,
          currentPrice: alert.currentPrice,
          originalPrice: alert.originalPrice,
          storeName: alert.storeName,
          sourceSlug: alert.sourceSlug,
          affiliateUrl: alert.affiliateUrl,
          categoryName: alert.categoryName,
        },
      })

      if (result.status === 'sent') stats.alertsFired++
      if (result.status === 'error') stats.errors++
    } catch (err) {
      logger.error('[CRM-JOB] Alert pipeline error', { alert: alert.email, err })
      stats.errors++
    }
  }

  // 2. Price drop notifications
  const priceDrops = await getSignificantPriceDrops()
  for (const drop of priceDrops.slice(0, MAX_MESSAGES_PER_RUN)) {
    try {
      // Find subscribers interested in this category
      const subscribers = await prisma.subscriber.findMany({
        where: {
          status: 'ACTIVE',
          channelEmail: true,
          interests: { hasSome: drop.categorySlug ? [drop.categorySlug] : [] },
        },
        take: 20,
      })

      for (const sub of subscribers) {
        const result = await runCrmPipeline({
          subscriberId: sub.id,
          email: sub.email,
          reason: 'price_drop',
          product: drop,
        })
        if (result.status === 'sent') stats.digestsSent++
        if (result.status === 'error') stats.errors++
      }
    } catch (err) {
      logger.error('[CRM-JOB] Price drop error', { product: drop.name, err })
      stats.errors++
    }
  }

  // 3. Re-engagement for dormant subscribers
  const dormantSubs = await getDormantSubscribers()
  for (const sub of dormantSubs.slice(0, MAX_REENGAGEMENTS_PER_RUN)) {
    try {
      const result = await runCrmPipeline({
        subscriberId: sub.id,
        email: sub.email,
        reason: 'reengagement',
      })
      if (result.status === 'sent') stats.reengagementsSent++
      if (result.status === 'error') stats.errors++
    } catch (err) {
      stats.errors++
    }
  }

  // 4. Update segment classifications (background)
  const activeSubs = await prisma.subscriber.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true },
    take: 200,
  })
  for (const sub of activeSubs) {
    try {
      await classifySubscriber(sub.id)
      stats.segmentsUpdated++
    } catch { /* non-blocking */ }
  }

  logger.info('[CRM-JOB] CRM engine run complete', stats)
  return stats
}

// ============================================
// DATA FETCHERS
// ============================================

async function getTriggeredAlerts() {
  const alerts = await prisma.priceAlert.findMany({
    where: {
      isActive: true,
      triggeredAt: null,
    },
    include: {
      listing: {
        include: {
          product: { select: { id: true, name: true, category: { select: { name: true, slug: true } } } },
          source: { select: { name: true, slug: true } },
          offers: {
            where: { isActive: true },
            orderBy: { currentPrice: 'asc' },
            take: 1,
          },
        },
      },
    },
    take: 100,
  })

  return alerts
    .filter(a => {
      const currentPrice = a.listing.offers[0]?.currentPrice
      return currentPrice !== undefined && currentPrice <= a.targetPrice
    })
    .map(a => ({
      alertId: a.id,
      email: a.email,
      targetPrice: a.targetPrice,
      productId: a.listing.product?.id || '',
      productName: a.listing.product?.name || a.listing.rawTitle || 'Produto',
      currentPrice: a.listing.offers[0]!.currentPrice,
      originalPrice: a.listing.offers[0]?.originalPrice ?? undefined,
      storeName: a.listing.source.name,
      sourceSlug: a.listing.source.slug,
      affiliateUrl: a.listing.offers[0]?.affiliateUrl || '#',
      categoryName: a.listing.product?.category?.name,
      categorySlug: a.listing.product?.category?.slug,
    }))
}

async function getSignificantPriceDrops() {
  // Find offers that dropped 10%+ in last 48h
  const since = new Date(Date.now() - 48 * 3_600_000)

  const drops = await prisma.$queryRaw<Array<{
    id: string; name: string; currentPrice: number; previousPrice: number;
    sourceSlug: string; sourceName: string; affiliateUrl: string | null;
    categorySlug: string | null; categoryName: string | null
  }>>`
    SELECT p.id, p.name, o."currentPrice", ps.price AS "previousPrice",
           s.slug AS "sourceSlug", s.name AS "sourceName", o."affiliateUrl",
           c.slug AS "categorySlug", c.name AS "categoryName"
    FROM offers o
    JOIN listings l ON o."listingId" = l.id
    JOIN products p ON l."productId" = p.id
    JOIN sources s ON l."sourceId" = s.id
    LEFT JOIN categories c ON p."categoryId" = c.id
    JOIN price_snapshots ps ON ps."offerId" = o.id
    WHERE o."isActive" = true
      AND ps."capturedAt" < ${since}
      AND ps.price > o."currentPrice" * 1.10
    ORDER BY (ps.price - o."currentPrice") / ps.price DESC
    LIMIT 50
  `.catch(() => [])

  return drops.map(d => ({
    id: d.id,
    name: d.name,
    currentPrice: d.currentPrice,
    previousPrice: d.previousPrice,
    discount: Math.round(((d.previousPrice - d.currentPrice) / d.previousPrice) * 100),
    storeName: d.sourceName,
    sourceSlug: d.sourceSlug,
    affiliateUrl: d.affiliateUrl || '#',
    categoryName: d.categoryName || undefined,
    categorySlug: d.categorySlug || undefined,
  }))
}

async function getDormantSubscribers() {
  const cooldownDate = new Date(Date.now() - REENGAGEMENT_COOLDOWN_DAYS * 86_400_000)
  const dormantDate = new Date(Date.now() - 14 * 86_400_000)

  return prisma.subscriber.findMany({
    where: {
      status: 'ACTIVE',
      channelEmail: true,
      OR: [
        { lastActiveAt: { lt: dormantDate } },
        { lastActiveAt: null, createdAt: { lt: dormantDate } },
      ],
      // No recent reengagement message
      messages: {
        none: {
          messageType: 'reengagement',
          createdAt: { gte: cooldownDate },
        },
      },
    },
    take: MAX_REENGAGEMENTS_PER_RUN,
  })
}

async function findOrCreateSubscriber(email: string) {
  try {
    return await prisma.subscriber.upsert({
      where: { email },
      create: { email, source: 'alert' },
      update: {},
    })
  } catch {
    return null
  }
}
