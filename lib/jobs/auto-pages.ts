// ============================================================================
// Auto Pages — automatically creates landing pages from popular search queries
// ============================================================================

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { generatePageSEO } from '@/lib/seo/auto-generator'

const MIN_SEARCH_VOLUME = 5
const MIN_PRODUCTS = 3
const MAX_PAGES_PER_RUN = 10

export async function autoGeneratePages() {
  // 1. Get top search queries (last 30d)
  const topQueries: { query: string; count: number }[] = await prisma.$queryRaw`
    SELECT "normalizedQuery" as query, COUNT(*)::int as count
    FROM search_logs
    WHERE "createdAt" > NOW() - INTERVAL '30 days'
    AND "normalizedQuery" IS NOT NULL
    AND "normalizedQuery" != ''
    AND LENGTH("normalizedQuery") >= 3
    GROUP BY "normalizedQuery"
    HAVING COUNT(*) >= ${MIN_SEARCH_VOLUME}
    ORDER BY count DESC
    LIMIT 100
  `

  // 2. Get trending keywords for cross-reference
  const trending = await prisma.trendingKeyword.findMany({
    where: {
      fetchedAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    distinct: ['keyword'],
    select: { keyword: true },
  })
  const trendingSet = new Set(trending.map(t => t.keyword.toLowerCase()))

  // 3. Get existing editorial blocks to avoid duplicates
  const existingBlocks = await prisma.editorialBlock.findMany({
    where: { blockType: 'RAIL' },
    select: { slug: true },
  })
  const existingSlugs = new Set(existingBlocks.map(b => b.slug))

  // 4. Get existing category slugs (these already have pages)
  const categories = await prisma.category.findMany({ select: { slug: true, name: true } })
  const catSlugs = new Set(categories.map(c => c.slug))
  const catNames = new Set(categories.map(c => c.name.toLowerCase()))

  let created = 0
  let skipped = 0

  for (const q of topQueries) {
    if (created >= MAX_PAGES_PER_RUN) break

    const slug = q.query.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    // Skip if page already exists
    if (existingSlugs.has(`descobrir-${slug}`)) { skipped++; continue }
    // Skip if it's a category name
    if (catSlugs.has(slug) || catNames.has(q.query.toLowerCase())) { skipped++; continue }

    // 5. Check product coverage
    const productCount: { cnt: number }[] = await prisma.$queryRaw`
      SELECT COUNT(*)::int as cnt FROM products
      WHERE status = 'ACTIVE'
      AND LOWER(name) LIKE '%' || ${q.query.toLowerCase()} || '%'
    `
    const count = productCount[0]?.cnt ?? 0
    if (count < MIN_PRODUCTS) { skipped++; continue }

    // 6. Boost score if trending
    const isTrending = trendingSet.has(q.query.toLowerCase())
    const boostReason = isTrending ? ' (trending)' : ''

    // 7. Generate SEO
    const seo = generatePageSEO({
      type: 'ofertas',
      data: {
        keyword: q.query,
        slug,
        productCount: count,
        topDiscount: undefined,
      },
    })

    // 8. Create EditorialBlock
    const status = (seo.readinessScore ?? 0) >= 60 ? 'PUBLISHED' : 'DRAFT'

    try {
      await prisma.editorialBlock.create({
        data: {
          blockType: 'RAIL',
          title: seo.h1,
          slug: `descobrir-${slug}`,
          subtitle: seo.subtitle,
          payloadJson: {
            query: q.query,
            slug,
            searchVolume: q.count,
            productCount: count,
            isTrending,
            seo: {
              title: seo.title,
              metaDescription: seo.metaDescription,
              h1: seo.h1,
              faqs: seo.faqs,
              internalLinks: seo.internalLinks,
            },
            readinessScore: seo.readinessScore,
          },
          status: status as 'DRAFT' | 'PUBLISHED',
        },
      })

      created++
      logger.info('auto-pages.created', { query: q.query, slug, count, status, boost: boostReason })
    } catch (err) {
      // Unique constraint = already exists
      logger.debug('auto-pages.skip-duplicate', { slug })
      skipped++
    }
  }

  logger.info('auto-pages.complete', { created, skipped })

  return {
    status: 'SUCCESS',
    itemsTotal: topQueries.length,
    itemsDone: created,
    metadata: { created, skipped, queriesAnalyzed: topQueries.length },
  }
}
