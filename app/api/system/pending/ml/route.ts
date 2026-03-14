import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import prisma from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/system/pending/ml
 *
 * Returns pending/stale ML products.
 * Useful for monitoring catalog freshness and import gaps.
 */
export async function GET(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  try {
    const now = new Date()
    const staleThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days
    const veryStaleThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days

    // Get ML source
    const mlSource = await prisma.source.findUnique({ where: { slug: 'mercadolivre' } })
    if (!mlSource) {
      return NextResponse.json({
        status: 'no_source',
        message: 'Fonte Mercado Livre nao encontrada. Importe produtos primeiro.',
        stale: [],
        veryStale: [],
        noPrice: [],
        stats: { total: 0, stale: 0, veryStale: 0, noPrice: 0, healthy: 0 },
      })
    }

    // Counts
    const [totalListings, staleCount, veryStaleCount, noPriceCount] = await Promise.all([
      prisma.listing.count({ where: { sourceId: mlSource.id, status: 'ACTIVE' } }),
      prisma.offer.count({
        where: {
          isActive: true,
          lastSeenAt: { lt: staleThreshold },
          listing: { sourceId: mlSource.id },
        },
      }),
      prisma.offer.count({
        where: {
          isActive: true,
          lastSeenAt: { lt: veryStaleThreshold },
          listing: { sourceId: mlSource.id },
        },
      }),
      prisma.offer.count({
        where: {
          isActive: true,
          currentPrice: 0,
          listing: { sourceId: mlSource.id },
        },
      }),
    ])

    // Sample stale items (for display)
    const staleItems = await prisma.offer.findMany({
      where: {
        isActive: true,
        lastSeenAt: { lt: staleThreshold },
        listing: { sourceId: mlSource.id },
      },
      select: {
        id: true,
        currentPrice: true,
        lastSeenAt: true,
        listing: {
          select: {
            externalId: true,
            rawTitle: true,
            productUrl: true,
          },
        },
      },
      orderBy: { lastSeenAt: 'asc' },
      take: 20,
    })

    // Sample items with no price
    const noPriceItems = await prisma.offer.findMany({
      where: {
        isActive: true,
        currentPrice: 0,
        listing: { sourceId: mlSource.id },
      },
      select: {
        id: true,
        lastSeenAt: true,
        listing: {
          select: {
            externalId: true,
            rawTitle: true,
          },
        },
      },
      take: 10,
    })

    // Recent imports (last 7 days)
    const recentImports = await prisma.listing.count({
      where: {
        sourceId: mlSource.id,
        createdAt: { gte: staleThreshold },
      },
    })

    const healthy = totalListings - staleCount

    return NextResponse.json({
      status: 'ok',
      stats: {
        total: totalListings,
        healthy,
        stale: staleCount,
        veryStale: veryStaleCount,
        noPrice: noPriceCount,
        recentImports,
      },
      stale: staleItems.map(o => ({
        offerId: o.id,
        externalId: o.listing.externalId,
        title: o.listing.rawTitle,
        price: o.currentPrice,
        lastSeen: o.lastSeenAt,
        productUrl: o.listing.productUrl,
      })),
      noPrice: noPriceItems.map(o => ({
        offerId: o.id,
        externalId: o.listing.externalId,
        title: o.listing.rawTitle,
      })),
    })
  } catch (error) {
    console.error('[system/pending/ml] Error:', error)
    return NextResponse.json(
      { error: 'Falha ao verificar pendencias ML' },
      { status: 500 }
    )
  }
}
