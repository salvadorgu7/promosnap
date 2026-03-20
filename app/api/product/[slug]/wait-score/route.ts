import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { computeWaitScore } from '@/lib/decision/wait-score'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  try {
    const product = await prisma.product.findUnique({
      where: { slug },
      select: {
        id: true,
        category: { select: { slug: true } },
        listings: {
          where: { status: 'ACTIVE' },
          select: {
            offers: {
              where: { isActive: true },
              orderBy: { currentPrice: 'asc' },
              take: 1,
              select: {
                currentPrice: true,
                priceSnapshots: {
                  orderBy: { capturedAt: 'asc' },
                  select: { price: true, originalPrice: true, capturedAt: true },
                },
              },
            },
          },
        },
      },
    })

    if (!product) {
      return NextResponse.json({ score: 0, shouldWait: false, reason: 'Produto nao encontrado' })
    }

    // Get best offer and its snapshots
    const allOffers = product.listings.flatMap(l => l.offers)
    const bestOffer = allOffers[0]
    if (!bestOffer || bestOffer.priceSnapshots.length < 3) {
      return NextResponse.json({ score: 0, shouldWait: false, reason: 'Dados insuficientes' })
    }

    const waitScore = computeWaitScore(
      bestOffer.priceSnapshots,
      bestOffer.currentPrice,
      product.category?.slug
    )

    return NextResponse.json(waitScore, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800' },
    })
  } catch {
    return NextResponse.json({ score: 0, shouldWait: false, reason: 'Erro interno' }, { status: 500 })
  }
}
