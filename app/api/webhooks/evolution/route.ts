import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, rateLimitResponse } from '@/lib/security/rate-limit'
import { getFlag } from '@/lib/config/feature-flags'
import { processPromosAppBatch } from '@/lib/promosapp'
import type { PromosAppRawEvent } from '@/lib/promosapp'
import { logger } from '@/lib/logger'
import { timingSafeEqual } from 'crypto'

export const dynamic = 'force-dynamic'

// ── Secret Verification ──────────────────────────────────────────────────────

function verifySecret(received: string | null, expected: string): boolean {
  if (!received) return false
  try {
    const a = Buffer.from(expected, 'utf-8')
    const b = Buffer.from(received, 'utf-8')
    if (a.length !== b.length) return false
    const maxLen = Math.max(a.length, b.length)
    const padA = Buffer.alloc(maxLen)
    const padB = Buffer.alloc(maxLen)
    a.copy(padA)
    b.copy(padB)
    return timingSafeEqual(padA, padB)
  } catch {
    return false
  }
}

// ── Message Extraction ───────────────────────────────────────────────────────

interface EvolutionPayload {
  event?: string
  data?: {
    key?: {
      remoteJid?: string
      fromMe?: boolean
      id?: string
    }
    pushName?: string
    message?: {
      conversation?: string
      extendedTextMessage?: {
        text?: string
        matchedText?: string
        canonicalUrl?: string
      }
      imageMessage?: {
        caption?: string
        url?: string
        mimetype?: string
        thumbnailUrl?: string
      }
    }
    messageTimestamp?: number | string
  }
}

/**
 * Extract a PromosAppRawEvent from an Evolution API webhook payload.
 * Returns null if the message should be ignored (wrong event, wrong group, media-only, etc.)
 */
function extractEvolutionMessage(
  payload: EvolutionPayload,
  allowedJids: Set<string> | null
): PromosAppRawEvent | null {
  // Only process message upsert events
  if (payload.event !== 'messages.upsert') return null

  const data = payload.data
  if (!data) return null

  // Filter by group JID — only process messages from allowed groups
  // If allowedJids is null (not configured), accept all groups
  const remoteJid = data.key?.remoteJid
  if (allowedJids && remoteJid && !allowedJids.has(remoteJid)) return null

  // Note: fromMe filter removed — the connected WhatsApp number may forward/send
  // promo messages in the group, and this webhook is receive-only (no echo risk)

  // Extract text content from any message format (text, link preview, image with caption)
  const msg = data.message
  const text =
    msg?.conversation ||
    msg?.extendedTextMessage?.text ||
    msg?.imageMessage?.caption ||  // Image messages often have promo text as caption
    null

  // Skip messages without any text content
  if (!text || text.trim().length === 0) return null

  // Extract URL hint from extendedTextMessage if available
  const urlHint =
    msg?.extendedTextMessage?.canonicalUrl ||
    msg?.extendedTextMessage?.matchedText

  // Parse timestamp
  const ts = data.messageTimestamp
  const capturedAt = ts
    ? new Date(typeof ts === 'string' ? parseInt(ts, 10) * 1000 : ts * 1000).toISOString()
    : new Date().toISOString()

  // Extract first non-empty line as rawTitle hint (product name is usually first line)
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3)
  const rawTitle = lines.length > 0 && lines[0].length < 200 ? lines[0] : undefined

  return {
    capturedAt,
    sourceChannel: 'whatsapp-group',
    rawText: text,
    rawTitle,
    rawUrl: urlHint || undefined,
    rawPayload: data as unknown as Record<string, unknown>,
    // messageHash will be computed by the parser
  }
}

// ── POST Handler ─────────────────────────────────────────────────────────────

/**
 * POST /api/webhooks/evolution
 *
 * Receives WhatsApp messages from Evolution API and processes them through
 * the PromosApp pipeline (parse → dedup → enrich → score → route).
 *
 * Headers:
 *   apikey: <EVOLUTION_WEBHOOK_SECRET>  (Evolution API default auth header)
 *
 * Flow: Evolution API → this webhook → processPromosAppBatch() → auto-import/review/reject
 */
export async function POST(req: NextRequest) {
  // Rate limit: 60 req/min for webhooks (WhatsApp messages arrive individually)
  const rl = rateLimit(req, 'public')
  if (!rl.success) return rateLimitResponse(rl)

  // Feature flag gate
  if (!getFlag('whatsappAutoIngest')) {
    return NextResponse.json(
      { error: 'WhatsApp auto-ingest disabled' },
      { status: 503 }
    )
  }

  // Validate secret
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: 'EVOLUTION_WEBHOOK_SECRET not configured' },
      { status: 503 }
    )
  }

  const rawBody = await req.text()

  // Evolution API sends auth via "apikey" header by default
  const receivedSecret =
    req.headers.get('apikey') ||
    req.headers.get('x-webhook-secret')

  if (!verifySecret(receivedSecret, secret)) {
    logger.warn('evolution.webhook.unauthorized')
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
  }

  try {
    const payload: EvolutionPayload = JSON.parse(rawBody)

    // Support multiple group JIDs (comma-separated) via WHATSAPP_GROUP_JIDS
    // Falls back to legacy WHATSAPP_GROUP_JID (singular) for backward compat
    const jidsEnv = process.env.WHATSAPP_GROUP_JIDS || process.env.WHATSAPP_GROUP_JID || ''
    const allowedJids = jidsEnv.trim()
      ? new Set(jidsEnv.split(',').map(j => j.trim()).filter(Boolean))
      : null // null = accept all groups (no filter)

    // TEMPORARY: Log every incoming message's group JID for debugging
    const incomingJid = payload.data?.key?.remoteJid
    logger.info('evolution.webhook.incoming', {
      remoteJid: incomingJid,
      filterActive: allowedJids !== null,
      allowedCount: allowedJids?.size ?? 0,
      configuredJids: jidsEnv ? jidsEnv.substring(0, 80) : '(empty)',
      event: payload.event,
      fromMe: payload.data?.key?.fromMe,
    })

    const event = extractEvolutionMessage(payload, allowedJids)

    if (!event) {
      return NextResponse.json({ ok: true, message: 'Ignored' })
    }

    // Process through existing PromosApp pipeline
    // autoPublish controlled by FF_PROMOSAPP_AUTO_PUBLISH
    const result = await processPromosAppBatch([event], {
      autoPublish: getFlag('promosappAutoPublish'),
    })

    logger.info('evolution.webhook.processed', {
      received: result.received,
      parsed: result.parsed,
      imported: result.imported,
      pendingReview: result.pendingReview,
      rejected: result.rejected,
    })

    return NextResponse.json({
      ok: result.failed === 0,
      received: result.received,
      parsed: result.parsed,
      imported: result.imported,
      pendingReview: result.pendingReview,
      rejected: result.rejected,
    })
  } catch (err) {
    logger.error('evolution.webhook.error', { error: String(err) })
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
