import { NextRequest, NextResponse } from 'next/server'
import { trackCrmEvent, type CrmEventType, type CrmEventPayload } from '@/lib/crm/events'

/**
 * POST /api/crm/track
 * Track a CRM event from the frontend.
 * Body: { eventType, payload, email?, sessionId? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { eventType, payload, email, sessionId } = body as {
      eventType: CrmEventType
      payload?: CrmEventPayload
      email?: string
      sessionId?: string
    }

    if (!eventType) {
      return NextResponse.json({ error: 'eventType required' }, { status: 400 })
    }

    // Non-blocking — don't wait for DB write
    trackCrmEvent(eventType, payload || {}, { email, sessionId })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // Never fail user-facing requests
  }
}
