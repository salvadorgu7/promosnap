/**
 * Price Index Generator — monthly market report.
 *
 * Computes average, min, max, median prices per category for the current month.
 * Compares with previous month to show trends.
 * Stored in PriceIndex model for historical reference.
 *
 * Data can be published as a public page for SEO + press coverage.
 */

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

const log = logger.child({ job: 'price-index' })

const CATEGORIES = ['celulares', 'notebooks', 'audio', 'smart-tvs', 'gamer', 'wearables', 'informatica', 'casa', 'beleza', 'tenis']

function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export async function generatePriceIndex() {
  const now = new Date()
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevPeriod = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`

  let created = 0
  let skipped = 0
  const errors: string[] = []

  // Process each category + "all"
  const categoriesToProcess = [...CATEGORIES, 'all']

  for (const cat of categoriesToProcess) {
    try {
      // Check if already exists
      const existing = await prisma.priceIndex.findUnique({
        where: { period: `${period}-${cat}` },
      })
      if (existing) {
        skipped++
        continue
      }

      // Fetch active prices
      const where: any = {
        isActive: true,
        currentPrice: { gt: 0 },
      }

      if (cat !== 'all') {
        where.listing = {
          product: {
            status: 'ACTIVE',
            category: { slug: cat },
          },
        }
      } else {
        where.listing = {
          product: { status: 'ACTIVE' },
        }
      }

      const offers = await prisma.offer.findMany({
        where,
        select: {
          currentPrice: true,
          originalPrice: true,
          offerScore: true,
          listing: {
            select: {
              product: { select: { name: true, slug: true } },
              source: { select: { name: true } },
            },
          },
        },
      })

      if (offers.length < 3) {
        skipped++
        continue
      }

      const prices = offers.map(o => o.currentPrice)
      const avgPrice = prices.reduce((s, p) => s + p, 0) / prices.length
      const minPrice = Math.min(...prices)
      const maxPrice = Math.max(...prices)
      const medianPrice = median(prices)

      // Get previous month data for comparison
      const prevIndex = await prisma.priceIndex.findUnique({
        where: { period: `${prevPeriod}-${cat}` },
      })

      const priceChange = prevIndex
        ? ((avgPrice - prevIndex.avgPrice) / prevIndex.avgPrice) * 100
        : 0

      // Top 5 deals (highest score)
      const topDeals = offers
        .filter(o => o.offerScore > 50)
        .sort((a, b) => b.offerScore - a.offerScore)
        .slice(0, 5)
        .map(o => ({
          name: o.listing?.product?.name?.slice(0, 60),
          price: o.currentPrice,
          source: o.listing?.source?.name,
          slug: o.listing?.product?.slug,
          score: o.offerScore,
        }))

      await prisma.priceIndex.create({
        data: {
          period: `${period}-${cat}`,
          category: cat,
          avgPrice: Math.round(avgPrice * 100) / 100,
          minPrice,
          maxPrice,
          medianPrice: Math.round(medianPrice * 100) / 100,
          productCount: offers.length,
          priceChange: Math.round(priceChange * 100) / 100,
          topDeals,
          insights: {
            generatedAt: now.toISOString(),
            trend: priceChange < -2 ? 'queda' : priceChange > 2 ? 'alta' : 'estavel',
            summary: priceChange < -2
              ? `Preços de ${cat} caíram ${Math.abs(priceChange).toFixed(1)}% em relação ao mês anterior.`
              : priceChange > 2
                ? `Preços de ${cat} subiram ${priceChange.toFixed(1)}% em relação ao mês anterior.`
                : `Preços de ${cat} se mantiveram estáveis neste mês.`,
          },
        },
      })

      created++
      log.info('price-index.created', { period, category: cat, avg: avgPrice.toFixed(2), products: offers.length })
    } catch (err) {
      errors.push(`${cat}: ${String(err)}`)
    }
  }

  log.info('price-index.complete', { period, created, skipped, errors: errors.length })
  return { status: 'OK', period, created, skipped, errors }
}
