// ============================================
// WhatsApp Broadcast — Delivery Log & Audit Trail
// Tracks all sends, previews, and dry-runs
// ============================================

import { logger } from "@/lib/logger"
import type {
  DeliveryLogEntry,
  DeliveryStatus,
  ComposedMessage,
  WaSendResult,
} from "./types"

const log = logger.child({ module: "wa-broadcast.delivery-log" })

// ============================================
// In-memory log (persistent via DB in future)
// ============================================

const deliveryLogs: DeliveryLogEntry[] = []
let logCounter = 0
const MAX_LOGS = 200

/**
 * Record a delivery attempt.
 */
export function recordDelivery(params: {
  channelId: string
  channelName: string
  campaignId?: string | null
  campaignName?: string | null
  status: DeliveryStatus
  message: ComposedMessage
  sendResult?: WaSendResult | null
  dryRun?: boolean
}): DeliveryLogEntry {
  const entry: DeliveryLogEntry = {
    id: `wa_log_${++logCounter}_${Date.now()}`,
    channelId: params.channelId,
    channelName: params.channelName,
    campaignId: params.campaignId || null,
    campaignName: params.campaignName || null,
    status: params.status,
    messageText: params.message.text,
    offerIds: params.message.offers.map(o => o.offerId),
    offerCount: params.message.offers.length,
    templateUsed: params.message.templateKey,
    openingUsed: params.message.opening,
    ctaUsed: params.message.cta,
    providerResponse: params.sendResult?.providerResponse || null,
    errorMessage: params.sendResult?.error || null,
    dryRun: params.dryRun || false,
    sentAt: params.status === "sent" ? new Date() : null,
    createdAt: new Date(),
  }

  deliveryLogs.unshift(entry)
  if (deliveryLogs.length > MAX_LOGS) {
    deliveryLogs.length = MAX_LOGS
  }

  log.info("delivery-log.recorded", {
    id: entry.id,
    channelId: entry.channelId,
    status: entry.status,
    offerCount: entry.offerCount,
    dryRun: entry.dryRun,
  })

  return entry
}

/**
 * Get delivery history.
 */
export function getDeliveryHistory(
  limit: number = 50,
  channelId?: string,
  status?: DeliveryStatus,
): DeliveryLogEntry[] {
  let filtered = deliveryLogs

  if (channelId) {
    filtered = filtered.filter(l => l.channelId === channelId)
  }
  if (status) {
    filtered = filtered.filter(l => l.status === status)
  }

  return filtered.slice(0, limit)
}

/**
 * Get delivery stats.
 */
export function getDeliveryStats(): {
  total: number
  sent: number
  failed: number
  dryRun: number
  todaySent: number
  todayFailed: number
  byChannel: Record<string, { sent: number; failed: number }>
  byCampaign: Record<string, { sent: number; failed: number }>
} {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const stats = {
    total: deliveryLogs.length,
    sent: 0,
    failed: 0,
    dryRun: 0,
    todaySent: 0,
    todayFailed: 0,
    byChannel: {} as Record<string, { sent: number; failed: number }>,
    byCampaign: {} as Record<string, { sent: number; failed: number }>,
  }

  for (const entry of deliveryLogs) {
    if (entry.status === "sent") stats.sent++
    if (entry.status === "failed") stats.failed++
    if (entry.dryRun) stats.dryRun++

    if (entry.createdAt >= today) {
      if (entry.status === "sent") stats.todaySent++
      if (entry.status === "failed") stats.todayFailed++
    }

    // By channel
    const chKey = entry.channelName || entry.channelId
    if (!stats.byChannel[chKey]) stats.byChannel[chKey] = { sent: 0, failed: 0 }
    if (entry.status === "sent") stats.byChannel[chKey].sent++
    if (entry.status === "failed") stats.byChannel[chKey].failed++

    // By campaign
    if (entry.campaignName) {
      if (!stats.byCampaign[entry.campaignName]) stats.byCampaign[entry.campaignName] = { sent: 0, failed: 0 }
      if (entry.status === "sent") stats.byCampaign[entry.campaignName].sent++
      if (entry.status === "failed") stats.byCampaign[entry.campaignName].failed++
    }
  }

  return stats
}

/**
 * Get the last send time for a channel.
 */
export function getLastSendTime(channelId: string): Date | null {
  const last = deliveryLogs.find(
    l => l.channelId === channelId && l.status === "sent" && !l.dryRun
  )
  return last?.sentAt || null
}
