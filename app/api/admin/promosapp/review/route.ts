import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { rateLimit, rateLimitResponse } from '@/lib/security/rate-limit'
import { getFlag } from '@/lib/config/feature-flags'
import { runImportPipeline, type ImportItem } from '@/lib/import/pipeline'
import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// GET /api/admin/promosapp/review — List candidates pending review
export async function GET(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  const rl = rateLimit(req, 'admin')
  if (!rl.success) return rateLimitResponse(rl)

  const status = req.nextUrl.searchParams.get('status') || 'PENDING'
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50', 10), 200)
  const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0', 10)

  try {
    const [candidates, total] = await Promise.all([
      prisma.catalogCandidate.findMany({
        where: {
          sourceSlug: 'promosapp',
          status: status as any,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.catalogCandidate.count({
        where: {
          sourceSlug: 'promosapp',
          status: status as any,
        },
      }),
    ])

    // Format for admin display
    const items = candidates.map(c => {
      const enriched = c.enrichedData as Record<string, any> | null
      return {
        id: c.id,
        title: c.title,
        price: c.price,
        originalPrice: c.originalPrice,
        imageUrl: c.imageUrl,
        affiliateUrl: c.affiliateUrl,
        externalId: c.externalId,
        status: c.status,
        score: enriched?.score ?? null,
        marketplace: enriched?.marketplace ?? null,
        sourceChannel: enriched?.sourceChannel ?? null,
        discount: enriched?.discount ?? null,
        couponCode: enriched?.couponCode ?? null,
        isFreeShipping: enriched?.isFreeShipping ?? false,
        productUrl: enriched?.productUrl ?? null,
        parseErrors: enriched?.parseErrors ?? [],
        rejectionNote: c.rejectionNote,
        createdAt: c.createdAt,
      }
    })

    return NextResponse.json({
      items,
      total,
      limit,
      offset,
      status,
    })
  } catch (err) {
    logger.error('promosapp.review.get-error', { error: String(err) })
    return NextResponse.json(
      { error: 'Failed to fetch review queue', detail: String(err) },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/promosapp/review — Approve or reject candidates
export async function PATCH(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  const rl = rateLimit(req, 'admin')
  if (!rl.success) return rateLimitResponse(rl)

  try {
    const body = await req.json()
    const { ids, action, note } = body as {
      ids?: string[]
      id?: string
      action: 'approve' | 'reject'
      note?: string
    }

    // Support single id or array of ids
    const targetIds = ids || (body.id ? [body.id] : [])

    if (targetIds.length === 0 || !action) {
      return NextResponse.json(
        { error: 'Required: ids (array) or id (string), action ("approve" or "reject")' },
        { status: 400 }
      )
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: 'Action must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    // Fetch candidates
    const candidates = await prisma.catalogCandidate.findMany({
      where: {
        id: { in: targetIds },
        sourceSlug: 'promosapp',
        status: 'PENDING',
      },
    })

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: 'No pending PromosApp candidates found with given IDs' },
        { status: 404 }
      )
    }

    let imported = 0
    let rejected = 0
    const errors: string[] = []

    if (action === 'approve') {
      // Convert candidates to ImportItems and run through pipeline
      const importItems: ImportItem[] = candidates.map(c => {
        const enriched = c.enrichedData as Record<string, any> | null
        return {
          externalId: c.externalId || c.id,
          title: c.title,
          currentPrice: c.price || 0,
          originalPrice: c.originalPrice || undefined,
          productUrl: enriched?.productUrl || c.affiliateUrl || '',
          imageUrl: c.imageUrl || undefined,
          sourceSlug: enriched?.marketplace
            ? mapMarketplaceToSlug(enriched.marketplace)
            : (c.sourceSlug || 'unknown'),
          discoverySource: 'promosapp',
        }
      })

      // Filter out items with no URL or price
      const validItems = importItems.filter(i => i.productUrl && i.currentPrice > 0)

      if (validItems.length > 0) {
        try {
          const result = await runImportPipeline(validItems)
          imported = result.created + result.updated

          // Mark as IMPORTED
          await prisma.catalogCandidate.updateMany({
            where: { id: { in: candidates.map(c => c.id) } },
            data: { status: 'IMPORTED' },
          })
        } catch (err) {
          errors.push(`Import failed: ${String(err)}`)
        }
      }

      // Mark items that couldn't be imported (no URL/price) as still APPROVED
      const invalidIds = candidates
        .filter(c => {
          const enriched = c.enrichedData as Record<string, any> | null
          return !(enriched?.productUrl || c.affiliateUrl) || !(c.price && c.price > 0)
        })
        .map(c => c.id)

      if (invalidIds.length > 0) {
        await prisma.catalogCandidate.updateMany({
          where: { id: { in: invalidIds } },
          data: { status: 'APPROVED', rejectionNote: 'Approved but missing URL or price' },
        })
        errors.push(`${invalidIds.length} items approved but could not import (missing URL or price)`)
      }
    } else {
      // Reject
      await prisma.catalogCandidate.updateMany({
        where: { id: { in: targetIds } },
        data: {
          status: 'REJECTED',
          rejectionNote: note || 'Rejected by admin',
        },
      })
      rejected = candidates.length
    }

    logger.info('promosapp.review.action', {
      action,
      count: candidates.length,
      imported,
      rejected,
    })

    return NextResponse.json({
      ok: errors.length === 0,
      action,
      processed: candidates.length,
      imported,
      rejected,
      errors,
    })
  } catch (err) {
    logger.error('promosapp.review.patch-error', { error: String(err) })
    return NextResponse.json(
      { error: 'Failed to process review action', detail: String(err) },
      { status: 500 }
    )
  }
}

/** Map PromosApp marketplace name to our source slug */
function mapMarketplaceToSlug(marketplace: string): string {
  const map: Record<string, string> = {
    'Mercado Livre': 'mercadolivre',
    'Amazon Brasil': 'amazon-br',
    'Shopee': 'shopee',
    'Shein': 'shein',
    'Magazine Luiza': 'magalu',
    'KaBuM!': 'kabum',
    'AliExpress': 'aliexpress',
  }
  return map[marketplace] || marketplace.toLowerCase().replace(/\s+/g, '-')
}
