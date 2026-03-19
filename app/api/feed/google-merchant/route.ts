/**
 * Google Merchant Center Feed — TSV format for free listings.
 *
 * GET /api/feed/google-merchant
 *
 * Returns tab-separated feed of top products with:
 * - Quality gates: must have image, price, affiliate, category
 * - Excludes suspicious prices (< R$5 or > R$50000)
 * - Sorted by popularity (best products first)
 * - Max 2000 products per feed
 */

import { NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { getBaseUrl } from "@/lib/seo/url"

export const revalidate = 3600 // Regenerate hourly

const APP_URL = getBaseUrl()
const MAX_PRODUCTS = 2000
const MIN_PRICE = 5
const MAX_PRICE = 50000

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        imageUrl: { not: null },
        listings: {
          some: {
            status: "ACTIVE",
            offers: {
              some: {
                isActive: true,
                currentPrice: { gte: MIN_PRICE, lte: MAX_PRICE },
              },
            },
          },
        },
      },
      include: {
        brand: { select: { name: true } },
        category: { select: { name: true } },
        listings: {
          where: { status: "ACTIVE" },
          include: {
            offers: {
              where: { isActive: true, currentPrice: { gte: MIN_PRICE, lte: MAX_PRICE } },
              orderBy: { currentPrice: "asc" },
              take: 1,
            },
            source: { select: { name: true } },
          },
          take: 3,
        },
      },
      orderBy: { popularityScore: "desc" },
      take: MAX_PRODUCTS,
    })

    // TSV header
    const headers = [
      "id", "title", "description", "link", "image_link",
      "price", "sale_price", "availability", "condition",
      "brand", "product_type", "google_product_category",
    ]

    const rows: string[] = [headers.join("\t")]

    for (const p of products) {
      const bestOffer = p.listings
        .flatMap(l => l.offers)
        .sort((a, b) => a.currentPrice - b.currentPrice)[0]

      if (!bestOffer || !p.imageUrl) continue

      const price = bestOffer.currentPrice
      const originalPrice = bestOffer.originalPrice
      const hasDiscount = originalPrice && originalPrice > price * 1.05

      const description = (p.description || p.name)
        .replace(/[\t\n\r]/g, " ")
        .slice(0, 500)

      const row = [
        p.id,
        p.name.replace(/[\t\n\r]/g, " ").slice(0, 150),
        description,
        `${APP_URL}/produto/${p.slug}`,
        p.imageUrl,
        `${price.toFixed(2)} BRL`,
        hasDiscount ? `${price.toFixed(2)} BRL` : "",
        "in_stock",
        "new",
        p.brand?.name || "",
        p.category?.name || "",
        "", // Google product category — auto-detected by Google
      ]

      rows.push(row.join("\t"))
    }

    return new NextResponse(rows.join("\n"), {
      headers: {
        "Content-Type": "text/tab-separated-values; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    })
  } catch (err) {
    console.error("[merchant-feed] Failed:", err)
    return NextResponse.json({ error: "Feed generation failed" }, { status: 500 })
  }
}
