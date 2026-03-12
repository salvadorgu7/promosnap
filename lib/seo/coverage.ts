// ============================================
// SEO COVERAGE REPORT — content vs opportunity
// ============================================

import prisma from '@/lib/db/prisma'
import { BEST_PAGE_SLUGS } from '@/lib/seo/best-pages'
import { OFFER_PAGE_SLUGS } from '@/lib/seo/offer-pages'
import { COMPARISON_SLUGS } from '@/lib/seo/comparisons'

export interface CoverageItem {
  label: string
  total: number
  covered: number
  percentage: number
  details: string
}

export interface CoverageReport {
  items: CoverageItem[]
  overallPercentage: number
  generatedAt: string
}

/**
 * Calculates SEO content coverage across all entity types.
 * Shows total vs covered vs with content for each type.
 */
export async function getCoverageReport(): Promise<CoverageReport> {
  const items: CoverageItem[] = []

  try {
    // ── Categories ────────────────────────────────────
    const categories = await prisma.category.findMany({
      select: {
        slug: true,
        description: true,
        seoTitle: true,
        seoDescription: true,
        _count: { select: { products: true } },
      },
    })
    const totalCategories = categories.length
    const catsWithProducts = categories.filter(c => c._count.products > 0).length
    const catsWithContent = categories.filter(
      c => c.description && c.description.length >= 50 && c.seoTitle && c.seoDescription
    ).length

    items.push({
      label: 'Categorias',
      total: totalCategories,
      covered: catsWithProducts,
      percentage: totalCategories > 0 ? Math.round((catsWithContent / totalCategories) * 100) : 0,
      details: `${catsWithProducts} com produtos, ${catsWithContent} com conteudo completo`,
    })

    // ── Brands ────────────────────────────────────────
    const brands = await prisma.brand.findMany({
      select: {
        slug: true,
        _count: { select: { products: true } },
      },
    })
    const totalBrands = brands.length
    const brandsWithProducts = brands.filter(b => b._count.products > 0).length
    // Check if brand has a best page or offer page
    const bestSlugsSet = new Set(BEST_PAGE_SLUGS)
    const offerSlugsSet = new Set(OFFER_PAGE_SLUGS)
    const brandsWithPages = brands.filter(b =>
      bestSlugsSet.has(`melhores-${b.slug}`) || offerSlugsSet.has(b.slug)
    ).length

    items.push({
      label: 'Marcas',
      total: totalBrands,
      covered: brandsWithPages,
      percentage: totalBrands > 0 ? Math.round((brandsWithPages / totalBrands) * 100) : 0,
      details: `${brandsWithProducts} com produtos, ${brandsWithPages} com paginas dedicadas`,
    })

    // ── Comparisons ───────────────────────────────────
    // Potential comparisons = brand pairs sharing categories with 2+ products each
    let potentialComparisons = 0
    try {
      const result = await prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(*)::int AS count FROM (
          SELECT b1.slug, b2.slug
          FROM brands b1
          JOIN products p1 ON p1."brandId" = b1.id AND p1.status = 'ACTIVE'
          JOIN products p2 ON p2."categoryId" = p1."categoryId" AND p2.status = 'ACTIVE'
          JOIN brands b2 ON p2."brandId" = b2.id AND b2.id != b1.id
          WHERE b1.slug < b2.slug
          GROUP BY b1.slug, b2.slug
          HAVING COUNT(DISTINCT p1.id) >= 2 AND COUNT(DISTINCT p2.id) >= 2
        ) pairs
      `
      potentialComparisons = result[0]?.count ?? 0
    } catch {
      potentialComparisons = Math.max(10, totalBrands * 2)
    }
    const existingComparisons = COMPARISON_SLUGS.length

    items.push({
      label: 'Comparacoes',
      total: Math.max(potentialComparisons, existingComparisons),
      covered: existingComparisons,
      percentage: potentialComparisons > 0
        ? Math.round((existingComparisons / Math.max(potentialComparisons, existingComparisons)) * 100)
        : 100,
      details: `${existingComparisons} criadas de ${potentialComparisons} possiveis`,
    })

    // ── Price pages (products with price history) ─────
    let productsWithHistory = 0
    let totalActiveProducts = 0
    try {
      totalActiveProducts = await prisma.product.count({ where: { status: 'ACTIVE' } })
      const result = await prisma.$queryRaw<[{ count: number }]>`
        SELECT COUNT(DISTINCT l."productId")::int AS count
        FROM listings l
        JOIN offers o ON o."listingId" = l.id
        JOIN price_snapshots ps ON ps."offerId" = o.id
        WHERE l."productId" IS NOT NULL
        GROUP BY l."productId"
        HAVING COUNT(ps.id) >= 2
      `
      productsWithHistory = result.length
    } catch {
      // fallback
    }

    items.push({
      label: 'Historico de Precos',
      total: totalActiveProducts,
      covered: productsWithHistory,
      percentage: totalActiveProducts > 0
        ? Math.round((productsWithHistory / totalActiveProducts) * 100)
        : 0,
      details: `${productsWithHistory} produtos com historico de ${totalActiveProducts} ativos`,
    })

    // ── Best/Collection pages ─────────────────────────
    const bestPagesTotal = BEST_PAGE_SLUGS.length
    // Potential: categories with 3+ products
    const potentialBestPages = categories.filter(c => c._count.products >= 3).length

    items.push({
      label: 'Colecoes / Melhores',
      total: Math.max(potentialBestPages, bestPagesTotal),
      covered: bestPagesTotal,
      percentage: potentialBestPages > 0
        ? Math.round((bestPagesTotal / Math.max(potentialBestPages, bestPagesTotal)) * 100)
        : 100,
      details: `${bestPagesTotal} paginas criadas de ${potentialBestPages} categorias elegiveis`,
    })

    // ── Offer pages ───────────────────────────────────
    const offerPagesTotal = OFFER_PAGE_SLUGS.length
    // Potential: brands with 5+ products
    const potentialOfferPages = brands.filter(b => b._count.products >= 5).length

    items.push({
      label: 'Paginas de Ofertas',
      total: Math.max(potentialOfferPages, offerPagesTotal),
      covered: offerPagesTotal,
      percentage: potentialOfferPages > 0
        ? Math.round((offerPagesTotal / Math.max(potentialOfferPages, offerPagesTotal)) * 100)
        : 100,
      details: `${offerPagesTotal} paginas de ${potentialOfferPages} marcas elegiveis`,
    })

    // ── Articles / Guides ─────────────────────────────
    let publishedArticles = 0
    try {
      publishedArticles = await prisma.article.count({ where: { status: 'PUBLISHED' } })
    } catch {
      // fallback
    }
    // Potential guides: 1 per brand with 3+ products
    const potentialGuides = brands.filter(b => b._count.products >= 3).length

    items.push({
      label: 'Guias / Artigos',
      total: Math.max(potentialGuides, publishedArticles),
      covered: publishedArticles,
      percentage: potentialGuides > 0
        ? Math.round((publishedArticles / Math.max(potentialGuides, publishedArticles)) * 100)
        : 100,
      details: `${publishedArticles} publicados de ${potentialGuides} guias possiveis`,
    })
  } catch {
    // graceful fallback
  }

  const totalSum = items.reduce((acc, item) => acc + item.total, 0)
  const coveredSum = items.reduce((acc, item) => acc + item.covered, 0)
  const overallPercentage = totalSum > 0 ? Math.round((coveredSum / totalSum) * 100) : 0

  return {
    items,
    overallPercentage,
    generatedAt: new Date().toISOString(),
  }
}
