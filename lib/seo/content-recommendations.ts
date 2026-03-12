// ============================================
// CONTENT RECOMMENDATIONS — gap analysis for SEO
// ============================================

import prisma from '@/lib/db/prisma'
import { BEST_PAGE_SLUGS } from '@/lib/seo/best-pages'
import { COMPARISON_SLUGS } from '@/lib/seo/comparisons'
import { OFFER_PAGE_SLUGS } from '@/lib/seo/offer-pages'

export interface ContentGap {
  type: 'guide' | 'comparison' | 'price' | 'collection'
  slug: string
  title: string
  score: number
  reason: string
}

/**
 * Analyzes the catalog to find missing content opportunities.
 * Compares Article categories vs Brand slugs, categories without strong
 * landing pages, high-search keywords without pages, and promising
 * comparisons not yet created.
 */
export async function getContentGaps(): Promise<ContentGap[]> {
  const gaps: ContentGap[] = []

  try {
    // 1. Brands without guides — compare Article.category vs Brand.slug
    const [brands, articleCategories] = await Promise.all([
      prisma.brand.findMany({ select: { slug: true, name: true, _count: { select: { products: true } } } }),
      prisma.article.findMany({
        where: { status: 'PUBLISHED' },
        select: { category: true },
      }),
    ])

    const coveredCategories = new Set(
      articleCategories.map((a) => a.category?.toLowerCase()).filter(Boolean)
    )

    for (const brand of brands) {
      if (!coveredCategories.has(brand.slug.toLowerCase()) && brand._count.products > 0) {
        const score = Math.min(100, 40 + brand._count.products * 2)
        gaps.push({
          type: 'guide',
          slug: `guia-${brand.slug}`,
          title: `Guia ${brand.name}`,
          score,
          reason: `${brand.name} tem ${brand._count.products} produtos mas nenhum guia publicado`,
        })
      }
    }

    // 2. Categories without strong landing pages
    const categories = await prisma.category.findMany({
      select: {
        slug: true,
        name: true,
        _count: { select: { products: true } },
      },
    })

    const existingBestPages = new Set(BEST_PAGE_SLUGS)
    const existingOfferPages = new Set(OFFER_PAGE_SLUGS)

    for (const cat of categories) {
      const hasBestPage = existingBestPages.has(`melhores-${cat.slug}`)
      const hasOfferPage = existingOfferPages.has(cat.slug)
      if (!hasBestPage && !hasOfferPage && cat._count.products >= 3) {
        const score = Math.min(100, 35 + cat._count.products * 3)
        gaps.push({
          type: 'collection',
          slug: `melhores-${cat.slug}`,
          title: `Melhores ${cat.name}`,
          score,
          reason: `Categoria "${cat.name}" tem ${cat._count.products} produtos sem landing page dedicada`,
        })
      }
    }

    // 3. High-search keywords without dedicated pages
    let topSearches: Array<{ query: string; count: number }> = []
    try {
      topSearches = await prisma.$queryRaw<Array<{ query: string; count: number }>>`
        SELECT LOWER(TRIM(query)) AS query, COUNT(*)::int AS count
        FROM search_logs
        WHERE "createdAt" > NOW() - INTERVAL '30 days'
        GROUP BY LOWER(TRIM(query))
        HAVING COUNT(*) >= 5
        ORDER BY count DESC
        LIMIT 50
      `
    } catch {
      // search_logs may be empty
    }

    const allPageSlugs = new Set([
      ...BEST_PAGE_SLUGS,
      ...OFFER_PAGE_SLUGS,
      ...COMPARISON_SLUGS,
    ])

    for (const search of topSearches) {
      const normalized = search.query.toLowerCase().replace(/\s+/g, '-')
      const hasPage = allPageSlugs.has(normalized) ||
        allPageSlugs.has(`melhores-${normalized}`) ||
        allPageSlugs.has(search.query.toLowerCase())

      if (!hasPage) {
        const score = Math.min(100, 30 + search.count * 2)
        gaps.push({
          type: 'price',
          slug: `ofertas-${normalized}`,
          title: `Ofertas de ${search.query}`,
          score,
          reason: `"${search.query}" buscado ${search.count}x nos ultimos 30 dias sem pagina dedicada`,
        })
      }
    }

    // 4. Promising comparisons not yet created
    let brandPairs: Array<{ brand_a: string; brand_b: string; products_a: number; products_b: number }> = []
    try {
      brandPairs = await prisma.$queryRaw<typeof brandPairs>`
        SELECT
          b1.slug AS brand_a,
          b2.slug AS brand_b,
          COUNT(DISTINCT p1.id)::int AS products_a,
          COUNT(DISTINCT p2.id)::int AS products_b
        FROM brands b1
        JOIN products p1 ON p1."brandId" = b1.id AND p1.status = 'ACTIVE'
        JOIN products p2 ON p2."categoryId" = p1."categoryId" AND p2.status = 'ACTIVE'
        JOIN brands b2 ON p2."brandId" = b2.id AND b2.id != b1.id
        WHERE b1.slug < b2.slug
        GROUP BY b1.slug, b2.slug
        HAVING COUNT(DISTINCT p1.id) >= 2 AND COUNT(DISTINCT p2.id) >= 2
        ORDER BY COUNT(DISTINCT p1.id) + COUNT(DISTINCT p2.id) DESC
        LIMIT 20
      `
    } catch {
      // may fail if tables empty
    }

    const existingComparisons = new Set(COMPARISON_SLUGS)

    for (const pair of brandPairs) {
      const slug = `${pair.brand_a}-vs-${pair.brand_b}`
      const reverseSlug = `${pair.brand_b}-vs-${pair.brand_a}`
      if (!existingComparisons.has(slug) && !existingComparisons.has(reverseSlug)) {
        const score = Math.min(100, 25 + (pair.products_a + pair.products_b) * 3)
        gaps.push({
          type: 'comparison',
          slug,
          title: `${pair.brand_a} vs ${pair.brand_b}`,
          score,
          reason: `${pair.products_a} + ${pair.products_b} produtos na mesma categoria, comparacao nao existe`,
        })
      }
    }
  } catch {
    // Graceful fallback — return whatever gaps were collected
  }

  // Sort by score descending
  return gaps.sort((a, b) => b.score - a.score)
}
