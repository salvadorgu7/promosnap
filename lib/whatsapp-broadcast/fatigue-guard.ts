// ============================================
// WhatsApp Broadcast — Dedupe & Fatigue Guard
// Prevents spam, repetition, and audience fatigue
// ============================================

import { logger } from "@/lib/logger"

const log = logger.child({ module: "wa-broadcast.fatigue-guard" })

// ============================================
// In-memory tracking (will be persisted via delivery logs)
// ============================================

interface SendRecord {
  offerId: string
  channelId: string
  sentAt: Date
  productName: string
  category: string | null
  marketplace: string
}

const recentSends: SendRecord[] = []
const MAX_HISTORY = 500

/**
 * Record a send for fatigue tracking.
 */
export function recordSend(records: SendRecord[]): void {
  recentSends.unshift(...records)
  if (recentSends.length > MAX_HISTORY) {
    recentSends.length = MAX_HISTORY
  }
}

// ============================================
// Fatigue checks
// ============================================

/**
 * Check if a channel has exceeded its daily send limit.
 */
export function isDailyLimitReached(channelId: string, dailyLimit: number): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayCount = recentSends.filter(
    r => r.channelId === channelId && r.sentAt >= today
  ).length

  // Count unique send batches (not individual offers)
  const todayBatches = new Set(
    recentSends
      .filter(r => r.channelId === channelId && r.sentAt >= today)
      .map(r => r.sentAt.toISOString())
  ).size

  if (todayBatches >= dailyLimit) {
    log.info("fatigue-guard.daily-limit-reached", { channelId, todayBatches, dailyLimit })
    return true
  }
  return false
}

/**
 * Check if minimum cooldown between sends has passed.
 * Default: 2 hours between messages.
 */
export function isCooldownActive(
  channelId: string,
  cooldownMinutes: number = 120
): boolean {
  const lastSend = recentSends.find(r => r.channelId === channelId)
  if (!lastSend) return false

  const elapsed = Date.now() - lastSend.sentAt.getTime()
  const cooldownMs = cooldownMinutes * 60 * 1000

  if (elapsed < cooldownMs) {
    log.info("fatigue-guard.cooldown-active", {
      channelId,
      lastSendAgo: Math.round(elapsed / 60000),
      cooldownMinutes,
    })
    return true
  }
  return false
}

/**
 * Check if we're in quiet hours for a channel.
 */
export function isQuietHours(
  quietStart: number | null,
  quietEnd: number | null,
  timezone: string = "America/Sao_Paulo"
): boolean {
  if (quietStart === null || quietEnd === null) return false

  // Get current hour in channel timezone
  const now = new Date()
  let currentHour: number
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: timezone,
    })
    currentHour = parseInt(formatter.format(now), 10)
  } catch {
    // Fallback: UTC-3 for BRT
    currentHour = (now.getUTCHours() - 3 + 24) % 24
  }

  if (quietStart <= quietEnd) {
    // Simple range: e.g., 22-08 doesn't cross midnight
    return currentHour >= quietStart && currentHour < quietEnd
  } else {
    // Crosses midnight: e.g., 22-08
    return currentHour >= quietStart || currentHour < quietEnd
  }
}

/**
 * Get offer IDs sent recently to a channel (for dedup in selection).
 * Returns offer IDs sent in the last N hours.
 */
export function getRecentOfferIds(
  channelId: string,
  hoursBack: number = 24
): string[] {
  const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000)
  return recentSends
    .filter(r => r.channelId === channelId && r.sentAt >= cutoff)
    .map(r => r.offerId)
}

/**
 * Check if a specific offer was sent too recently to a channel.
 */
export function wasRecentlySent(
  offerId: string,
  channelId: string,
  hoursBack: number = 12
): boolean {
  const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000)
  return recentSends.some(
    r => r.offerId === offerId && r.channelId === channelId && r.sentAt >= cutoff
  )
}

/**
 * Check if a category is over-represented in recent sends.
 * Max 60% of recent sends from same category.
 */
export function isCategoryFatigued(
  category: string | null,
  channelId: string,
  maxRatio: number = 0.6
): boolean {
  if (!category) return false

  const channelRecent = recentSends.filter(r => r.channelId === channelId)
  if (channelRecent.length < 5) return false // Not enough data

  const categoryCount = channelRecent.filter(r => r.category === category).length
  const ratio = categoryCount / channelRecent.length

  return ratio > maxRatio
}

/**
 * Check if a marketplace is over-represented in recent sends.
 * Max 60% of recent sends from same marketplace.
 */
export function isMarketplaceFatigued(
  marketplace: string,
  channelId: string,
  maxRatio: number = 0.6
): boolean {
  const channelRecent = recentSends.filter(r => r.channelId === channelId)
  if (channelRecent.length < 5) return false

  const mpCount = channelRecent.filter(r => r.marketplace === marketplace).length
  const ratio = mpCount / channelRecent.length

  return ratio > maxRatio
}

/**
 * Full fatigue check for a channel.
 * Returns an object with reasons if blocked.
 */
export function checkFatigue(
  channelId: string,
  dailyLimit: number,
  quietStart: number | null,
  quietEnd: number | null,
  timezone: string = "America/Sao_Paulo",
  cooldownMinutes: number = 120,
): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = []

  if (isDailyLimitReached(channelId, dailyLimit)) {
    reasons.push(`Limite diario de ${dailyLimit} envios atingido`)
  }

  if (isCooldownActive(channelId, cooldownMinutes)) {
    reasons.push(`Cooldown ativo (min ${cooldownMinutes} min entre envios)`)
  }

  if (isQuietHours(quietStart, quietEnd, timezone)) {
    reasons.push(`Horario de silencio (${quietStart}h-${quietEnd}h)`)
  }

  return {
    allowed: reasons.length === 0,
    reasons,
  }
}
