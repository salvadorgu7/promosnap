import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { rateLimit, rateLimitResponse } from '@/lib/security/rate-limit'
import { getFlag } from '@/lib/config/feature-flags'
import { processPromosAppBatch } from '@/lib/promosapp'
import type { PromosAppRawEvent } from '@/lib/promosapp'
import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// POST /api/admin/promosapp — Ingest a batch of raw promo events
export async function POST(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  const rl = rateLimit(req, 'admin')
  if (!rl.success) return rateLimitResponse(rl)

  if (!getFlag('promosappEnabled')) {
    return NextResponse.json(
      { error: 'PromosApp integration disabled. Set FF_PROMOSAPP_ENABLED=true' },
      { status: 503 }
    )
  }

  try {
    const body = await req.json()

    // Accept array of events or { events: [...] }
    const events: PromosAppRawEvent[] = Array.isArray(body)
      ? body
      : Array.isArray(body.events)
        ? body.events
        : []

    if (events.length === 0) {
      return NextResponse.json(
        { error: 'No events provided. Send JSON array or { events: [...] }' },
        { status: 400 }
      )
    }

    // Optional config overrides from query params
    const autoApproveThreshold = parseInt(req.nextUrl.searchParams.get('threshold') || '70', 10)
    const autoPublish = req.nextUrl.searchParams.get('publish') === 'true'

    const result = await processPromosAppBatch(events, {
      autoApproveThreshold,
      autoPublish: autoPublish && getFlag('promosappAutoPublish'),
    })

    return NextResponse.json({
      ok: result.failed === 0,
      ...result,
    })
  } catch (err) {
    logger.error('promosapp.api.post-error', { error: String(err) })
    return NextResponse.json(
      { error: 'Failed to process PromosApp batch', detail: String(err) },
      { status: 500 }
    )
  }
}

// GET /api/admin/promosapp — Pipeline status and stats
export async function GET(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  const rl = rateLimit(req, 'admin')
  if (!rl.success) return rateLimitResponse(rl)

  try {
    const [
      totalCandidates,
      pendingCount,
      approvedCount,
      rejectedCount,
      importedCount,
      recentBatches,
    ] = await Promise.all([
      prisma.catalogCandidate.count({ where: { sourceSlug: 'promosapp' } }),
      prisma.catalogCandidate.count({ where: { sourceSlug: 'promosapp', status: 'PENDING' } }),
      prisma.catalogCandidate.count({ where: { sourceSlug: 'promosapp', status: 'APPROVED' } }),
      prisma.catalogCandidate.count({ where: { sourceSlug: 'promosapp', status: 'REJECTED' } }),
      prisma.catalogCandidate.count({ where: { sourceSlug: 'promosapp', status: 'IMPORTED' } }),
      prisma.importBatch.findMany({
        where: { format: 'promosapp' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          status: true,
          totalItems: true,
          imported: true,
          rejected: true,
          createdAt: true,
          processedAt: true,
        },
      }),
    ])

    // Score distribution from recent candidates
    const recentScored = await prisma.catalogCandidate.findMany({
      where: {
        sourceSlug: 'promosapp',
        createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
      },
      select: { enrichedData: true },
      take: 500,
    })

    const scores = recentScored
      .map(c => (c.enrichedData as any)?.score)
      .filter((s): s is number => typeof s === 'number')

    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0

    return NextResponse.json({
      enabled: getFlag('promosappEnabled'),
      autoPublish: getFlag('promosappAutoPublish'),
      stats: {
        total: totalCandidates,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        imported: importedCount,
        avgScore,
        scoreDistribution: {
          high: scores.filter(s => s >= 70).length,
          medium: scores.filter(s => s >= 40 && s < 70).length,
          low: scores.filter(s => s < 40).length,
        },
      },
      recentBatches,
    })
  } catch (err) {
    logger.error('promosapp.api.get-error', { error: String(err) })
    return NextResponse.json(
      { error: 'Failed to fetch PromosApp stats', detail: String(err) },
      { status: 500 }
    )
  }
}
