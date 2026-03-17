import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, rateLimitResponse } from '@/lib/security/rate-limit'
import { getFlag } from '@/lib/config/feature-flags'
import { processPromosAppBatch } from '@/lib/promosapp'
import type { PromosAppRawEvent } from '@/lib/promosapp'
import { logger } from '@/lib/logger'
import { timingSafeEqual } from 'crypto'

export const dynamic = 'force-dynamic'

const WEBHOOK_SECRET = process.env.PROMOSAPP_WEBHOOK_SECRET

function verifySignature(req: NextRequest): boolean {
  if (!WEBHOOK_SECRET) return false

  const signature = req.headers.get('x-promosapp-signature') ||
                    req.headers.get('x-webhook-secret')
  if (!signature) return false

  try {
    const expected = Buffer.from(WEBHOOK_SECRET, 'utf-8')
    const received = Buffer.from(signature, 'utf-8')
    if (expected.length !== received.length) {
      timingSafeEqual(expected, expected) // constant time
      return false
    }
    return timingSafeEqual(expected, received)
  } catch {
    return false
  }
}

// POST /api/webhooks/promosapp — Receive push events from PromosApp
export async function POST(req: NextRequest) {
  // Rate limit: 30 req/min for webhooks
  const rl = rateLimit(req, 'admin')
  if (!rl.success) return rateLimitResponse(rl)

  if (!getFlag('promosappEnabled')) {
    return NextResponse.json({ error: 'PromosApp integration disabled' }, { status: 503 })
  }

  if (!WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'PROMOSAPP_WEBHOOK_SECRET not configured' },
      { status: 503 }
    )
  }

  if (!verifySignature(req)) {
    logger.warn('promosapp.webhook.unauthorized')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const events: PromosAppRawEvent[] = Array.isArray(body)
      ? body
      : Array.isArray(body.events)
        ? body.events
        : body.data ? [body.data] : []

    if (events.length === 0) {
      return NextResponse.json({ ok: true, message: 'No events in payload' })
    }

    // Process in shadow mode (never auto-publish from webhook by default)
    const result = await processPromosAppBatch(events, {
      autoPublish: false, // Webhooks always shadow mode for safety
    })

    logger.info('promosapp.webhook.processed', {
      received: result.received,
      parsed: result.parsed,
      pendingReview: result.pendingReview,
    })

    return NextResponse.json({
      ok: result.failed === 0,
      received: result.received,
      parsed: result.parsed,
      pendingReview: result.pendingReview,
      rejected: result.rejected,
    })
  } catch (err) {
    logger.error('promosapp.webhook.error', { error: String(err) })
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
