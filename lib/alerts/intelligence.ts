// ============================================================================
// Alert Intelligence — analytics and insights for price alerts
// ============================================================================

import prisma from '@/lib/db/prisma'

// ── Types ──────────────────────────────────────────────────────────────────

export interface AlertsByCategory {
  categoryName: string
  categorySlug: string
  alertCount: number
}

export interface AlertsByPriceRange {
  range: string
  min: number
  max: number
  count: number
}

export interface HighConversionAlert {
  alertId: string
  email: string
  targetPrice: number
  currentPrice: number
  discount: number
  isFreeShipping: boolean
  productName: string
  listingId: string
}

export interface SubscribersByInterest {
  interest: string
  subscriberCount: number
}

export interface RetentionMetrics {
  totalSubscribers: number
  activeAlerts: number
  triggeredAlerts: number
  emailsSent: number
  emailsFailed: number
}

export interface AlertIntelligenceReport {
  byCategory: AlertsByCategory[]
  byPriceRange: AlertsByPriceRange[]
  highConversion: HighConversionAlert[]
  subscribersByInterest: SubscribersByInterest[]
  retention: RetentionMetrics
  generatedAt: string
}

// ── Price range buckets ──────────────────────────────────────────────────

const PRICE_RANGES = [
  { range: 'R$ 0-50', min: 0, max: 50 },
  { range: 'R$ 50-100', min: 50, max: 100 },
  { range: 'R$ 100-200', min: 100, max: 200 },
  { range: 'R$ 200-500', min: 200, max: 500 },
  { range: 'R$ 500-1000', min: 500, max: 1000 },
  { range: 'R$ 1000-2000', min: 1000, max: 2000 },
  { range: 'R$ 2000+', min: 2000, max: Infinity },
]

// ── Functions ────────────────────────────────────────────────────────────

/**
 * Count active alerts grouped by product category.
 */
export async function getAlertsByCategory(): Promise<AlertsByCategory[]> {
  const alerts = await prisma.priceAlert.findMany({
    where: { isActive: true },
    select: {
      listing: {
        select: {
          product: {
            select: {
              category: {
                select: { name: true, slug: true },
              },
            },
          },
        },
      },
    },
  })

  const counts: Record<string, { name: string; slug: string; count: number }> = {}

  for (const alert of alerts) {
    const cat = alert.listing?.product?.category
    const key = cat?.slug ?? 'sem-categoria'
    const name = cat?.name ?? 'Sem Categoria'
    if (!counts[key]) {
      counts[key] = { name, slug: key, count: 0 }
    }
    counts[key].count++
  }

  return Object.values(counts)
    .map(c => ({ categoryName: c.name, categorySlug: c.slug, alertCount: c.count }))
    .sort((a, b) => b.alertCount - a.alertCount)
}

/**
 * Distribution of target prices across defined price ranges.
 */
export async function getAlertsByPriceRange(): Promise<AlertsByPriceRange[]> {
  const alerts = await prisma.priceAlert.findMany({
    where: { isActive: true },
    select: { targetPrice: true },
  })

  const rangeCounts = PRICE_RANGES.map(r => ({ ...r, count: 0 }))

  for (const alert of alerts) {
    const bucket = rangeCounts.find(
      r => alert.targetPrice >= r.min && alert.targetPrice < r.max
    )
    if (bucket) bucket.count++
  }

  return rangeCounts
}

/**
 * Alerts on products with high discount + free shipping — most likely to convert.
 */
export async function getHighConversionAlerts(limit = 20): Promise<HighConversionAlert[]> {
  const alerts = await prisma.priceAlert.findMany({
    where: { isActive: true },
    include: {
      listing: {
        include: {
          product: { select: { name: true } },
          offers: {
            where: { isActive: true },
            orderBy: { currentPrice: 'asc' },
            take: 1,
          },
        },
      },
    },
  })

  const candidates: HighConversionAlert[] = []

  for (const alert of alerts) {
    const offer = alert.listing?.offers?.[0]
    if (!offer) continue

    const discount = offer.originalPrice && offer.originalPrice > offer.currentPrice
      ? Math.round(((offer.originalPrice - offer.currentPrice) / offer.originalPrice) * 100)
      : 0

    if (discount >= 15 || offer.isFreeShipping) {
      candidates.push({
        alertId: alert.id,
        email: alert.email,
        targetPrice: alert.targetPrice,
        currentPrice: offer.currentPrice,
        discount,
        isFreeShipping: offer.isFreeShipping,
        productName: alert.listing?.product?.name ?? alert.listing?.rawTitle ?? 'Produto',
        listingId: alert.listingId,
      })
    }
  }

  // Sort by discount descending, then free shipping
  return candidates
    .sort((a, b) => {
      if (b.discount !== a.discount) return b.discount - a.discount
      return (b.isFreeShipping ? 1 : 0) - (a.isFreeShipping ? 1 : 0)
    })
    .slice(0, limit)
}

/**
 * Subscribers grouped by interest tags.
 */
export async function getSubscribersByInterest(): Promise<SubscribersByInterest[]> {
  const subscribers = await prisma.subscriber.findMany({
    where: { status: 'ACTIVE' },
    select: { interests: true, tags: true },
  })

  const interestCounts: Record<string, number> = {}

  for (const sub of subscribers) {
    // Count both interests (category slugs) and tags
    const allInterests = [...(sub.interests || []), ...(sub.tags || [])]
    if (allInterests.length === 0) {
      interestCounts['sem-interesse'] = (interestCounts['sem-interesse'] || 0) + 1
    }
    for (const interest of allInterests) {
      interestCounts[interest] = (interestCounts[interest] || 0) + 1
    }
  }

  return Object.entries(interestCounts)
    .map(([interest, subscriberCount]) => ({ interest, subscriberCount }))
    .sort((a, b) => b.subscriberCount - a.subscriberCount)
}

/**
 * Core retention metrics: subscribers, alerts, emails sent/failed.
 */
export async function getRetentionMetrics(): Promise<RetentionMetrics> {
  const [totalSubscribers, activeAlerts, triggeredAlerts, emailsSent, emailsFailed] =
    await Promise.all([
      prisma.subscriber.count({ where: { status: 'ACTIVE' } }),
      prisma.priceAlert.count({ where: { isActive: true } }),
      prisma.priceAlert.count({ where: { triggeredAt: { not: null } } }),
      prisma.emailLog.count({ where: { status: 'sent' } }),
      prisma.emailLog.count({ where: { status: 'failed' } }),
    ])

  return {
    totalSubscribers,
    activeAlerts,
    triggeredAlerts,
    emailsSent,
    emailsFailed,
  }
}

/**
 * Full alert intelligence report — combines all metrics.
 */
export async function getAlertIntelligenceReport(): Promise<AlertIntelligenceReport> {
  const [byCategory, byPriceRange, highConversion, subscribersByInterest, retention] =
    await Promise.all([
      getAlertsByCategory(),
      getAlertsByPriceRange(),
      getHighConversionAlerts(),
      getSubscribersByInterest(),
      getRetentionMetrics(),
    ])

  return {
    byCategory,
    byPriceRange,
    highConversion,
    subscribersByInterest,
    retention,
    generatedAt: new Date().toISOString(),
  }
}
