import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { buildProductCard, PRODUCT_INCLUDE } from "@/lib/db/queries"
import { logger } from "@/lib/logger"
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit"

// ============================================
// PUBLIC API: Updates since last visit
// Returns price drops and new products
// ============================================

export async function GET(request: NextRequest) {
  const rl = rateLimit(request, "public");
  if (!rl.success) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url)
  const sinceParam = searchParams.get("since")
  const categoriesParam = searchParams.get("categories")
  const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 20)

  if (!sinceParam) {
    return NextResponse.json({ error: "Missing 'since' parameter" }, { status: 400 })
  }

  const sinceMs = parseInt(sinceParam, 10)
  if (isNaN(sinceMs) || sinceMs <= 0) {
    return NextResponse.json({ error: "Invalid 'since' parameter" }, { status: 400 })
  }

  const sinceDate = new Date(sinceMs)
  // Clamp to max 30 days back
  const maxBack = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const effectiveSince = sinceDate > maxBack ? sinceDate : maxBack

  const categories = categoriesParam
    ? categoriesParam.split(",").map((c) => c.trim()).filter(Boolean).slice(0, 10)
    : []

  try {
    // 1. Price drops: products where current offer price is lower than recent snapshots
    const priceDropWhere: any = {
      status: "ACTIVE" as const,
      listings: {
        some: {
          offers: {
            some: {
              isActive: true,
              updatedAt: { gte: effectiveSince },
            },
          },
        },
      },
    }
    if (categories.length > 0) {
      priceDropWhere.category = { slug: { in: categories } }
    }

    const priceDropProducts = await prisma.product.findMany({
      where: priceDropWhere,
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        popularityScore: true,
        ...PRODUCT_INCLUDE,
      },
      orderBy: { popularityScore: "desc" },
      take: limit * 2,
    })

    const priceDropCards = priceDropProducts
      .map(buildProductCard)
      .filter(Boolean)
      .filter((p) => p!.bestOffer.discount && p!.bestOffer.discount > 5)
      .sort((a, b) => (b!.bestOffer.discount || 0) - (a!.bestOffer.discount || 0))
      .slice(0, limit)

    // 2. New products added since last visit
    const newProductWhere: any = {
      status: "ACTIVE" as const,
      createdAt: { gte: effectiveSince },
      listings: { some: { offers: { some: { isActive: true } } } },
    }
    if (categories.length > 0) {
      newProductWhere.category = { slug: { in: categories } }
    }

    const newProducts = await prisma.product.findMany({
      where: newProductWhere,
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        popularityScore: true,
        ...PRODUCT_INCLUDE,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    const newProductCards = newProducts
      .map(buildProductCard)
      .filter(Boolean)
      .slice(0, limit)

    return NextResponse.json({
      priceDrops: priceDropCards,
      newProducts: newProductCards,
      since: effectiveSince.toISOString(),
    })
  } catch (error) {
    logger.error("updates.fetch-failed", { error })
    return NextResponse.json({ error: "Failed to fetch updates" }, { status: 500 })
  }
}
