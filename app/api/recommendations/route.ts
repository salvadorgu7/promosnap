import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { buildProductCard, PRODUCT_INCLUDE } from "@/lib/db/queries"
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit"

export async function GET(request: NextRequest) {
  const rl = rateLimit(request, "public")
  if (!rl.success) return rateLimitResponse(rl)
  const { searchParams } = new URL(request.url)
  const categoriesParam = searchParams.get("categories")
  const brandsParam = searchParams.get("brands")
  const limitParam = searchParams.get("limit")
  const excludeParam = searchParams.get("exclude")
  const typeParam = searchParams.get("type") // "price_drops" | "new" | "brand" | default

  const categories = categoriesParam
    ? categoriesParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10)
    : []

  const brands = brandsParam
    ? brandsParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10)
    : []

  if (categories.length === 0 && brands.length === 0) {
    return NextResponse.json([])
  }

  const limit = Math.min(Math.max(parseInt(limitParam || "8", 10) || 8, 1), 24)

  // Parse exclude list (can be slugs or IDs, comma separated)
  const excludeIds = excludeParam
    ? excludeParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 50)
    : []

  try {
    const where: any = {
      status: "ACTIVE",
      listings: { some: { offers: { some: { isActive: true } } } },
    }

    // Build category/brand OR filter
    const orConditions: any[] = []
    if (categories.length > 0) {
      orConditions.push({ category: { slug: { in: categories } } })
    }
    if (brands.length > 0) {
      orConditions.push({ brand: { slug: { in: brands } } })
    }
    if (orConditions.length > 0) {
      where.OR = orConditions
    }

    // Exclude already-seen products
    if (excludeIds.length > 0) {
      where.id = { notIn: excludeIds }
    }

    // For price drop type, only get products with discounts
    if (typeParam === "price_drops") {
      where.listings.some.offers.some.originalPrice = { not: null }
    }

    // For new products type, only recent
    if (typeParam === "new") {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      where.createdAt = { gte: weekAgo }
    }

    const products = await prisma.product.findMany({
      where,
      include: PRODUCT_INCLUDE,
      take: limit * 2,
      orderBy: typeParam === "new"
        ? { createdAt: "desc" }
        : { popularityScore: "desc" },
    })

    let cards = products
      .map(buildProductCard)
      .filter(Boolean)

    // For price drops, sort by discount
    if (typeParam === "price_drops") {
      cards = cards
        .filter((p) => p!.bestOffer.discount && p!.bestOffer.discount > 5)
        .sort((a, b) => (b!.bestOffer.discount || 0) - (a!.bestOffer.discount || 0))
    }

    return NextResponse.json(cards.slice(0, limit))
  } catch (error) {
    console.error("Failed to fetch recommendations:", error)
    return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 })
  }
}
