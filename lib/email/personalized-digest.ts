import prisma from "@/lib/db/prisma"
import { logger } from "@/lib/logger"

export interface PersonalizedDigestData {
  priceDrops: Array<{ name: string; price: number; previousPrice: number; url: string }>
  newInCategories: Array<{ name: string; price: number; category: string; url: string }>
  topDeals: Array<{ name: string; price: number; discount: number; url: string }>
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.promosnap.com.br"

export async function buildPersonalizedDigest(
  categories: string[],
  limit = 5
): Promise<PersonalizedDigestData> {
  const result: PersonalizedDigestData = {
    priceDrops: [],
    newInCategories: [],
    topDeals: [],
  }

  try {
    // Price drops in user's categories (last 7 days)
    const drops = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        ...(categories.length > 0 ? { category: { slug: { in: categories } } } : {}),
        listings: {
          some: {
            offers: {
              some: {
                currentPrice: { gt: 0 },
              },
            },
          },
        },
      },
      include: {
        category: { select: { name: true, slug: true } },
        listings: {
          include: {
            offers: {
              where: { isActive: true },
              orderBy: { currentPrice: "asc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    })

    for (const p of drops) {
      const offer = p.listings[0]?.offers[0]
      if (!offer) continue

      if (offer.originalPrice && offer.currentPrice < offer.originalPrice) {
        result.priceDrops.push({
          name: p.name,
          price: offer.currentPrice,
          previousPrice: offer.originalPrice,
          url: `${APP_URL}/produto/${p.slug}`,
        })
      }

      result.newInCategories.push({
        name: p.name,
        price: offer.currentPrice,
        category: p.category?.name || "Geral",
        url: `${APP_URL}/produto/${p.slug}`,
      })
    }

    // Top deals overall (high score)
    const topProducts = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        listings: {
          some: {
            offers: {
              some: { isActive: true, currentPrice: { gt: 0 } },
            },
          },
        },
      },
      include: {
        listings: {
          include: {
            offers: {
              where: { isActive: true },
              orderBy: { currentPrice: "asc" },
              take: 1,
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    })

    for (const p of topProducts) {
      const offer = p.listings[0]?.offers[0]
      if (!offer || !offer.originalPrice) continue
      const discount = Math.round(((offer.originalPrice - offer.currentPrice) / offer.originalPrice) * 100)
      if (discount > 5) {
        result.topDeals.push({
          name: p.name,
          price: offer.currentPrice,
          discount,
          url: `${APP_URL}/produto/${p.slug}`,
        })
      }
    }
  } catch (err) { logger.debug("personalized-digest.failed", { error: err }) }

  return result
}
