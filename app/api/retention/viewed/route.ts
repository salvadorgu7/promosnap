import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { buildProductCard } from '@/lib/db/queries'
import { PRODUCT_INCLUDE } from '@/lib/db/queries'

/**
 * GET /api/retention/viewed?slugs=slug1,slug2,...
 * Returns recently viewed products with current prices for the retention rail.
 */
export async function GET(req: NextRequest) {
  const slugsParam = req.nextUrl.searchParams.get('slugs')
  if (!slugsParam) return NextResponse.json({ items: [] })

  const slugs = slugsParam.split(',').filter(Boolean).slice(0, 8)
  if (slugs.length === 0) return NextResponse.json({ items: [] })

  try {
    const products = await prisma.product.findMany({
      where: { slug: { in: slugs }, status: 'ACTIVE' },
      include: PRODUCT_INCLUDE,
      take: 8,
    })

    const items = products
      .map(p => {
        const card = buildProductCard(p)
        if (!card) return null
        return {
          type: 'recently_viewed' as const,
          product: card,
        }
      })
      .filter(Boolean)

    return NextResponse.json({ items })
  } catch {
    return NextResponse.json({ items: [] })
  }
}
