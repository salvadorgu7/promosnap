import prisma from './prisma'
import type { ProductCard, Badge } from '@/types'

function computeBadges(offerScore: number, discount: number, isFreeShipping: boolean): Badge[] {
  const badges: Badge[] = []
  if (offerScore >= 80) badges.push({ type: 'hot_deal', label: '🔥 Oferta Quente', color: 'hot_deal' })
  if (discount >= 30) badges.push({ type: 'price_drop', label: `📉 -${discount}%`, color: 'price_drop' })
  if (isFreeShipping) badges.push({ type: 'free_shipping', label: '🚚 Frete grátis', color: 'free_shipping' })
  return badges
}

function offerToProductCard(offer: {
  id: string
  currentPrice: number
  originalPrice: number | null
  offerScore: number
  affiliateUrl: string | null
  isFreeShipping: boolean
  listing: {
    id: string
    externalId: string
    rawTitle: string
    imageUrl: string | null
    rawBrand: string | null
    rawCategory: string | null
    salesCountEstimate: number | null
    productUrl: string
    source: { slug: string; name: string }
    _count: { offers: number }
  }
}): ProductCard {
  const discount = offer.originalPrice && offer.originalPrice > offer.currentPrice
    ? Math.round((1 - offer.currentPrice / offer.originalPrice) * 100)
    : undefined

  return {
    id: offer.listing.id,
    name: offer.listing.rawTitle,
    slug: offer.listing.externalId,
    imageUrl: offer.listing.imageUrl ?? undefined,
    brand: offer.listing.rawBrand ?? undefined,
    category: offer.listing.rawCategory ?? undefined,
    bestOffer: {
      price: offer.currentPrice,
      originalPrice: offer.originalPrice ?? undefined,
      discount,
      sourceSlug: offer.listing.source.slug,
      sourceName: offer.listing.source.name,
      affiliateUrl: offer.affiliateUrl || offer.listing.productUrl,
      isFreeShipping: offer.isFreeShipping,
      offerScore: offer.offerScore,
    },
    offersCount: offer.listing._count.offers,
    popularityScore: offer.listing.salesCountEstimate ?? 0,
    badges: computeBadges(offer.offerScore, discount ?? 0, offer.isFreeShipping),
  }
}

const includeListingWithSource = {
  listing: {
    include: {
      source: true,
      _count: { select: { offers: true } },
    },
  },
}

export async function getHotOffers(limit = 12): Promise<ProductCard[]> {
  const offers = await prisma.offer.findMany({
    where: { isActive: true, listing: { status: 'ACTIVE' } },
    include: includeListingWithSource,
    orderBy: { offerScore: 'desc' },
    distinct: ['listingId'],
    take: limit,
  })
  return offers.map(offerToProductCard)
}

export async function getBestSellers(limit = 12): Promise<ProductCard[]> {
  const listings = await prisma.listing.findMany({
    where: {
      status: 'ACTIVE',
      salesCountEstimate: { gt: 0 },
      offers: { some: { isActive: true } },
    },
    include: {
      source: true,
      _count: { select: { offers: true } },
      offers: {
        where: { isActive: true },
        orderBy: { offerScore: 'desc' },
        take: 1,
      },
    },
    orderBy: { salesCountEstimate: 'desc' },
    take: limit,
  })

  return listings
    .filter((l) => l.offers.length > 0)
    .map((l) => {
      const offer = l.offers[0]
      return offerToProductCard({
        ...offer,
        listing: { ...l, source: l.source, _count: l._count },
      })
    })
}

export async function getLowestPrices(limit = 12): Promise<ProductCard[]> {
  const offers = await prisma.offer.findMany({
    where: {
      isActive: true,
      originalPrice: { not: null },
      listing: { status: 'ACTIVE' },
    },
    include: includeListingWithSource,
    orderBy: [{ offerScore: 'desc' }],
    distinct: ['listingId'],
    take: limit * 3,
  })

  // Sort by discount % descending
  const sorted = offers
    .filter((o) => o.originalPrice && o.originalPrice > o.currentPrice)
    .sort((a, b) => {
      const discA = 1 - a.currentPrice / a.originalPrice!
      const discB = 1 - b.currentPrice / b.originalPrice!
      return discB - discA
    })
    .slice(0, limit)

  return sorted.map(offerToProductCard)
}

export async function searchListings(
  query: string,
  sort: 'relevance' | 'price_asc' | 'score' = 'relevance',
  limit = 40
): Promise<ProductCard[]> {
  const where = {
    isActive: true,
    listing: {
      status: 'ACTIVE' as const,
      ...(query ? {
        OR: [
          { rawTitle: { contains: query, mode: 'insensitive' as const } },
          { rawBrand: { contains: query, mode: 'insensitive' as const } },
          { rawCategory: { contains: query, mode: 'insensitive' as const } },
        ],
      } : {}),
    },
  }

  const orderBy =
    sort === 'price_asc' ? { currentPrice: 'asc' as const }
    : sort === 'score'   ? { offerScore: 'desc' as const }
    : { offerScore: 'desc' as const }

  const offers = await prisma.offer.findMany({
    where,
    include: includeListingWithSource,
    orderBy,
    distinct: ['listingId'],
    take: limit,
  })

  return offers.map(offerToProductCard)
}

export async function getListingByExternalId(externalId: string) {
  const listing = await prisma.listing.findFirst({
    where: { externalId, status: 'ACTIVE' },
    include: {
      source: true,
      offers: {
        where: { isActive: true },
        orderBy: { offerScore: 'desc' },
        include: {
          priceSnapshots: {
            orderBy: { capturedAt: 'asc' },
            take: 90,
          },
        },
      },
    },
  })
  return listing
}

export async function getSiteStats() {
  const [offersCount, sourcesCount] = await Promise.all([
    prisma.offer.count({ where: { isActive: true } }),
    prisma.source.count({ where: { status: 'ACTIVE' } }),
  ])
  return { offersCount, sourcesCount }
}
