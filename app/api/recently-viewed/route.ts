import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { buildProductCard, PRODUCT_INCLUDE } from "@/lib/db/queries"
import { logger } from "@/lib/logger"
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit"

export async function GET(request: NextRequest) {
  const rl = rateLimit(request, "public");
  if (!rl.success) return rateLimitResponse(rl);

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
    logger.error("recently-viewed.fetch-failed", { error })
    return NextResponse.json({ error: "Failed to fetch recently viewed" }, { status: 500 })
  }
}
