// ============================================
// CONTENT RECOMMENDATIONS — editorial opportunities
// ============================================

import prisma from '@/lib/db/prisma'
import type { ContentRecommendation } from './governance-types'

/**
 * Find categories without guide articles.
 */
async function getMissingGuides(): Promise<ContentRecommendation[]> {
  const recommendations: ContentRecommendation[] = []

  try {
    const [categories, articles] = await Promise.all([
      prisma.category.findMany({
        select: { slug: true, name: true, _count: { select: { products: true } } },
      }),
      prisma.article.findMany({
        where: { status: 'PUBLISHED' },
        select: { category: true, title: true },
      }),
    ])

    const coveredCategories = new Set(
      articles
        .map((a) => a.category?.toLowerCase())
        .filter(Boolean)
    )

    // Also check article titles for "guia" references
    const guideTitles = new Set(
      articles
        .filter((a) => /guia|guide/i.test(a.title))
        .map((a) => a.category?.toLowerCase())
        .filter(Boolean)
    )

    for (const cat of categories) {
      const slug = cat.slug.toLowerCase()
      if (!coveredCategories.has(slug) && !guideTitles.has(slug) && cat._count.products >= 2) {
        const traffic = cat._count.products >= 10 ? 'high' : cat._count.products >= 5 ? 'medium' : 'low'
        recommendations.push({
          type: 'guide',
          topic: `Guia de ${cat.name}`,
          reason: `Categoria "${cat.name}" tem ${cat._count.products} produtos mas nenhum guia publicado`,
          priority: Math.min(100, 40 + cat._count.products * 3),
          estimatedTraffic: traffic,
        })
      }
    }
  } catch {
    // graceful fallback
  }

  return recommendations
}

/**
 * Find popular products without comparison pages.
 */
async function getMissingComparisons(): Promise<ContentRecommendation[]> {
  const recommendations: ContentRecommendation[] = []

  try {
    const articles = await prisma.article.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, title: true },
    })

    const comparisonSlugs = new Set(
      articles
        .filter((a) => /vs|compara/i.test(a.slug) || /vs|compara/i.test(a.title))
        .map((a) => a.slug.toLowerCase())
    )

    // Find brand pairs in same category
    let brandPairs: Array<{ brand_a: string; brand_b: string; name_a: string; name_b: string; total: number }> = []
    try {
      brandPairs = await prisma.$queryRaw<typeof brandPairs>`
        SELECT
          b1.slug AS brand_a,
          b2.slug AS brand_b,
          b1.name AS name_a,
          b2.name AS name_b,
          (COUNT(DISTINCT p1.id) + COUNT(DISTINCT p2.id))::int AS total
        FROM brands b1
        JOIN products p1 ON p1."brandId" = b1.id AND p1.status = 'ACTIVE'
        JOIN products p2 ON p2."categoryId" = p1."categoryId" AND p2.status = 'ACTIVE'
        JOIN brands b2 ON p2."brandId" = b2.id AND b2.id != b1.id
        WHERE b1.slug < b2.slug
        GROUP BY b1.slug, b2.slug, b1.name, b2.name
        HAVING COUNT(DISTINCT p1.id) >= 2 AND COUNT(DISTINCT p2.id) >= 2
        ORDER BY total DESC
        LIMIT 15
      `
    } catch {
      // may fail with empty tables
    }

    for (const pair of brandPairs) {
      const slug1 = `${pair.brand_a}-vs-${pair.brand_b}`
      const slug2 = `${pair.brand_b}-vs-${pair.brand_a}`
      if (!comparisonSlugs.has(slug1) && !comparisonSlugs.has(slug2)) {
        const traffic = pair.total >= 20 ? 'high' : pair.total >= 10 ? 'medium' : 'low'
        recommendations.push({
          type: 'comparison',
          topic: `${pair.name_a} vs ${pair.name_b}`,
          reason: `${pair.total} produtos combinados na mesma categoria, sem comparativo`,
          priority: Math.min(100, 30 + pair.total * 2),
          estimatedTraffic: traffic,
        })
      }
    }
  } catch {
    // graceful fallback
  }

  return recommendations
}

/**
 * Find products without price history coverage.
 */
async function getMissingPricePages(): Promise<ContentRecommendation[]> {
  const recommendations: ContentRecommendation[] = []

  try {
    const articles = await prisma.article.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true },
    })

    const priceSlugs = new Set(
      articles
        .filter((a) => /preco|price|historico/i.test(a.slug))
        .map((a) => a.slug.toLowerCase())
    )

    // Top products by popularity without price articles
    const topProducts = await prisma.product.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { popularityScore: 'desc' },
      take: 20,
      select: { slug: true, name: true, popularityScore: true },
    })

    for (const product of topProducts) {
      const slug = `preco-${product.slug}`
      const altSlug = `historico-${product.slug}`
      if (!priceSlugs.has(slug) && !priceSlugs.has(altSlug)) {
        const traffic =
          product.popularityScore >= 80 ? 'high' : product.popularityScore >= 40 ? 'medium' : 'low'
        recommendations.push({
          type: 'price',
          topic: `Historico de precos: ${product.name}`,
          reason: `Produto popular (score ${Math.round(product.popularityScore)}) sem pagina de historico de precos`,
          priority: Math.min(100, 35 + Math.round(product.popularityScore * 0.5)),
          estimatedTraffic: traffic,
        })
      }
    }
  } catch {
    // graceful fallback
  }

  return recommendations
}

/**
 * Find hot topics from search logs not yet covered.
 */
async function getHotTopics(): Promise<ContentRecommendation[]> {
  const recommendations: ContentRecommendation[] = []

  try {
    let topSearches: Array<{ query: string; count: number }> = []
    try {
      topSearches = await prisma.$queryRaw<Array<{ query: string; count: number }>>`
        SELECT LOWER(TRIM(query)) AS query, COUNT(*)::int AS count
        FROM search_logs
        WHERE "createdAt" > NOW() - INTERVAL '30 days'
        GROUP BY LOWER(TRIM(query))
        HAVING COUNT(*) >= 3
        ORDER BY count DESC
        LIMIT 30
      `
    } catch {
      // search_logs may be empty
    }

    const articles = await prisma.article.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, title: true, content: true },
    })

    // Build a searchable index from article titles and slugs
    const coveredTopics = articles.flatMap((a) => [
      a.slug.toLowerCase(),
      a.title.toLowerCase(),
    ])

    for (const search of topSearches) {
      const q = search.query.toLowerCase()
      const isCovered = coveredTopics.some(
        (t) => t.includes(q) || q.includes(t.replace(/-/g, ' '))
      )
      if (!isCovered) {
        const traffic = search.count >= 20 ? 'high' : search.count >= 8 ? 'medium' : 'low'
        recommendations.push({
          type: 'hot-topic',
          topic: search.query,
          reason: `Buscado ${search.count}x nos ultimos 30 dias sem conteudo dedicado`,
          priority: Math.min(100, 25 + search.count * 3),
          estimatedTraffic: traffic,
        })
      }
    }
  } catch {
    // graceful fallback
  }

  return recommendations
}

/**
 * Get all content recommendations sorted by priority.
 */
export async function getContentRecommendations(): Promise<ContentRecommendation[]> {
  const [guides, comparisons, prices, hotTopics] = await Promise.all([
    getMissingGuides(),
    getMissingComparisons(),
    getMissingPricePages(),
    getHotTopics(),
  ])

  const all = [...guides, ...comparisons, ...prices, ...hotTopics]
  return all.sort((a, b) => b.priority - a.priority)
}
