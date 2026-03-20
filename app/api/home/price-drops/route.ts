import { NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'

export async function GET() {
  try {
    const drops: {
      id: string
      name: string
      slug: string
      imageUrl: string | null
      currentPrice: number
      previousPrice: number
    }[] = await prisma.$queryRaw`
      WITH latest_snaps AS (
        SELECT
          p.id, p.name, p.slug, p."imageUrl",
          ps.price as "currentPrice",
          LAG(ps.price) OVER (PARTITION BY ps."offerId" ORDER BY ps."capturedAt" DESC) as "previousPrice",
          ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY ps."capturedAt" DESC) as rn
        FROM price_snapshots ps
        JOIN offers o ON ps."offerId" = o.id
        JOIN listings l ON o."listingId" = l.id
        JOIN products p ON l."productId" = p.id
        WHERE ps."capturedAt" > NOW() - INTERVAL '48 hours'
        AND o."isActive" = true
        AND p.status = 'ACTIVE'
      )
      SELECT id, name, slug, "imageUrl", "currentPrice", "previousPrice"
      FROM latest_snaps
      WHERE rn = 1
      AND "previousPrice" IS NOT NULL
      AND "currentPrice" < "previousPrice" * 0.95
      ORDER BY ("previousPrice" - "currentPrice") DESC
      LIMIT 8
    `

    const result = drops.map(d => ({
      ...d,
      discountPct: Math.round(((d.previousPrice - d.currentPrice) / d.previousPrice) * 100),
    }))

    return NextResponse.json({ drops: result }, {
      headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=900' },
    })
  } catch {
    return NextResponse.json({ drops: [] })
  }
}
