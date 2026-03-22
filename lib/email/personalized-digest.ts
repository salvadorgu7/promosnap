import prisma from "@/lib/db/prisma"
import { logger } from "@/lib/logger"

export interface DigestProduct {
  name: string
  price: number
  previousPrice: number
  url: string
  imageUrl?: string
  source?: string
  discount?: number
}

export interface DigestNewProduct {
  name: string
  price: number
  category: string
  url: string
  imageUrl?: string
  source?: string
}

export interface DigestDeal {
  name: string
  price: number
  discount: number
  url: string
  imageUrl?: string
  source?: string
  originalPrice?: number
}

export interface PersonalizedDigestData {
  priceDrops: DigestProduct[]
  newInCategories: DigestNewProduct[]
  topDeals: DigestDeal[]
  totalSavings: number
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.promosnap.com.br"

/**
 * Busca dados para o digest personalizado, garantindo que cada secção
 * mostra produtos DIFERENTES (sem repetição).
 *
 * Secção 1: Quedas de preço em categorias do utilizador
 * Secção 2: Produtos NOVOS (adicionados recentemente) nas categorias do utilizador
 * Secção 3: Top deals gerais por offerScore (excluindo os já usados)
 */
export async function buildPersonalizedDigest(
  categories: string[],
  limit = 5
): Promise<PersonalizedDigestData> {
  const result: PersonalizedDigestData = {
    priceDrops: [],
    newInCategories: [],
    topDeals: [],
    totalSavings: 0,
  }

  // Track product IDs already used to avoid repetition across sections
  const usedProductIds = new Set<string>()

  try {
    // ─── SECÇÃO 1: Quedas de preço nas categorias do utilizador ───
    const drops = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        ...(categories.length > 0 ? { category: { slug: { in: categories } } } : {}),
        listings: {
          some: {
            offers: {
              some: {
                isActive: true,
                currentPrice: { gt: 0 },
                originalPrice: { gt: 0 },
              },
            },
          },
        },
      },
      include: {
        category: { select: { name: true, slug: true } },
        listings: {
          include: {
            source: { select: { name: true } },
            offers: {
              where: { isActive: true, currentPrice: { gt: 0 } },
              orderBy: { currentPrice: "asc" },
              take: 1,
            },
          },
          where: {
            status: "ACTIVE",
            offers: { some: { isActive: true } },
          },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limit * 2, // Fetch extra to filter
    })

    for (const p of drops) {
      if (result.priceDrops.length >= limit) break
      const offer = p.listings[0]?.offers[0]
      if (!offer) continue

      // Só incluir se realmente tem queda de preço
      if (offer.originalPrice && offer.currentPrice < offer.originalPrice) {
        const savings = offer.originalPrice - offer.currentPrice
        result.priceDrops.push({
          name: p.name,
          price: offer.currentPrice,
          previousPrice: offer.originalPrice,
          discount: Math.round((savings / offer.originalPrice) * 100),
          url: `${APP_URL}/produto/${p.slug}`,
          imageUrl: p.imageUrl || p.listings[0]?.imageUrl || undefined,
          source: p.listings[0]?.source?.name || undefined,
        })
        result.totalSavings += savings
        usedProductIds.add(p.id)
      }
    }

    // ─── SECÇÃO 2: Produtos NOVOS nas categorias do utilizador ───
    // Busca por createdAt (produtos adicionados recentemente), excluindo os já usados
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const newProducts = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        id: { notIn: Array.from(usedProductIds) },
        ...(categories.length > 0 ? { category: { slug: { in: categories } } } : {}),
        createdAt: { gte: oneWeekAgo },
        listings: {
          some: {
            offers: {
              some: { isActive: true, currentPrice: { gt: 0 } },
            },
          },
        },
      },
      include: {
        category: { select: { name: true, slug: true } },
        listings: {
          include: {
            source: { select: { name: true } },
            offers: {
              where: { isActive: true },
              orderBy: { currentPrice: "asc" },
              take: 1,
            },
          },
          where: {
            status: "ACTIVE",
            offers: { some: { isActive: true } },
          },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    for (const p of newProducts) {
      const offer = p.listings[0]?.offers[0]
      if (!offer) continue

      result.newInCategories.push({
        name: p.name,
        price: offer.currentPrice,
        category: p.category?.name || "Variados",
        url: `${APP_URL}/produto/${p.slug}`,
        imageUrl: p.imageUrl || p.listings[0]?.imageUrl || undefined,
        source: p.listings[0]?.source?.name || undefined,
      })
      usedProductIds.add(p.id)
    }

    // Se não encontrou novos da semana, busca os mais recentes sem filtro de data
    if (result.newInCategories.length === 0) {
      const recentProducts = await prisma.product.findMany({
        where: {
          status: "ACTIVE",
          id: { notIn: Array.from(usedProductIds) },
          ...(categories.length > 0 ? { category: { slug: { in: categories } } } : {}),
          listings: {
            some: {
              offers: {
                some: { isActive: true, currentPrice: { gt: 0 } },
              },
            },
          },
        },
        include: {
          category: { select: { name: true, slug: true } },
          listings: {
            include: {
              source: { select: { name: true } },
              offers: {
                where: { isActive: true },
                orderBy: { currentPrice: "asc" },
                take: 1,
              },
            },
            where: {
              status: "ACTIVE",
              offers: { some: { isActive: true } },
            },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      })

      for (const p of recentProducts) {
        const offer = p.listings[0]?.offers[0]
        if (!offer) continue

        result.newInCategories.push({
          name: p.name,
          price: offer.currentPrice,
          category: p.category?.name || "Variados",
          url: `${APP_URL}/produto/${p.slug}`,
          imageUrl: p.imageUrl || p.listings[0]?.imageUrl || undefined,
          source: p.listings[0]?.source?.name || undefined,
        })
        usedProductIds.add(p.id)
      }
    }

    // ─── SECÇÃO 3: Top deals gerais (por offerScore, excluindo repetidos) ───
    const topOffers = await prisma.offer.findMany({
      where: {
        isActive: true,
        currentPrice: { gt: 0 },
        originalPrice: { gt: 0 },
        offerScore: { gte: 30 },
        listing: {
          status: "ACTIVE",
          product: {
            status: "ACTIVE",
            id: { notIn: Array.from(usedProductIds) },
          },
        },
      },
      include: {
        listing: {
          include: {
            source: { select: { name: true } },
            product: {
              select: { id: true, name: true, slug: true, imageUrl: true },
            },
          },
        },
      },
      orderBy: { offerScore: "desc" },
      take: limit * 2,
    })

    for (const offer of topOffers) {
      if (result.topDeals.length >= limit) break
      const product = offer.listing.product
      if (!product || usedProductIds.has(product.id)) continue
      if (!offer.originalPrice || offer.currentPrice >= offer.originalPrice) continue

      const discount = Math.round(
        ((offer.originalPrice - offer.currentPrice) / offer.originalPrice) * 100
      )
      if (discount < 5) continue

      result.topDeals.push({
        name: product.name,
        price: offer.currentPrice,
        originalPrice: offer.originalPrice,
        discount,
        url: `${APP_URL}/produto/${product.slug}`,
        imageUrl: product.imageUrl || offer.listing.imageUrl || undefined,
        source: offer.listing.source?.name || undefined,
      })
      usedProductIds.add(product.id)
    }
  } catch (err) {
    logger.debug("personalized-digest.build-failed", { error: err })
  }

  return result
}
