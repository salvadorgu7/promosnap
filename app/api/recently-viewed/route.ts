import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { buildProductCard, PRODUCT_INCLUDE } from "@/lib/db/queries"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slugsParam = searchParams.get("slugs")

  if (!slugsParam) {
    return NextResponse.json([])
  }

  const slugs = slugsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20)

  if (slugs.length === 0) {
    return NextResponse.json([])
  }

  try {
    const products = await prisma.product.findMany({
      where: {
        slug: { in: slugs },
        status: "ACTIVE",
      },
      include: PRODUCT_INCLUDE,
    })

    const cards = products
      .map(buildProductCard)
      .filter(Boolean)

    // Preserve the order of the requested slugs (most recent first)
    const ordered = slugs
      .map((slug) => cards.find((c) => c!.slug === slug))
      .filter(Boolean)

    return NextResponse.json(ordered)
  } catch (error) {
    console.error("Failed to fetch recently viewed:", error)
    return NextResponse.json([], { status: 500 })
  }
}
