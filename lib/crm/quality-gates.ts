/**
 * CRM Quality Gates — ensures no message goes out without validation.
 *
 * Gates:
 * 1. Affiliate validation — no message without monetisable link
 * 2. Price sanity — no message with suspicious prices
 * 3. Frequency control — respects cadence per user+channel
 * 4. Deduplication — no same product+type to same user in window
 * 5. Spam risk scoring — blocks high-risk messages
 * 6. Quiet hours — respects subscriber preferences
 * 7. Value scoring — prioritises high-value messages
 */

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

// ============================================
// TYPES
// ============================================

export interface QualityGateInput {
  subscriberId: string
  email: string
  channel: 'EMAIL' | 'WHATSAPP' | 'PUSH' | 'ONSITE'
  messageType: string
  productId?: string
  offerId?: string
  price?: number
  originalPrice?: number
  affiliateUrl?: string
  sourceSlug?: string
  body?: string
}

export interface QualityGateResult {
  pass: boolean
  blocked: string[] // list of gate names that blocked
  valueScore: number // 0-100
  spamRiskScore: number // 0-100
  dedupKey: string
}

// ============================================
// CONSTANTS
// ============================================

/** Max messages per channel per subscriber in a 24h window */
const FREQUENCY_LIMITS: Record<string, number> = {
  EMAIL: 3,
  WHATSAPP: 2,
  PUSH: 4,
  ONSITE: 10,
}

/** Dedup window per message type (hours) */
const DEDUP_WINDOWS: Record<string, number> = {
  alert_triggered: 24,
  price_drop: 24,
  weekly_digest: 144, // 6 days
  daily_radar: 20,
  welcome: 720, // 30 days
  reengagement: 168, // 7 days
  category_digest: 144,
  brand_digest: 144,
  default: 24,
}

// ============================================
// MAIN GATE
// ============================================

export async function runQualityGates(input: QualityGateInput): Promise<QualityGateResult> {
  const blocked: string[] = []
  let valueScore = 50
  let spamRiskScore = 0

  // 1. Affiliate validation
  if (input.channel !== 'ONSITE' && input.productId) {
    if (!input.affiliateUrl || input.affiliateUrl === '#') {
      blocked.push('no_affiliate')
    }
  }

  // 2. Price sanity
  if (input.price !== undefined) {
    if (input.price < 5) blocked.push('price_too_low')
    if (input.originalPrice && input.price > 0) {
      const discount = ((input.originalPrice - input.price) / input.originalPrice) * 100
      if (discount >= 85) blocked.push('discount_implausible')
    }
  }

  // 3. Frequency control
  const recentCount = await countRecentMessages(input.subscriberId, input.channel, 24)
  const limit = FREQUENCY_LIMITS[input.channel] ?? 3
  if (recentCount >= limit) {
    blocked.push('frequency_exceeded')
    spamRiskScore += 40
  }

  // 4. Deduplication
  const dedupKey = buildDedupKey(input)
  const windowHours = DEDUP_WINDOWS[input.messageType] ?? DEDUP_WINDOWS.default
  const isDuplicate = await checkDedup(dedupKey, windowHours)
  if (isDuplicate) {
    blocked.push('duplicate')
    spamRiskScore += 30
  }

  // 5. Quiet hours
  const isQuiet = await isInQuietHours(input.subscriberId)
  if (isQuiet && input.channel !== 'ONSITE') {
    blocked.push('quiet_hours')
  }

  // 6. Spam risk scoring
  if (input.body && input.body.length < 20) spamRiskScore += 15
  if (!input.productId && input.messageType !== 'welcome') spamRiskScore += 10
  if (recentCount >= limit - 1) spamRiskScore += 20

  // 7. Value scoring
  if (input.price && input.originalPrice && input.originalPrice > input.price) {
    const discount = ((input.originalPrice - input.price) / input.originalPrice) * 100
    valueScore = Math.min(100, 30 + discount * 1.5)
  }
  if (input.messageType === 'alert_triggered') valueScore = Math.max(valueScore, 80)
  if (input.messageType === 'welcome') valueScore = Math.max(valueScore, 70)

  // Block if spam risk too high
  if (spamRiskScore >= 70) blocked.push('spam_risk_high')

  return {
    pass: blocked.length === 0,
    blocked,
    valueScore: Math.round(valueScore),
    spamRiskScore: Math.round(spamRiskScore),
    dedupKey,
  }
}

// ============================================
// HELPERS
// ============================================

function buildDedupKey(input: QualityGateInput): string {
  const parts = [input.subscriberId, input.messageType]
  if (input.productId) parts.push(input.productId)
  const windowHours = DEDUP_WINDOWS[input.messageType] ?? DEDUP_WINDOWS.default
  const windowId = Math.floor(Date.now() / (windowHours * 3_600_000))
  parts.push(String(windowId))
  return parts.join(':')
}

async function countRecentMessages(subscriberId: string, channel: string, hours: number): Promise<number> {
  const since = new Date(Date.now() - hours * 3_600_000)
  try {
    return await prisma.crmMessage.count({
      where: {
        subscriberId,
        channel: channel as any,
        status: { in: ['SENT', 'CLICKED'] },
        sentAt: { gte: since },
      },
    })
  } catch {
    return 0
  }
}

async function checkDedup(dedupKey: string, _windowHours: number): Promise<boolean> {
  try {
    const existing = await prisma.crmMessage.findUnique({
      where: { dedupKey },
      select: { id: true },
    })
    return !!existing
  } catch {
    return false
  }
}

async function isInQuietHours(subscriberId: string): Promise<boolean> {
  try {
    const sub = await prisma.subscriber.findUnique({
      where: { id: subscriberId },
      select: { quietStart: true, quietEnd: true },
    })
    if (!sub?.quietStart || !sub?.quietEnd) return false

    // Current hour in BRT (UTC-3)
    const nowUtc = new Date()
    const brtHour = (nowUtc.getUTCHours() - 3 + 24) % 24

    if (sub.quietStart <= sub.quietEnd) {
      return brtHour >= sub.quietStart && brtHour < sub.quietEnd
    }
    // Wraps midnight (e.g., 22 → 8)
    return brtHour >= sub.quietStart || brtHour < sub.quietEnd
  } catch {
    return false
  }
}
