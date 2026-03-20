import { NextRequest, NextResponse } from 'next/server'
import { getChannelMetrics, getJourneyMetrics, getAiMetrics, getSubscriberStats } from '@/lib/crm/metrics'

/**
 * GET /api/admin/crm/metrics
 * CRM dashboard data — protected by x-admin-secret.
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const days = Number(req.nextUrl.searchParams.get('days') || '30')

  const [channels, journeys, ai, subscribers] = await Promise.all([
    getChannelMetrics(days),
    getJourneyMetrics(days),
    getAiMetrics(days),
    getSubscriberStats(),
  ])

  return NextResponse.json({
    channels,
    journeys,
    ai,
    subscribers,
    period: `${days}d`,
  })
}
