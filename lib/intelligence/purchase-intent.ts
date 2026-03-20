// ============================================================================
// Purchase Intent — server-side intent detection from behavioral signals
// ============================================================================

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

// ── Types ───────────────────────────────────────────────────────────────────

export interface IntentSignal {
  type: 'alert' | 'search' | 'clickout' | 'repeated_search'
  count: number
  weight: number
}

export interface IntentResult {
  productId: string
  productName: string
  productSlug: string
  /** 0-100 intent score */
  score: number
  signals: IntentSignal[]
  category?: string
}

// ── Weights ─────────────────────────────────────────────────────────────────

const SIGNAL_WEIGHTS = {
  alert: 30,          // Created a price alert → very high intent
  clickout: 20,       // Clicked through to store → high intent
  repeated_search: 15, // Searched for product multiple times
  search: 5,          // Single search hit
} as const

// ── Main Functions ──────────────────────────────────────────────────────────

/**
 * Detect high-intent products for a user identified by email.
 * Crosses PriceAlert + SearchLog + Clickout data.
 */
export async function detectHighIntentProducts(
  email: string,
  limit = 10
): Promise<IntentResult[]> {
  const results = new Map<string, IntentResult>()

  try {
    // 1. Products with active price alerts
    const alerts = await prisma.priceAlert.findMany({
      where: { email, isActive: true },
      include: {
        listing: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, category: { select: { slug: true } } },
            },
          },
        },
      },
    })

    for (const alert of alerts) {
      const product = alert.listing.product
      if (!product) continue

      const existing = results.get(product.id) || {
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        score: 0,
        signals: [],
        category: product.category?.slug,
      }

      existing.signals.push({ type: 'alert', count: 1, weight: SIGNAL_WEIGHTS.alert })
      existing.score += SIGNAL_WEIGHTS.alert
      results.set(product.id, existing)
    }

    // 2. Products with repeated clickouts (last 30d)
    const clickouts: { productId: string; name: string; slug: string; clicks: number; categorySlug: string | null }[] =
      await prisma.$queryRaw`
        SELECT
          p.id as "productId", p.name, p.slug,
          COUNT(c.id)::int as clicks,
          cat.slug as "categorySlug"
        FROM clickouts c
        JOIN offers o ON c."offerId" = o.id
        JOIN listings l ON o."listingId" = l.id
        JOIN products p ON l."productId" = p.id
        LEFT JOIN categories cat ON p."categoryId" = cat.id
        WHERE c."clickedAt" > NOW() - INTERVAL '30 days'
        AND c."sessionId" IS NOT NULL
        GROUP BY p.id, p.name, p.slug, cat.slug
        HAVING COUNT(c.id) >= 2
        ORDER BY clicks DESC
        LIMIT 50
      `

    for (const co of clickouts) {
      const existing = results.get(co.productId) || {
        productId: co.productId,
        productName: co.name,
        productSlug: co.slug,
        score: 0,
        signals: [],
        category: co.categorySlug ?? undefined,
      }

      const weight = Math.min(SIGNAL_WEIGHTS.clickout * co.clicks, 60)
      existing.signals.push({ type: 'clickout', count: co.clicks, weight })
      existing.score += weight
      results.set(co.productId, existing)
    }
  } catch (err) {
    logger.warn('purchase-intent.failed', { error: err })
  }

  // Sort by score, clamp, and limit
  return Array.from(results.values())
    .map(r => ({ ...r, score: Math.min(100, r.score) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * Compute intent score for a single product.
 * Used for showing intent indicators on product pages.
 */
export async function getProductIntentScore(productId: string): Promise<number> {
  let score = 0

  try {
    // Active alerts count
    const alertCount = await prisma.priceAlert.count({
      where: {
        isActive: true,
        listing: { productId },
      },
    })
    score += Math.min(alertCount * SIGNAL_WEIGHTS.alert, 60)

    // Recent clickouts
    const clickouts: { cnt: number }[] = await prisma.$queryRaw`
      SELECT COUNT(c.id)::int as cnt
      FROM clickouts c
      JOIN offers o ON c."offerId" = o.id
      JOIN listings l ON o."listingId" = l.id
      WHERE l."productId" = ${productId}
      AND c."clickedAt" > NOW() - INTERVAL '7 days'
    `
    score += Math.min((clickouts[0]?.cnt ?? 0) * 5, 40)

    // Search mentions
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { name: true },
    })
    if (product) {
      const searchCount: { cnt: number }[] = await prisma.$queryRaw`
        SELECT COUNT(*)::int as cnt
        FROM search_logs
        WHERE "createdAt" > NOW() - INTERVAL '7 days'
        AND LOWER("normalizedQuery") LIKE '%' || ${product.name.toLowerCase().split(' ').slice(0, 3).join(' ')} || '%'
      `
      score += Math.min((searchCount[0]?.cnt ?? 0) * 3, 30)
    }
  } catch (err) {
    logger.warn('product-intent-score.failed', { error: err })
  }

  return Math.min(100, score)
}

/**
 * Get top trending products with high purchase intent across the platform.
 * Used for homepage opportunity rails and digest emails.
 */
export async function getTrendingIntentProducts(limit = 10): Promise<IntentResult[]> {
  const results: IntentResult[] = []

  try {
    // Products with most alerts + clickouts combined (last 7d)
    const trending: {
      productId: string
      name: string
      slug: string
      alerts: number
      clicks: number
      categorySlug: string | null
    }[] = await prisma.$queryRaw`
      SELECT
        p.id as "productId", p.name, p.slug,
        COALESCE(a.alert_count, 0)::int as alerts,
        COALESCE(c.click_count, 0)::int as clicks,
        cat.slug as "categorySlug"
      FROM products p
      LEFT JOIN categories cat ON p."categoryId" = cat.id
      LEFT JOIN (
        SELECT l."productId", COUNT(pa.id) as alert_count
        FROM price_alerts pa
        JOIN listings l ON pa."listingId" = l.id
        WHERE pa."isActive" = true
        GROUP BY l."productId"
      ) a ON a."productId" = p.id
      LEFT JOIN (
        SELECT l."productId", COUNT(co.id) as click_count
        FROM clickouts co
        JOIN offers o ON co."offerId" = o.id
        JOIN listings l ON o."listingId" = l.id
        WHERE co."clickedAt" > NOW() - INTERVAL '7 days'
        GROUP BY l."productId"
      ) c ON c."productId" = p.id
      WHERE p.status = 'ACTIVE'
      AND (COALESCE(a.alert_count, 0) + COALESCE(c.click_count, 0)) > 0
      ORDER BY (COALESCE(a.alert_count, 0) * 3 + COALESCE(c.click_count, 0)) DESC
      LIMIT ${limit}
    `

    for (const t of trending) {
      const signals: IntentSignal[] = []
      let score = 0

      if (t.alerts > 0) {
        signals.push({ type: 'alert', count: t.alerts, weight: Math.min(t.alerts * SIGNAL_WEIGHTS.alert, 60) })
        score += Math.min(t.alerts * SIGNAL_WEIGHTS.alert, 60)
      }
      if (t.clicks > 0) {
        signals.push({ type: 'clickout', count: t.clicks, weight: Math.min(t.clicks * 5, 40) })
        score += Math.min(t.clicks * 5, 40)
      }

      results.push({
        productId: t.productId,
        productName: t.name,
        productSlug: t.slug,
        score: Math.min(100, score),
        signals,
        category: t.categorySlug ?? undefined,
      })
    }
  } catch (err) {
    logger.warn('trending-intent.failed', { error: err })
  }

  return results
}
