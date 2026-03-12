import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"
import { buildProductCard, PRODUCT_INCLUDE } from "@/lib/db/queries"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const idsParam = searchParams.get("ids")

  if (!idsParam) {
    return NextResponse.json([])
  }

  const ids = idsParam
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 50)

  if (ids.length === 0) {
    return NextResponse.json([])
  }

  try {
    const products = await prisma.product.findMany({
      where: {
        id: { in: ids },
        status: "ACTIVE",
      },
      include: PRODUCT_INCLUDE,
    })

    const cards = products
      .map(buildProductCard)
      .filter(Boolean)

    // Preserve the order of the requested IDs
    const ordered = ids
      .map((id) => cards.find((c) => c!.id === id))
      .filter(Boolean)

    return NextResponse.json(ordered)
  } catch (error) {
    console.error("Failed to fetch favorites:", error)
    return NextResponse.json({ error: "Failed to fetch favorites" }, { status: 500 })
  }
}
