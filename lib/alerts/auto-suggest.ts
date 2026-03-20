// ============================================================================
// Auto-Suggest Alerts — suggest price alerts based on trending + user interests
// ============================================================================

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

export interface AlertSuggestion {
  productId: string
  productName: string
  productSlug: string
  imageUrl: string | null
  currentPrice: number
  suggestedTargetPrice: number
  reason: string
}

/**
 * Generate alert suggestions based on user interests or global trending.
 * Target price = 90% of avg30d (10% below average).
 */
export async function getAlertSuggestions(
  categories?: string[],
  limit = 5
): Promise<AlertSuggestion[]> {
  const suggestions: AlertSuggestion[] = []

  try {
    // Get trending keywords to identify popular products
    const trending = await prisma.trendingKeyword.findMany({
      where: {
        fetchedAt: { gt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      },
      distinct: ['keyword'],
      orderBy: { position: 'asc' },
      take: 20,
    })

    const trendingKeywords = trending.map(t => t.keyword.toLowerCase())

    // Find products that match trending keywords and user categories
    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        ...(categories && categories.length > 0
          ? { category: { slug: { in: categories } } }
          : {}),
        listings: {
          some: {
            status: 'ACTIVE',
            offers: {
              some: { isActive: true, currentPrice: { gt: 0 } },
            },
          },
        },
      },
      include: {
        listings: {
          where: { status: 'ACTIVE' },
          include: {
            offers: {
              where: { isActive: true },
              orderBy: { currentPrice: 'asc' },
              take: 1,
              select: {
                currentPrice: true,
                originalPrice: true,
              },
            },
          },
        },
      },
      orderBy: { popularityScore: 'desc' },
      take: 50,
    })

    for (const p of products) {
      const offer = p.listings[0]?.offers[0]
      if (!offer) continue

      // Check if product name matches any trending keyword
      const isTrending = trendingKeywords.some(kw =>
        p.name.toLowerCase().includes(kw) || kw.includes(p.name.toLowerCase().split(' ').slice(0, 2).join(' '))
      )

      // Calculate target price: 10% below current or 5% below original
      const targetPrice = offer.originalPrice
        ? Math.round(offer.originalPrice * 0.85 * 100) / 100
        : Math.round(offer.currentPrice * 0.9 * 100) / 100

      // Skip if target is higher than current (already a good deal)
      if (targetPrice >= offer.currentPrice) continue

      const reason = isTrending
        ? 'Em alta — crie um alerta para comprar no melhor momento'
        : 'Popular na sua categoria — monitore o preco'

      suggestions.push({
        productId: p.id,
        productName: p.name,
        productSlug: p.slug,
        imageUrl: p.imageUrl,
        currentPrice: offer.currentPrice,
        suggestedTargetPrice: targetPrice,
        reason,
      })

      if (suggestions.length >= limit) break
    }
  } catch (err) {
    logger.warn('auto-suggest.failed', { error: err })
  }

  return suggestions
}
