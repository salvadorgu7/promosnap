// ============================================
// WhatsApp Broadcast — Dedupe & Fatigue Guard
// DB-backed via delivery logs, in-memory cache for hot path
// ============================================

import { logger } from "@/lib/logger"
import prisma from "@/lib/db/prisma"

const log = logger.child({ module: "wa-broadcast.fatigue-guard" })

// ============================================
// In-memory tracking (hot cache, supplemented by DB)
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
 * Record a send for fatigue tracking (in-memory cache).
 */
export function recordSend(records: SendRecord[]): void {
  recentSends.unshift(...records)
  if (recentSends.length > MAX_HISTORY) {
    recentSends.length = MAX_HISTORY
  }
}

// ============================================
// DB-backed daily count
// ============================================

async function getTodaySendCount(channelId: string): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  try {
    const count = await prisma.waDeliveryLog.count({
      where: {
        channelId,
        status: "sent",
        dryRun: false,
        createdAt: { gte: today },
      },
    })
    return count
  } catch {
    // Fallback to in-memory
    return new Set(
      recentSends
        .filter(r => r.channelId === channelId && r.sentAt >= today)
        .map(r => r.sentAt.toISOString())
    ).size
  }
}

async function getLastSendTimeFromDb(channelId: string): Promise<Date | null> {
  try {
    const row = await prisma.waDeliveryLog.findFirst({
      where: { channelId, status: "sent", dryRun: false },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    })
    return row?.createdAt || null
  } catch {
    const last = recentSends.find(r => r.channelId === channelId)
    return last?.sentAt || null
  }
}

// ============================================
// Fatigue checks
// ============================================

/**
 * Check if a channel has exceeded its daily send limit.
 */
export async function isDailyLimitReached(channelId: string, dailyLimit: number): Promise<boolean> {
  const todayBatches = await getTodaySendCount(channelId)

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
export async function isCooldownActive(
  channelId: string,
  cooldownMinutes: number = 120
): Promise<boolean> {
  const lastSendTime = await getLastSendTimeFromDb(channelId)
  if (!lastSendTime) return false

  const elapsed = Date.now() - lastSendTime.getTime()
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
    currentHour = (now.getUTCHours() - 3 + 24) % 24
  }

  if (quietStart <= quietEnd) {
    return currentHour >= quietStart && currentHour < quietEnd
  } else {
    return currentHour >= quietStart || currentHour < quietEnd
  }
}

/**
 * Get offer IDs sent recently to a channel (for dedup in selection).
 * Returns offer IDs sent in the last N hours (default 72h for better dedup).
 * Queries DB first, falls back to in-memory.
 */
export async function getRecentOfferIds(
  channelId: string,
  hoursBack: number = 72
): Promise<string[]> {
  const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000)

  try {
    const rows = await prisma.waDeliveryLog.findMany({
      where: {
        channelId,
        status: "sent",
        dryRun: false,
        createdAt: { gte: cutoff },
      },
      select: { offerIds: true },
    })

    const dbOfferIds = rows.flatMap(r => r.offerIds)
    // Also include in-memory (may have recent sends not yet in DB)
    const memOfferIds = recentSends
      .filter(r => r.channelId === channelId && r.sentAt >= cutoff)
      .map(r => r.offerId)

    return [...new Set([...dbOfferIds, ...memOfferIds])]
  } catch {
    return recentSends
      .filter(r => r.channelId === channelId && r.sentAt >= cutoff)
      .map(r => r.offerId)
  }
}

/**
 * Get offer IDs that were sent recently BUT whose price has dropped since.
 * These offers CAN be re-sent even if within the dedup window.
 * Checks PriceSnapshot to detect price drops of 5%+.
 */
export async function getResentableOfferIds(
  channelId: string,
  hoursBack: number = 72
): Promise<string[]> {
  const cutoff = new Date(Date.now() - hoursBack * 60 * 60 * 1000)

  try {
    // Get recent delivery logs with their offer IDs and timestamps
    const logs = await prisma.waDeliveryLog.findMany({
      where: {
        channelId,
        status: "sent",
        dryRun: false,
        createdAt: { gte: cutoff },
      },
      select: { offerIds: true, sentAt: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    })

    if (logs.length === 0) return []

    // Collect all recently sent offer IDs with their send timestamp
    const sentOffers = new Map<string, Date>()
    for (const logEntry of logs) {
      const sentAt = logEntry.sentAt || logEntry.createdAt
      for (const oid of logEntry.offerIds) {
        // Keep the most recent send date
        const existing = sentOffers.get(oid)
        if (!existing || sentAt > existing) {
          sentOffers.set(oid, sentAt)
        }
      }
    }

    const offerIds = [...sentOffers.keys()]
    if (offerIds.length === 0) return []

    // Check current prices vs price at broadcast time
    const resentable: string[] = []

    // Batch query: get current price for all offers
    const currentOffers = await prisma.offer.findMany({
      where: { id: { in: offerIds }, isActive: true },
      select: { id: true, currentPrice: true },
    })

    for (const offer of currentOffers) {
      const lastSentAt = sentOffers.get(offer.id)
      if (!lastSentAt) continue

      // Get price snapshot closest to when we last sent this offer
      const snapAtSend = await prisma.priceSnapshot.findFirst({
        where: {
          offerId: offer.id,
          capturedAt: { lte: lastSentAt },
        },
        orderBy: { capturedAt: "desc" },
        select: { price: true },
      })

      if (!snapAtSend) continue

      // If price dropped 5%+ since last broadcast, allow re-send
      const priceDrop = (snapAtSend.price - offer.currentPrice) / snapAtSend.price
      if (priceDrop >= 0.05) {
        resentable.push(offer.id)
      }
    }

    log.info("fatigue-guard.resentable-offers", {
      channelId,
      checked: offerIds.length,
      resentable: resentable.length,
    })

    return resentable
  } catch (err) {
    log.warn("fatigue-guard.resentable-check-failed", { error: String(err) })
    return []
  }
}

/**
 * Check if a specific offer was sent too recently to a channel.
 */
export async function wasRecentlySent(
  offerId: string,
  channelId: string,
  hoursBack: number = 12
): Promise<boolean> {
  const recentIds = await getRecentOfferIds(channelId, hoursBack)
  return recentIds.includes(offerId)
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
  if (channelRecent.length < 5) return false

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
export async function checkFatigue(
  channelId: string,
  dailyLimit: number,
  quietStart: number | null,
  quietEnd: number | null,
  timezone: string = "America/Sao_Paulo",
  cooldownMinutes: number = 120,
): Promise<{ allowed: boolean; reasons: string[] }> {
  const reasons: string[] = []

  if (await isDailyLimitReached(channelId, dailyLimit)) {
    reasons.push(`Limite diario de ${dailyLimit} envios atingido`)
  }

  if (await isCooldownActive(channelId, cooldownMinutes)) {
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
