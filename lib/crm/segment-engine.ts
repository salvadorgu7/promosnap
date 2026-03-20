/**
 * CRM Segment Engine — classifies subscribers into actionable segments
 * based on behaviour signals, interests, and engagement patterns.
 *
 * Segments drive message selection, channel choice, and cadence.
 */

import prisma from '@/lib/db/prisma'
import { getEventCounts, getRepeatedSearches, getRevisitedProducts } from './events'

// ============================================
// SEGMENT TYPES
// ============================================

export type UserSegment =
  | 'new_subscriber'       // < 3 days, no events
  | 'active_alert'         // Has active price alerts
  | 'high_intent'          // Repeated searches or product revisits
  | 'comparison_shopper'   // Multiple comparisons, no clickout
  | 'price_hunter'         // Frequent searches with price keywords
  | 'engaged_no_alert'     // Active but hasn't created alerts
  | 'hot_lead'             // Recent clickouts, high engagement
  | 'dormant'              // No activity in 14+ days
  | 'churning'             // Was active, declining
  | 'power_user'           // High engagement across all signals

export type UserTemperature = 'hot' | 'warm' | 'cold' | 'frozen'

export interface SegmentResult {
  segment: UserSegment
  temperature: UserTemperature
  engagementScore: number // 0-100
  signals: string[]
  recommendedChannel: 'EMAIL' | 'WHATSAPP' | 'ONSITE'
  recommendedCadence: 'realtime' | 'daily' | 'weekly' | 'monthly'
  interests: string[]
}

// ============================================
// CLASSIFY SUBSCRIBER
// ============================================

export async function classifySubscriber(subscriberId: string): Promise<SegmentResult> {
  const sub = await prisma.subscriber.findUnique({
    where: { id: subscriberId },
    select: {
      id: true,
      email: true,
      interests: true,
      tags: true,
      channelWhatsApp: true,
      channelEmail: true,
      engagementScore: true,
      createdAt: true,
      lastActiveAt: true,
    },
  })

  if (!sub) {
    return defaultSegment()
  }

  const daysSinceCreated = (Date.now() - sub.createdAt.getTime()) / 86_400_000
  const daysSinceActive = sub.lastActiveAt
    ? (Date.now() - sub.lastActiveAt.getTime()) / 86_400_000
    : daysSinceCreated

  // Gather signals
  const [eventCounts, repeatedSearches, revisitedProducts, activeAlerts] = await Promise.all([
    getEventCounts(sub.email, 30),
    getRepeatedSearches(sub.email),
    getRevisitedProducts(sub.email, 14),
    prisma.priceAlert.count({ where: { email: sub.email, isActive: true } }),
  ])

  const totalEvents = Object.values(eventCounts).reduce((a, b) => a + b, 0)
  const clickouts = eventCounts.clickout || 0
  const searches = eventCounts.search || 0
  const views = eventCounts.view_product || 0
  const favorites = eventCounts.favorite || 0
  const compares = eventCounts.compare || 0

  // Calculate engagement score
  const engagement = Math.min(100, Math.round(
    clickouts * 8 +
    activeAlerts * 10 +
    favorites * 5 +
    searches * 2 +
    views * 1 +
    compares * 3 +
    repeatedSearches.length * 4 +
    revisitedProducts.length * 6
  ))

  // Determine temperature
  let temperature: UserTemperature = 'cold'
  if (daysSinceActive < 1) temperature = 'hot'
  else if (daysSinceActive < 3) temperature = 'warm'
  else if (daysSinceActive < 14) temperature = 'cold'
  else temperature = 'frozen'

  // Classify segment
  const signals: string[] = []
  let segment: UserSegment = 'new_subscriber'

  if (daysSinceCreated < 3 && totalEvents < 3) {
    segment = 'new_subscriber'
    signals.push('subscriber_novo')
  } else if (engagement >= 80 && clickouts >= 5) {
    segment = 'power_user'
    signals.push('alta_engajamento', 'multiplos_clickouts')
  } else if (clickouts >= 3 && temperature === 'hot') {
    segment = 'hot_lead'
    signals.push('clickouts_recentes', 'temperatura_alta')
  } else if (activeAlerts > 0) {
    segment = 'active_alert'
    signals.push(`${activeAlerts}_alertas_ativos`)
  } else if (repeatedSearches.length > 0 || revisitedProducts.length > 0) {
    segment = 'high_intent'
    if (repeatedSearches.length > 0) signals.push('buscas_repetidas')
    if (revisitedProducts.length > 0) signals.push('produtos_revisitados')
  } else if (compares >= 2 && clickouts === 0) {
    segment = 'comparison_shopper'
    signals.push('compara_sem_clicar')
  } else if (searches >= 5 && totalEvents > 10) {
    segment = 'price_hunter'
    signals.push('pesquisa_intensa')
  } else if (engagement >= 20 && activeAlerts === 0) {
    segment = 'engaged_no_alert'
    signals.push('engajado_sem_alerta')
  } else if (daysSinceActive >= 14) {
    segment = temperature === 'frozen' ? 'dormant' : 'churning'
    signals.push(`${Math.round(daysSinceActive)}d_inativo`)
  }

  // Recommended channel
  let recommendedChannel: 'EMAIL' | 'WHATSAPP' | 'ONSITE' = 'EMAIL'
  if (sub.channelWhatsApp && (segment === 'hot_lead' || segment === 'active_alert')) {
    recommendedChannel = 'WHATSAPP'
  }
  if (segment === 'new_subscriber' || segment === 'comparison_shopper') {
    recommendedChannel = 'ONSITE'
  }

  // Recommended cadence
  let recommendedCadence: 'realtime' | 'daily' | 'weekly' | 'monthly' = 'weekly'
  if (segment === 'hot_lead' || segment === 'active_alert') recommendedCadence = 'realtime'
  else if (segment === 'high_intent' || segment === 'power_user') recommendedCadence = 'daily'
  else if (segment === 'dormant') recommendedCadence = 'monthly'

  // Update subscriber engagement score
  try {
    await prisma.subscriber.update({
      where: { id: subscriberId },
      data: { engagementScore: engagement, segment },
    })
  } catch { /* non-blocking */ }

  return {
    segment,
    temperature,
    engagementScore: engagement,
    signals,
    recommendedChannel,
    recommendedCadence,
    interests: sub.interests,
  }
}

function defaultSegment(): SegmentResult {
  return {
    segment: 'new_subscriber',
    temperature: 'cold',
    engagementScore: 0,
    signals: [],
    recommendedChannel: 'EMAIL',
    recommendedCadence: 'weekly',
    interests: [],
  }
}
