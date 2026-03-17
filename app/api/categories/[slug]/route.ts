import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { rateLimit, rateLimitResponse } from '@/lib/security/rate-limit'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/categories/[slug] — Public category listing API
 *
 * Returns category info + paginated products with best offers.
 * Supports filtering by brand, price range, free shipping, source.
 * Supports sorting by relevance, price, popularity, discount.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const rl = rateLimit(req, 'public')
  if (!rl.success) return rateLimitResponse(rl)

  const { slug } = await params
  const url = req.nextUrl

  // Parse query params
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10))
  const limit = Math.min(48, Math.max(1, parseInt(url.searchParams.get('limit') || '24', 10)))
  const sortBy = url.searchParams.get('sort') || 'popularity'
  const brandSlug = url.searchParams.get('brand') || null
  const sourceSlug = url.searchParams.get('source') || null
  const minPrice = parseFloat(url.searchParams.get('minPrice') || '0') || 0
  const maxPrice = parseFloat(url.searchParams.get('maxPrice') || '0') || 0
  const freeShipping = url.searchParams.get('freeShipping') === 'true'

  try {
    // Fetch category with parent info
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        children: {
          select: { id: true, name: true, slug: true, icon: true },
          orderBy: { position: 'asc' },
        },
      },
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Build product query
    const productWhere: any = {
      categoryId: category.id,
      status: 'ACTIVE',
    }

    if (brandSlug) {
      const brand = await prisma.brand.findUnique({ where: { slug: brandSlug } })
      if (brand) productWhere.brandId = brand.id
    }

    // Count total
    const total = await prisma.product.count({ where: productWhere })

    // Sort mapping
    let orderBy: any = { popularityScore: 'desc' }
    if (sortBy === 'name') orderBy = { name: 'asc' }
    else if (sortBy === 'newest') orderBy = { createdAt: 'desc' }

    // Fetch products with best offer
    const products = await prisma.product.findMany({
      where: productWhere,
      include: {
        brand: { select: { name: true, slug: true } },
        listings: {
          where: { status: 'ACTIVE' },
          include: {
            source: { select: { slug: true, name: true } },
            offers: {
              where: { isActive: true },
              orderBy: { currentPrice: 'asc' },
              take: 3,
              select: {
                id: true,
                currentPrice: true,
                originalPrice: true,
                isFreeShipping: true,
                offerScore: true,
                affiliateUrl: true,
                couponText: true,
              },
            },
          },
        },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit + 20, // Fetch extra to filter post-query
    })

    // Post-query filtering (price range, source, free shipping)
    const filtered = products
      .map((product) => {
        let allOffers = product.listings.flatMap((l) =>
          l.offers.map((o) => ({
            ...o,
            sourceSlug: l.source.slug,
            sourceName: l.source.name,
            rating: l.rating,
            reviewsCount: l.reviewsCount,
            salesCount: l.salesCountEstimate,
            imageUrl: l.imageUrl,
          }))
        )

        // Filter offers
        if (sourceSlug) {
          allOffers = allOffers.filter((o) => o.sourceSlug === sourceSlug)
        }
        if (freeShipping) {
          allOffers = allOffers.filter((o) => o.isFreeShipping)
        }
        if (minPrice > 0) {
          allOffers = allOffers.filter((o) => o.currentPrice >= minPrice)
        }
        if (maxPrice > 0) {
          allOffers = allOffers.filter((o) => o.currentPrice <= maxPrice)
        }

        if (allOffers.length === 0) return null

        const bestOffer = allOffers.sort((a, b) => a.currentPrice - b.currentPrice)[0]
        const discount =
          bestOffer.originalPrice && bestOffer.originalPrice > bestOffer.currentPrice
            ? Math.round(
                ((bestOffer.originalPrice - bestOffer.currentPrice) /
                  bestOffer.originalPrice) *
                  100
              )
            : null

        return {
          id: product.id,
          name: product.name,
          slug: product.slug,
          imageUrl: product.imageUrl,
          brand: product.brand?.name || null,
          brandSlug: product.brand?.slug || null,
          popularityScore: product.popularityScore,
          originType: product.originType,
          bestOffer: {
            id: bestOffer.id,
            currentPrice: bestOffer.currentPrice,
            originalPrice: bestOffer.originalPrice,
            isFreeShipping: bestOffer.isFreeShipping,
            offerScore: bestOffer.offerScore,
            sourceSlug: bestOffer.sourceSlug,
            sourceName: bestOffer.sourceName,
            couponText: bestOffer.couponText,
            affiliateUrl: bestOffer.affiliateUrl,
          },
          discount,
          sourcesCount: new Set(allOffers.map((o) => o.sourceSlug)).size,
          offersCount: allOffers.length,
          rating: allOffers[0]?.rating || null,
          reviewsCount: allOffers[0]?.reviewsCount || null,
          salesCount: allOffers[0]?.salesCount || null,
        }
      })
      .filter(Boolean)

    // Apply sort that requires offer data
    if (sortBy === 'price_asc') {
      filtered.sort((a, b) => (a!.bestOffer.currentPrice || 0) - (b!.bestOffer.currentPrice || 0))
    } else if (sortBy === 'price_desc') {
      filtered.sort((a, b) => (b!.bestOffer.currentPrice || 0) - (a!.bestOffer.currentPrice || 0))
    } else if (sortBy === 'discount') {
      filtered.sort((a, b) => (b!.discount || 0) - (a!.discount || 0))
    } else if (sortBy === 'score') {
      filtered.sort((a, b) => (b!.bestOffer.offerScore || 0) - (a!.bestOffer.offerScore || 0))
    }

    // Trim to actual page limit
    const pageProducts = filtered.slice(0, limit)

    // Aggregate filter options from all products
    const brandCounts: Record<string, { count: number; slug: string }> = {}
    const sourceCounts: Record<string, number> = {}
    const priceMin = filtered.reduce((m, p) => Math.min(m, p!.bestOffer.currentPrice), Infinity)
    const priceMax = filtered.reduce((m, p) => Math.max(m, p!.bestOffer.currentPrice), 0)

    for (const p of filtered) {
      if (p!.brand && p!.brandSlug) {
        if (!brandCounts[p!.brand]) brandCounts[p!.brand] = { count: 0, slug: p!.brandSlug }
        brandCounts[p!.brand].count++
      }
    }

    // Get source counts from all listings in category
    products.forEach((p) =>
      p.listings.forEach((l) => {
        const s = l.source.slug
        sourceCounts[s] = (sourceCounts[s] || 0) + 1
      })
    )

    return NextResponse.json({
      category: {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        seoTitle: category.seoTitle,
        seoDescription: category.seoDescription,
        icon: category.icon,
        parent: category.parent,
        children: category.children,
      },
      products: pageProducts,
      pagination: {
        page,
        limit,
        total,
        totalFiltered: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
        hasNext: page * limit < filtered.length,
      },
      filters: {
        brands: Object.entries(brandCounts)
          .map(([name, { count, slug }]) => ({ name, slug, count }))
          .sort((a, b) => b.count - a.count),
        sources: Object.entries(sourceCounts)
          .map(([slug, count]) => ({ slug, count }))
          .sort((a, b) => b.count - a.count),
        priceRange: {
          min: priceMin === Infinity ? 0 : Math.floor(priceMin),
          max: Math.ceil(priceMax),
        },
        sorting: [
          { key: 'popularity', label: 'Mais populares' },
          { key: 'price_asc', label: 'Menor preço' },
          { key: 'price_desc', label: 'Maior preço' },
          { key: 'discount', label: 'Maior desconto' },
          { key: 'score', label: 'Melhor oferta' },
          { key: 'newest', label: 'Mais recentes' },
        ],
      },
    })
  } catch (err) {
    logger.error('api.categories.slug.error', { slug, error: String(err) })
    return NextResponse.json({ error: 'Failed to fetch category' }, { status: 500 })
  }
}
