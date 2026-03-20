import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { rateLimit, rateLimitResponse } from '@/lib/security/rate-limit'
import { logger } from '@/lib/logger'

const WEBHOOK_SECRET = process.env.ML_WEBHOOK_SECRET

// ML envia notificacoes via POST neste endpoint
export async function POST(req: NextRequest) {
  // Rate limit webhooks: 30 req/min (stricter than public)
  const rl = rateLimit(req, 'public')
  if (!rl.success) return rateLimitResponse(rl)

  // Validate webhook token if configured
  if (WEBHOOK_SECRET) {
    const token = req.headers.get('x-webhook-token')
    if (token !== WEBHOOK_SECRET) {
      logger.warn("webhook-ml.unauthorized")
      return NextResponse.json({ ok: false }, { status: 401 })
    }
  } else {
    logger.warn("webhook-ml.no-secret-configured")
  }

  try {
    const body = await req.json()

    // Log notification type without leaking full payload
    const topic = body?.topic || 'unknown'
    const resourceId = typeof body?.resource === 'string'
      ? body.resource.split('/').pop()
      : ''
    logger.info("webhook-ml.received", { topic, resourceId })

    // Store notification for async processing
    if (body?.topic) {
      try {
        await prisma.systemSetting.upsert({
          where: { key: `ml_webhook_last_${body.topic}` },
          create: {
            key: `ml_webhook_last_${body.topic}`,
            value: JSON.stringify({
              receivedAt: new Date().toISOString(),
              resource: body.resource,
              userId: body.user_id,
            }),
          },
          update: {
            value: JSON.stringify({
              receivedAt: new Date().toISOString(),
              resource: body.resource,
              userId: body.user_id,
            }),
          },
        })
      } catch {
        // Non-critical — don't fail the webhook response
      }
    }

    // ── Process notification based on topic ──────────────────────────────────
    // Run async — ML expects 200 quickly, processing happens in background
    processNotification(topic, body?.resource, body?.user_id).catch((err) =>
      logger.error('webhook-ml.process-failed', { topic, error: err })
    )

    // ML espera 200 para confirmar recebimento
    return NextResponse.json({ ok: true })
  } catch (err) {
    logger.error("webhook-ml.failed", { error: err });
    return NextResponse.json({ ok: true }) // sempre 200 para o ML nao retentar
  }
}

// ML pode fazer GET para validar o endpoint
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'ml-webhook', status: 'active' })
}

// ── Async notification processor ──────────────────────────────────────────────

async function processNotification(topic: string, resource?: string, _userId?: number) {
  if (!resource) return

  // Extract item ID from resource path like "/items/MLB12345678"
  const itemMatch = resource.match(/\/items\/(MLB\d+)/)
  if (!itemMatch) {
    logger.debug('webhook-ml.unhandled-resource', { topic, resource })
    return
  }

  const mlId = itemMatch[1]

  switch (topic) {
    case 'items':
    case 'item': {
      // Item updated — refresh price/availability in our DB
      await refreshMLItem(mlId)
      break
    }
    case 'orders_v2':
    case 'orders': {
      // Order notification — log for future conversion attribution
      logger.info('webhook-ml.order-notification', { mlId, resource })
      break
    }
    default:
      logger.debug('webhook-ml.topic-ignored', { topic, resource })
  }
}

/**
 * Refresh a single ML item in our DB — updates price, availability, and lastSeenAt.
 */
async function refreshMLItem(mlId: string) {
  try {
    // Find listing in our DB
    const listing = await prisma.listing.findFirst({
      where: { externalId: mlId },
      select: { id: true, sourceId: true },
    })

    if (!listing) {
      logger.debug('webhook-ml.item-not-tracked', { mlId })
      return
    }

    // Fetch fresh data from ML API
    const { getMLToken } = await import('@/lib/ml-auth')
    let token: string | undefined
    try {
      token = await getMLToken()
    } catch {
      // Continue without auth — public items work without token
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'PromoSnap/1.0',
    }
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(`https://api.mercadolibre.com/items/${mlId}`, { headers })
    if (!res.ok) {
      logger.warn('webhook-ml.refresh-api-failed', { mlId, status: res.status })
      return
    }

    const item = await res.json()
    const newPrice = item.price
    const isActive = item.status === 'active'

    // Update listing lastSeenAt
    await prisma.listing.update({
      where: { id: listing.id },
      data: {
        lastSeenAt: new Date(),
        availability: isActive ? 'IN_STOCK' : 'OUT_OF_STOCK',
      },
    })

    // Update active offer price if changed
    if (newPrice && newPrice > 0) {
      const offer = await prisma.offer.findFirst({
        where: { listingId: listing.id, isActive: true },
        select: { id: true, currentPrice: true },
      })

      if (offer && offer.currentPrice !== newPrice) {
        await prisma.offer.update({
          where: { id: offer.id },
          data: {
            currentPrice: newPrice,
            originalPrice: item.original_price ?? undefined,
            lastSeenAt: new Date(),
          },
        })

        // Record price snapshot for history
        await prisma.priceSnapshot.create({
          data: {
            offerId: offer.id,
            price: newPrice,
            originalPrice: item.original_price ?? null,
          },
        })

        logger.info('webhook-ml.price-updated', {
          mlId,
          oldPrice: offer.currentPrice,
          newPrice,
          diff: Math.round((newPrice - offer.currentPrice) * 100) / 100,
        })
      }
    }
  } catch (err) {
    logger.error('webhook-ml.refresh-failed', { mlId, error: err })
  }
}
