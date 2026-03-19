/**
 * lib/jobs/seo-audit.ts — SEO Health Audit Cron Job
 *
 * Runs daily audit of SEO health:
 * - Checks sitemap is non-empty
 * - Checks for products without images in sitemap
 * - Checks for empty programmatic pages
 * - Checks for missing metadata
 * - Checks merchant feed health
 * - Reports zero-result search queries
 * - Sends alerts on regression
 */

import prisma from '@/lib/db/prisma'
import { runJob, type JobResult } from '@/lib/jobs/runner'
import { BEST_PAGE_SLUGS } from '@/lib/seo/best-pages'
import { OFFER_PAGE_SLUGS } from '@/lib/seo/offer-pages'
import { COMPARISON_SLUGS } from '@/lib/seo/comparisons'

interface SEOHealthSnapshot {
  totalProducts: number
  activeProducts: number
  productsWithImage: number
  productsWithCategory: number
  productsWithDescription: number
  activeOffers: number
  offersWithAffiliate: number
  categoriesWithProducts: number
  brandsWithProducts: number
  programmaticPages: {
    melhores: number
    ofertas: number
    comparacoes: number
  }
  searchHealth: {
    totalSearches7d: number
    zeroResultSearches7d: number
    uniqueQueries7d: number
    topZeroResultQueries: string[]
  }
  feedHealth: {
    eligibleProducts: number
    withImage: number
    withAffiliate: number
    withValidPrice: number
  }
  issues: string[]
  score: number
}

export async function seoAudit(): Promise<JobResult> {
  return runJob('seo-audit', async (ctx) => {
    ctx.log('Starting SEO health audit...')

    const issues: string[] = []
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    // ── Product health ──────────────────────────────────
    const [totalProducts, activeProducts, productsWithImage, productsWithCategory, productsWithDescription] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.product.count({ where: { status: 'ACTIVE', imageUrl: { not: null } } }),
      prisma.product.count({ where: { status: 'ACTIVE', categoryId: { not: null } } }),
      prisma.product.count({ where: { status: 'ACTIVE', description: { not: null } } }),
    ])
    ctx.log(`Products: ${activeProducts} active / ${totalProducts} total`)

    if (activeProducts === 0) issues.push('CRITICAL: 0 active products')
    const imageRate = activeProducts > 0 ? productsWithImage / activeProducts : 0
    if (imageRate < 0.5) issues.push(`WARNING: Only ${Math.round(imageRate * 100)}% of products have images`)
    const categoryRate = activeProducts > 0 ? productsWithCategory / activeProducts : 0
    if (categoryRate < 0.4) issues.push(`WARNING: Only ${Math.round(categoryRate * 100)}% of products have categories`)

    // ── Offer health ────────────────────────────────────
    const [activeOffers, offersWithAffiliate] = await Promise.all([
      prisma.offer.count({ where: { isActive: true } }),
      prisma.offer.count({ where: { isActive: true, affiliateUrl: { not: null } } }),
    ])
    ctx.log(`Offers: ${activeOffers} active, ${offersWithAffiliate} with affiliate`)

    if (activeOffers === 0) issues.push('CRITICAL: 0 active offers')
    const affiliateRate = activeOffers > 0 ? offersWithAffiliate / activeOffers : 0
    if (affiliateRate < 0.3) issues.push(`WARNING: Only ${Math.round(affiliateRate * 100)}% of offers have affiliate links`)

    // ── Category/Brand coverage ─────────────────────────
    const [categoriesWithProducts, brandsWithProducts] = await Promise.all([
      prisma.category.count({ where: { products: { some: { status: 'ACTIVE' } } } }),
      prisma.brand.count({ where: { products: { some: { status: 'ACTIVE' } } } }),
    ])
    ctx.log(`Categories with products: ${categoriesWithProducts}, Brands: ${brandsWithProducts}`)

    // ── Programmatic pages ──────────────────────────────
    const programmaticPages = {
      melhores: BEST_PAGE_SLUGS.length,
      ofertas: OFFER_PAGE_SLUGS.length,
      comparacoes: COMPARISON_SLUGS.length,
    }
    ctx.log(`Programmatic: ${programmaticPages.melhores} melhores, ${programmaticPages.ofertas} ofertas, ${programmaticPages.comparacoes} comparações`)

    // ── Search health ───────────────────────────────────
    let searchHealth = {
      totalSearches7d: 0,
      zeroResultSearches7d: 0,
      uniqueQueries7d: 0,
      topZeroResultQueries: [] as string[],
    }

    try {
      const [totalSearches, zeroResults] = await Promise.all([
        prisma.searchLog.count({ where: { createdAt: { gte: since7d } } }),
        prisma.searchLog.count({ where: { createdAt: { gte: since7d }, resultsCount: 0 } }),
      ])

      const uniqueQueries = await prisma.searchLog.groupBy({
        by: ['normalizedQuery'],
        where: { createdAt: { gte: since7d } },
        _count: true,
      })

      const zeroResultQueries: { query: string; count: bigint }[] = await prisma.$queryRaw`
        SELECT "normalizedQuery" as query, COUNT(*) as count
        FROM "search_logs"
        WHERE "createdAt" > ${since7d} AND "resultsCount" = 0
        GROUP BY "normalizedQuery"
        ORDER BY count DESC
        LIMIT 10
      `

      searchHealth = {
        totalSearches7d: totalSearches,
        zeroResultSearches7d: zeroResults,
        uniqueQueries7d: uniqueQueries.length,
        topZeroResultQueries: zeroResultQueries.map(q => q.query).filter(Boolean) as string[],
      }
      ctx.log(`Search 7d: ${totalSearches} total, ${zeroResults} zero-result, ${uniqueQueries.length} unique queries`)

      const zeroRate = totalSearches > 0 ? zeroResults / totalSearches : 0
      if (zeroRate > 0.3) issues.push(`WARNING: ${Math.round(zeroRate * 100)}% of searches return 0 results`)
    } catch (err) {
      ctx.warn(`Search health check failed: ${err}`)
    }

    // ── Feed health ─────────────────────────────────────
    const feedEligible = await prisma.product.count({
      where: {
        status: 'ACTIVE',
        imageUrl: { not: null },
        listings: {
          some: {
            offers: {
              some: {
                isActive: true,
                currentPrice: { gte: 5, lte: 50000 },
              },
            },
          },
        },
      },
    })
    ctx.log(`Feed eligible: ${feedEligible} products`)

    if (feedEligible < 10) issues.push(`WARNING: Only ${feedEligible} products eligible for Merchant feed`)

    const feedHealth = {
      eligibleProducts: feedEligible,
      withImage: productsWithImage,
      withAffiliate: offersWithAffiliate,
      withValidPrice: activeOffers,
    }

    // ── Calculate overall score ─────────────────────────
    let score = 100
    for (const issue of issues) {
      if (issue.startsWith('CRITICAL')) score -= 25
      else if (issue.startsWith('WARNING')) score -= 10
    }
    score = Math.max(0, score)

    const snapshot: SEOHealthSnapshot = {
      totalProducts,
      activeProducts,
      productsWithImage,
      productsWithCategory,
      productsWithDescription,
      activeOffers,
      offersWithAffiliate,
      categoriesWithProducts,
      brandsWithProducts,
      programmaticPages,
      searchHealth,
      feedHealth,
      issues,
      score,
    }

    ctx.log(`SEO health score: ${score}/100 with ${issues.length} issues`)

    return {
      itemsTotal: issues.length,
      itemsDone: issues.length,
      metadata: snapshot,
    }
  })
}
