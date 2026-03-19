import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

/**
 * POST /api/search/click — Track search result clicks
 * Updates SearchLog.clickedProductId when a user clicks a product from search results.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { searchLogId, productId } = body

    if (!searchLogId || !productId) {
      return NextResponse.json({ error: 'searchLogId and productId required' }, { status: 400 })
    }

    // Validate IDs are reasonable strings (cuid format)
    if (typeof searchLogId !== 'string' || searchLogId.length > 50) {
      return NextResponse.json({ error: 'Invalid searchLogId' }, { status: 400 })
    }
    if (typeof productId !== 'string' || productId.length > 50) {
      return NextResponse.json({ error: 'Invalid productId' }, { status: 400 })
    }

    // Fire-and-forget update — don't block the response
    prisma.searchLog.update({
      where: { id: searchLogId },
      data: { clickedProductId: productId },
    }).catch((err) => {
      logger.warn('search.click.update-failed', { searchLogId, productId, error: err })
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
