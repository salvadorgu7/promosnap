import { NextRequest, NextResponse } from "next/server"
import { validateAdmin } from "@/lib/auth/admin"
import prisma from "@/lib/db/prisma"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

/**
 * GET  — Preview: show offers with bad URLs (competitor trackers, wrong source, etc.)
 * POST — Fix: correct affiliate URLs, listing productUrls, and source associations
 */

// Competitor/tracker domains — never valid as product URLs
const BLOCKED_DOMAINS = [
  "tempromo.app.br", "tempromo.com.br",
  "pelando.com.br", "promobit.com.br", "gatry.com",
  "ctt.cx", "bit.ly", "cutt.ly", "is.gd", "t.co", "tinyurl.com", "encurt.me",
]

// Marketplace domain → source slug mapping
const MARKETPLACE_MAP: Record<string, string> = {
  "mercadolivre.com.br": "mercadolivre",
  "mercadolibre.com": "mercadolivre",
  "amazon.com.br": "amazon-br",
  "shopee.com.br": "shopee",
  "magazineluiza.com.br": "magalu",
  "magalu.com": "magalu",
  "americanas.com.br": "americanas",
  "casasbahia.com.br": "casas-bahia",
  "kabum.com.br": "kabum",
  "aliexpress.com": "aliexpress",
}

function getHostname(url: string): string {
  try { return new URL(url).hostname.toLowerCase() } catch { return "" }
}

function isBadUrl(url: string): boolean {
  const host = getHostname(url)
  return BLOCKED_DOMAINS.some((d) => host.includes(d))
}

function isMarketplaceUrl(url: string): boolean {
  const host = getHostname(url)
  return Object.keys(MARKETPLACE_MAP).some((d) => host.includes(d))
}

function detectSourceSlug(url: string): string | null {
  const host = getHostname(url)
  for (const [domain, slug] of Object.entries(MARKETPLACE_MAP)) {
    if (host.includes(domain)) return slug
  }
  return null
}

interface BadOffer {
  offerId: string
  currentUrl: string
  externalId: string
  productName: string
  productSlug: string
  issue: string // "blocked_domain" | "non_marketplace" | "wrong_source"
}

export async function GET(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  const offers = await prisma.offer.findMany({
    where: { isActive: true, affiliateUrl: { not: null } },
    select: {
      id: true,
      affiliateUrl: true,
      listing: {
        select: {
          externalId: true,
          productUrl: true,
          source: { select: { slug: true } },
          product: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  })

  const badOffers: BadOffer[] = []

  for (const o of offers) {
    const url = o.affiliateUrl!
    let issue: string | null = null

    if (isBadUrl(url)) {
      issue = "blocked_domain"
    } else if (!isMarketplaceUrl(url) && !url.startsWith("#")) {
      // URL is not a known marketplace and not a placeholder
      issue = "non_marketplace"
    } else {
      // Check if source slug matches the URL domain
      const detectedSlug = detectSourceSlug(url)
      if (detectedSlug && o.listing.source?.slug && detectedSlug !== o.listing.source.slug) {
        issue = "wrong_source"
      }
    }

    if (issue) {
      badOffers.push({
        offerId: o.id,
        currentUrl: url,
        externalId: o.listing.externalId,
        productName: o.listing.product?.name ?? "—",
        productSlug: o.listing.product?.slug ?? "—",
        issue,
      })
    }
  }

  return NextResponse.json({
    totalOffers: offers.length,
    badOffers: badOffers.length,
    items: badOffers,
  })
}

export async function POST(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  const offers = await prisma.offer.findMany({
    where: { isActive: true, affiliateUrl: { not: null } },
    select: {
      id: true,
      affiliateUrl: true,
      listing: {
        select: {
          id: true,
          externalId: true,
          productUrl: true,
          sourceId: true,
          source: { select: { slug: true } },
        },
      },
    },
  })

  // Get all sources for re-assignment
  const sources = await prisma.source.findMany({ select: { id: true, slug: true } })
  const sourceBySlug = new Map(sources.map(s => [s.slug, s.id]))

  let fixed = 0
  let rebuilt = 0
  let nullified = 0
  let sourceFixed = 0

  for (const offer of offers) {
    const url = offer.affiliateUrl!
    const isBlocked = isBadUrl(url)
    const isNonMarketplace = !isMarketplaceUrl(url) && !url.startsWith("#")
    const detectedSlug = detectSourceSlug(url)
    const currentSourceSlug = offer.listing.source?.slug
    const wrongSource = detectedSlug && currentSourceSlug && detectedSlug !== currentSourceSlug

    if (!isBlocked && !isNonMarketplace && !wrongSource) continue

    const externalId = offer.listing.externalId
    const mlMatch = externalId?.match(/^MLB\d+$/)

    let newUrl: string | null = null

    if (isBlocked || isNonMarketplace) {
      // URL is bad — try to rebuild from MLB ID or nullify
      if (mlMatch) {
        newUrl = `https://www.mercadolivre.com.br/p/${externalId}`
        rebuilt++
      } else {
        nullified++
      }

      await prisma.offer.update({
        where: { id: offer.id },
        data: { affiliateUrl: newUrl },
      })

      // Fix listing productUrl too
      if (offer.listing.productUrl && (isBadUrl(offer.listing.productUrl) || !isMarketplaceUrl(offer.listing.productUrl))) {
        await prisma.listing.update({
          where: { id: offer.listing.id },
          data: { productUrl: newUrl || "" },
        })
      }
    }

    // Fix source assignment if URL points to a different marketplace
    if (wrongSource && detectedSlug) {
      const correctSourceId = sourceBySlug.get(detectedSlug)
      if (correctSourceId && correctSourceId !== offer.listing.sourceId) {
        await prisma.listing.update({
          where: { id: offer.listing.id },
          data: { sourceId: correctSourceId },
        })
        sourceFixed++
      }
    }

    fixed++
  }

  logger.info("fix-urls.completed", { fixed, rebuilt, nullified, sourceFixed })

  return NextResponse.json({
    success: true,
    fixed,
    rebuilt,
    nullified,
    sourceFixed,
    message: `${fixed} ofertas corrigidas: ${rebuilt} URLs reconstruidas, ${nullified} removidas, ${sourceFixed} sources corrigidos`,
  })
}
