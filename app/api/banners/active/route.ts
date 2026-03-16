import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/db/prisma"

export const dynamic = "force-dynamic"

/**
 * GET /api/banners/active?type=STRIP&limit=3
 *
 * Public endpoint — returns currently active banners.
 * Filters by isActive, date range, and optional bannerType.
 */
export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") || undefined
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") || 5), 10)

  try {
    const now = new Date()

    const banners = await prisma.banner.findMany({
      where: {
        isActive: true,
        ...(type ? { bannerType: type as "HERO" | "MODAL" | "STRIP" | "CAROUSEL" } : {}),
        OR: [
          { startAt: null, endAt: null },
          { startAt: { lte: now }, endAt: null },
          { startAt: null, endAt: { gte: now } },
          { startAt: { lte: now }, endAt: { gte: now } },
        ],
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        title: true,
        subtitle: true,
        imageUrl: true,
        ctaText: true,
        ctaUrl: true,
        bannerType: true,
        autoMode: true,
      },
    })

    return NextResponse.json(
      { banners },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
    )
  } catch {
    return NextResponse.json({ banners: [] })
  }
}
