import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, rateLimitResponse } from '@/lib/security/rate-limit'
import { getFlag } from '@/lib/config/feature-flags'
import { processPromosAppBatch } from '@/lib/promosapp'
import type { PromosAppRawEvent } from '@/lib/promosapp'
import { logger } from '@/lib/logger'
import { createHmac, timingSafeEqual } from 'crypto'

export const dynamic = 'force-dynamic'

const WEBHOOK_SECRET = process.env.PROMOSAPP_WEBHOOK_SECRET

/**
 * Verify webhook signature using HMAC-SHA256 of the request body.
 * Supports two modes:
 *   1. HMAC body-based: x-promosapp-signature = sha256=<hex> (industry standard)
 *   2. Static secret fallback: x-webhook-secret = <secret> (simple mode)
 */
function verifySignature(signatureHeader: string | null, rawBody: string): boolean {
  if (!WEBHOOK_SECRET || !signatureHeader) return false

  try {
    // Mode 1: HMAC body-based (preferred, industry standard like GitHub/Stripe webhooks)
    if (signatureHeader.startsWith('sha256=')) {
      const receivedHex = signatureHeader.slice(7)
      const expectedHex = createHmac('sha256', WEBHOOK_SECRET)
        .update(rawBody, 'utf-8')
        .digest('hex')

      const expected = Buffer.from(expectedHex, 'hex')
      const received = Buffer.from(receivedHex, 'hex')

      if (expected.length !== received.length) return false
      return timingSafeEqual(expected, received)
    }

    // Mode 2: Static secret comparison (fallback for simple integrations)
    const expected = Buffer.from(WEBHOOK_SECRET, 'utf-8')
    const received = Buffer.from(signatureHeader, 'utf-8')
    const maxLen = Math.max(expected.length, received.length)
    const a = Buffer.alloc(maxLen)
    const b = Buffer.alloc(maxLen)
    expected.copy(a)
    received.copy(b)
    return expected.length === received.length && timingSafeEqual(a, b)
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

  // Read raw body for HMAC verification, then parse as JSON
  const rawBody = await req.text()

  const signatureHeader = req.headers.get('x-promosapp-signature') ||
                          req.headers.get('x-webhook-secret')

  if (!verifySignature(signatureHeader, rawBody)) {
    logger.warn('promosapp.webhook.unauthorized')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  try {
    const body = JSON.parse(rawBody)
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
