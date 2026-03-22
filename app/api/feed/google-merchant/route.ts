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

/** Infer brand from product name when not available in DB */
const KNOWN_BRANDS = [
  "Apple", "Samsung", "Xiaomi", "Motorola", "LG", "Sony", "JBL", "Philips",
  "Bose", "Dell", "Lenovo", "HP", "Asus", "Acer", "MSI", "Intel", "AMD",
  "Logitech", "Razer", "HyperX", "Corsair", "Kingston", "SanDisk", "WD",
  "Seagate", "TP-Link", "Intelbras", "Positivo", "Multilaser", "Mondial",
  "Electrolux", "Brastemp", "Consul", "Arno", "Britânia", "Cadence",
  "Nintendo", "Microsoft", "Google", "Amazon", "Huawei", "Realme", "POCO",
  "OnePlus", "Redmi", "Galaxy", "iPhone", "MacBook", "iPad", "AirPods",
  "PlayStation", "Xbox", "Brinox", "Tramontina", "Oster", "Nespresso",
]

function inferBrandFromName(name: string): string {
  const lower = name.toLowerCase()
  for (const brand of KNOWN_BRANDS) {
    if (lower.includes(brand.toLowerCase())) return brand
  }
  return ""
}

/** Map internal category to Google product taxonomy ID */
const GOOGLE_CATEGORY_MAP: Record<string, string> = {
  "celulares": "267",           // Electronics > Communications > Telephony > Mobile Phones
  "smartphones": "267",
  "notebooks": "328",           // Electronics > Computers > Laptops
  "informatica": "325",         // Electronics > Computers
  "computadores": "325",
  "audio": "232",               // Electronics > Audio
  "fones": "232",
  "smart-tvs": "404",           // Electronics > Video > Televisions
  "televisores": "404",
  "eletrodomesticos": "604",    // Home & Garden > Kitchen & Dining > Small Kitchen Appliances
  "casa": "536",                // Home & Garden
  "gamer": "1279",              // Electronics > Video Game Consoles & Accessories
  "games": "1279",
  "tablets": "4745",            // Electronics > Computers > Tablet Computers
  "cameras": "178",             // Cameras & Optics
  "relogios": "201",            // Apparel & Accessories > Watches
  "beleza": "469",              // Health & Beauty
  "esportes": "990",            // Sporting Goods
  "brinquedos": "1253",         // Toys & Games
}

function mapGoogleCategory(category: string, productName: string): string {
  const catSlug = category.toLowerCase().replace(/\s+/g, "-")
  if (GOOGLE_CATEGORY_MAP[catSlug]) return GOOGLE_CATEGORY_MAP[catSlug]

  // Infer from product name
  const lower = productName.toLowerCase()
  if (lower.includes("iphone") || lower.includes("galaxy") || lower.includes("celular") || lower.includes("smartphone")) return "267"
  if (lower.includes("notebook") || lower.includes("laptop") || lower.includes("macbook")) return "328"
  if (lower.includes("fone") || lower.includes("headphone") || lower.includes("earbuds") || lower.includes("jbl") || lower.includes("airpods")) return "232"
  if (lower.includes("tv") || lower.includes("smart tv") || lower.includes("televisor")) return "404"
  if (lower.includes("playstation") || lower.includes("xbox") || lower.includes("nintendo") || lower.includes("ps5")) return "1279"
  if (lower.includes("tablet") || lower.includes("ipad")) return "4745"
  if (lower.includes("air fryer") || lower.includes("cafeteira") || lower.includes("liquidificador") || lower.includes("panela")) return "604"
  return ""
}

/** Validate image URL format — Google Merchant accepts JPEG, PNG, GIF, BMP, TIFF, WebP */
const ACCEPTED_IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|bmp|tiff?|webp)(\?|$)/i

function isAcceptedImageUrl(url: string | null): boolean {
  if (!url || url.trim() === '') return false
  // Reject data URIs and SVGs
  if (url.startsWith('data:') || url.endsWith('.svg')) return false
  // Reject placeholder / broken URLs
  if (url.includes('placeholder') || url.includes('no-image') || url.length < 20) return false
  // Must have an accepted extension or be from a known CDN
  if (ACCEPTED_IMAGE_EXTENSIONS.test(url)) return true
  // Known CDNs that serve images without extensions (Amazon, ML, etc.)
  const trustedCDNs = ['images-na.ssl-images-amazon.com', 'm.media-amazon.com', 'http2.mlstatic.com', 'cf.shopee.com.br']
  try {
    const hostname = new URL(url).hostname
    return trustedCDNs.some(cdn => hostname.includes(cdn))
  } catch {
    return false
  }
}

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

      if (!bestOffer || !isAcceptedImageUrl(p.imageUrl)) continue

      const currentPrice = bestOffer.currentPrice
      const originalPrice = bestOffer.originalPrice
      const hasDiscount = originalPrice && originalPrice > currentPrice * 1.05

      // Google Merchant: price = regular price, sale_price = discounted price
      const displayPrice = hasDiscount ? originalPrice : currentPrice
      const salePrice = hasDiscount ? currentPrice : null

      const description = (p.description || p.name)
        .replace(/[\t\n\r]/g, " ")
        .slice(0, 500)

      // Infer brand from product name if not in DB
      const brandName = p.brand?.name || inferBrandFromName(p.name)

      const row = [
        p.id,
        p.name.replace(/[\t\n\r]/g, " ").slice(0, 150),
        description,
        `${APP_URL}/produto/${p.slug}`,
        p.imageUrl,
        `${displayPrice.toFixed(2)} BRL`,
        salePrice ? `${salePrice.toFixed(2)} BRL` : "",
        "in_stock",
        "new",
        brandName,
        p.category?.name || "",
        mapGoogleCategory(p.category?.name || "", p.name),
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
