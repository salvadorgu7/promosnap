import { NextRequest, NextResponse } from "next/server"
import { validateAdmin } from "@/lib/auth/admin"
import prisma from "@/lib/db/prisma"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

/**
 * GET  — Preview: show offers with competitor/tracker URLs
 * POST — Fix: nullify bad affiliate URLs or rebuild from MLB ID
 *
 * Blocked domains: tempromo.app.br, pelando, promobit, gatry, link shorteners, etc.
 */

const BLOCKED_DOMAINS = [
  "tempromo.app.br",
  "tempromo.com.br",
  "pelando.com.br",
  "promobit.com.br",
  "gatry.com",
  "ctt.cx",
  "bit.ly",
  "cutt.ly",
  "is.gd",
  "t.co",
  "tinyurl.com",
  "encurt.me",
]

function isBadUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return BLOCKED_DOMAINS.some((d) => hostname.includes(d))
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  // Find all offers with affiliate URLs containing blocked domains
  const offers = await prisma.offer.findMany({
    where: {
      isActive: true,
      affiliateUrl: { not: null },
    },
    select: {
      id: true,
      affiliateUrl: true,
      listing: {
        select: {
          externalId: true,
          productUrl: true,
          product: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  })

  const badOffers = offers.filter((o) => o.affiliateUrl && isBadUrl(o.affiliateUrl))

  return NextResponse.json({
    totalOffers: offers.length,
    badOffers: badOffers.length,
    items: badOffers.map((o) => ({
      offerId: o.id,
      currentUrl: o.affiliateUrl,
      externalId: o.listing.externalId,
      productName: o.listing.product?.name ?? "—",
      productSlug: o.listing.product?.slug ?? "—",
    })),
  })
}

export async function POST(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  const offers = await prisma.offer.findMany({
    where: {
      isActive: true,
      affiliateUrl: { not: null },
    },
    select: {
      id: true,
      affiliateUrl: true,
      listing: {
        select: {
          id: true,
          externalId: true,
          productUrl: true,
        },
      },
    },
  })

  const badOffers = offers.filter((o) => o.affiliateUrl && isBadUrl(o.affiliateUrl))

  let fixed = 0
  let nullified = 0
  let rebuilt = 0

  for (const offer of badOffers) {
    const externalId = offer.listing.externalId
    const mlMatch = externalId?.match(/^MLB\d+$/)

    let newUrl: string | null = null

    if (mlMatch) {
      // Rebuild ML product URL from external ID
      newUrl = `https://www.mercadolivre.com.br/p/${externalId}`
      rebuilt++
    } else {
      // No MLB ID — nullify the bad URL so the product page shows "Ver detalhes" instead
      nullified++
    }

    await prisma.offer.update({
      where: { id: offer.id },
      data: { affiliateUrl: newUrl },
    })

    // Also fix the listing productUrl if it's bad
    if (offer.listing.productUrl && isBadUrl(offer.listing.productUrl)) {
      await prisma.listing.update({
        where: { id: offer.listing.id },
        data: { productUrl: newUrl ?? "" },
      })
    }

    fixed++
  }

  logger.info("fix-urls.completed", { fixed, rebuilt, nullified })

  return NextResponse.json({
    success: true,
    fixed,
    rebuilt,
    nullified,
    message: `${fixed} ofertas corrigidas: ${rebuilt} com URL ML reconstruida, ${nullified} com URL removida`,
  })
}
