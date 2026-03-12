import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { buildProductCard, PRODUCT_INCLUDE } from "@/lib/db/queries"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const categoriesParam = searchParams.get("categories")
  const limitParam = searchParams.get("limit")
  const excludeSlug = searchParams.get("exclude")

  if (!categoriesParam) {
    return NextResponse.json([])
  }

  const categories = categoriesParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10)

  if (categories.length === 0) {
    return NextResponse.json([])
  }

  const limit = Math.min(Math.max(parseInt(limitParam || "8", 10) || 8, 1), 24)

  try {
    const where: any = {
      status: "ACTIVE",
      category: { slug: { in: categories } },
      listings: { some: { offers: { some: { isActive: true } } } },
    }

    if (excludeSlug) {
      where.slug = { not: excludeSlug }
    }

    const products = await prisma.product.findMany({
      where,
      include: PRODUCT_INCLUDE,
      take: limit * 2, // fetch extra to allow filtering
      orderBy: { popularityScore: "desc" },
    })

    const cards = products
      .map(buildProductCard)
      .filter(Boolean)
      .slice(0, limit)

    return NextResponse.json(cards)
  } catch (error) {
    console.error("Failed to fetch recommendations:", error)
    return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 })
  }
}
