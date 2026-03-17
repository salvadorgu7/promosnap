import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { rateLimit, rateLimitResponse } from '@/lib/security/rate-limit'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/products/[slug] — Public product detail API
 *
 * Returns canonical product with:
 * - All active offers across sources (multi-store comparison)
 * - Price history (last 90 days)
 * - Badges and trust signals
 * - Related products
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const rl = rateLimit(req, 'public')
  if (!rl.success) return rateLimitResponse(rl)

  const { slug } = await params

  try {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        brand: { select: { id: true, name: true, slug: true, logoUrl: true } },
        category: { select: { id: true, name: true, slug: true, parentId: true } },
        variants: {
          select: {
            id: true,
            variantName: true,
            color: true,
            size: true,
            storage: true,
            gtin: true,
          },
        },
        listings: {
          where: { status: 'ACTIVE' },
          include: {
            source: { select: { name: true, slug: true, logoUrl: true } },
            offers: {
              where: { isActive: true },
              orderBy: { offerScore: 'desc' },
              select: {
                id: true,
                currentPrice: true,
                originalPrice: true,
                couponText: true,
                shippingPrice: true,
                isFreeShipping: true,
                offerScore: true,
                affiliateUrl: true,
                lastSeenAt: true,
                createdAt: true,
              },
            },
          },
        },
      },
    })

    if (!product || product.status === 'INACTIVE') {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Flatten all active offers across listings with source info
    const offers = product.listings
      .flatMap((listing) =>
        listing.offers.map((offer) => ({
          id: offer.id,
          sourceSlug: listing.source.slug,
          sourceName: listing.source.name,
          sourceLogoUrl: listing.source.logoUrl,
          externalId: listing.externalId,
          listingTitle: listing.rawTitle,
          currentPrice: offer.currentPrice,
          originalPrice: offer.originalPrice,
          couponText: offer.couponText,
          shippingPrice: offer.shippingPrice,
          isFreeShipping: offer.isFreeShipping,
          offerScore: offer.offerScore,
          affiliateUrl: offer.affiliateUrl,
          rating: listing.rating,
          reviewsCount: listing.reviewsCount,
          salesCount: listing.salesCountEstimate,
          availability: listing.availability,
          imageUrl: listing.imageUrl,
          lastSeenAt: offer.lastSeenAt,
        }))
      )
      .sort((a, b) => a.currentPrice - b.currentPrice) // Cheapest first

    // Best offer (cheapest active)
    const bestOffer = offers[0] || null

    // Discount info
    const discount =
      bestOffer && bestOffer.originalPrice && bestOffer.originalPrice > bestOffer.currentPrice
        ? Math.round(
            ((bestOffer.originalPrice - bestOffer.currentPrice) / bestOffer.originalPrice) * 100
          )
        : null

    // Price history: last 90 days from all offers of this product
    const offerIds = offers.map((o) => o.id)
    const priceHistory =
      offerIds.length > 0
        ? await prisma.priceSnapshot.findMany({
            where: {
              offerId: { in: offerIds },
              capturedAt: { gte: new Date(Date.now() - 90 * 86400000) },
            },
            select: {
              price: true,
              originalPrice: true,
              capturedAt: true,
              offerId: true,
            },
            orderBy: { capturedAt: 'asc' },
            take: 500,
          })
        : []

    // Price stats
    const prices = priceHistory.map((s) => s.price)
    const priceStats =
      prices.length > 0
        ? {
            min: Math.min(...prices),
            max: Math.max(...prices),
            avg: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100,
            current: bestOffer?.currentPrice || 0,
            isLowest30d:
              bestOffer !== null &&
              Math.min(...prices) >= bestOffer.currentPrice,
            dataPoints: prices.length,
          }
        : null

    // Badges
    const badges: string[] = []
    if (discount && discount >= 40) badges.push('hot_deal')
    if (priceStats?.isLowest30d) badges.push('lowest_price_30d')
    if (bestOffer?.isFreeShipping) badges.push('free_shipping')
    if (bestOffer?.couponText) badges.push('has_coupon')
    if (offers.length >= 2) badges.push('multi_source')
    if ((offers[0]?.salesCount || 0) > 1000) badges.push('best_seller')

    // Unique sources
    const sources = [...new Set(offers.map((o) => o.sourceSlug))]

    // Related products (same category, different product)
    const related = product.categoryId
      ? await prisma.product.findMany({
          where: {
            categoryId: product.categoryId,
            id: { not: product.id },
            status: 'ACTIVE',
          },
          select: {
            id: true,
            name: true,
            slug: true,
            imageUrl: true,
            popularityScore: true,
            brand: { select: { name: true } },
            listings: {
              where: { status: 'ACTIVE' },
              select: {
                offers: {
                  where: { isActive: true },
                  select: { currentPrice: true, originalPrice: true, isFreeShipping: true },
                  orderBy: { currentPrice: 'asc' },
                  take: 1,
                },
              },
              take: 1,
            },
          },
          orderBy: { popularityScore: 'desc' },
          take: 8,
        })
      : []

    const relatedProducts = related.map((r) => {
      const cheapest = r.listings[0]?.offers[0]
      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        imageUrl: r.imageUrl,
        brand: r.brand?.name || null,
        currentPrice: cheapest?.currentPrice || null,
        originalPrice: cheapest?.originalPrice || null,
        isFreeShipping: cheapest?.isFreeShipping || false,
      }
    })

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        imageUrl: product.imageUrl,
        images: product.images,
        specsJson: product.specsJson,
        status: product.status,
        popularityScore: product.popularityScore,
        editorialScore: product.editorialScore,
        originType: product.originType,
        brand: product.brand,
        category: product.category,
        variants: product.variants,
      },
      offers,
      bestOffer,
      discount,
      priceStats,
      priceHistory: priceHistory.map((s) => ({
        price: s.price,
        originalPrice: s.originalPrice,
        date: s.capturedAt,
      })),
      badges,
      sources,
      relatedProducts,
    })
  } catch (err) {
    logger.error('api.products.slug.error', { slug, error: String(err) })
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 })
  }
}
