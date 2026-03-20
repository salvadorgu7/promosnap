/**
 * CRM Metrics — tracks performance per channel, journey, and AI usage.
 */

import prisma from '@/lib/db/prisma'

// ============================================
// CHANNEL METRICS
// ============================================

export async function getChannelMetrics(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000)

  const messages = await prisma.crmMessage.groupBy({
    by: ['channel', 'status'],
    where: { createdAt: { gte: since } },
    _count: true,
  })

  const channels: Record<string, {
    sent: number; clicked: number; failed: number; suppressed: number; queued: number
    ctr: number; suppressionRate: number
  }> = {}

  for (const m of messages) {
    const ch = m.channel
    if (!channels[ch]) channels[ch] = { sent: 0, clicked: 0, failed: 0, suppressed: 0, queued: 0, ctr: 0, suppressionRate: 0 }
    const key = m.status.toLowerCase() as keyof typeof channels[string]
    if (key in channels[ch]) (channels[ch] as any)[key] = m._count
  }

  // Calculate rates
  for (const ch of Object.values(channels)) {
    const delivered = ch.sent + ch.clicked
    ch.ctr = delivered > 0 ? Math.round((ch.clicked / delivered) * 100) : 0
    const total = delivered + ch.failed + ch.suppressed
    ch.suppressionRate = total > 0 ? Math.round((ch.suppressed / total) * 100) : 0
  }

  return channels
}

// ============================================
// JOURNEY METRICS
// ============================================

export async function getJourneyMetrics(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000)

  const messages = await prisma.crmMessage.groupBy({
    by: ['messageType', 'status'],
    where: { createdAt: { gte: since } },
    _count: true,
  })

  const journeys: Record<string, {
    total: number; sent: number; clicked: number; suppressed: number
    ctr: number
  }> = {}

  for (const m of messages) {
    const j = m.messageType
    if (!journeys[j]) journeys[j] = { total: 0, sent: 0, clicked: 0, suppressed: 0, ctr: 0 }
    journeys[j].total += m._count
    const status = m.status.toLowerCase()
    if (status === 'sent') journeys[j].sent += m._count
    if (status === 'clicked') journeys[j].clicked += m._count
    if (status === 'suppressed') journeys[j].suppressed += m._count
  }

  for (const j of Object.values(journeys)) {
    j.ctr = j.sent > 0 ? Math.round((j.clicked / j.sent) * 100) : 0
  }

  return journeys
}

// ============================================
// AI METRICS
// ============================================

export async function getAiMetrics(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000)

  const [aiGenerated, totalMessages, aiClicked, totalClicked] = await Promise.all([
    prisma.crmMessage.count({ where: { createdAt: { gte: since }, aiGenerated: true } }),
    prisma.crmMessage.count({ where: { createdAt: { gte: since } } }),
    prisma.crmMessage.count({ where: { createdAt: { gte: since }, aiGenerated: true, status: 'CLICKED' } }),
    prisma.crmMessage.count({ where: { createdAt: { gte: since }, status: 'CLICKED' } }),
  ])

  const aiRate = totalMessages > 0 ? Math.round((aiGenerated / totalMessages) * 100) : 0
  const aiCtr = aiGenerated > 0 ? Math.round((aiClicked / aiGenerated) * 100) : 0
  const baselineCtr = (totalMessages - aiGenerated) > 0
    ? Math.round(((totalClicked - aiClicked) / (totalMessages - aiGenerated)) * 100) : 0

  return {
    totalMessages,
    aiGenerated,
    aiRate,
    aiCtr,
    baselineCtr,
    aiLift: aiCtr - baselineCtr,
  }
}

// ============================================
// SUBSCRIBER STATS
// ============================================

export async function getSubscriberStats() {
  const [total, active, withPhone, withAlerts, segments] = await Promise.all([
    prisma.subscriber.count(),
    prisma.subscriber.count({ where: { status: 'ACTIVE' } }),
    prisma.subscriber.count({ where: { phone: { not: null } } }),
    prisma.subscriber.count({ where: { status: 'ACTIVE' } }), // approximation
    prisma.subscriber.groupBy({
      by: ['segment'],
      where: { status: 'ACTIVE' },
      _count: true,
    }),
  ])

  return {
    total,
    active,
    withPhone,
    withAlerts,
    segmentBreakdown: Object.fromEntries(
      segments.map(s => [s.segment || 'unknown', s._count])
    ),
  }
}
