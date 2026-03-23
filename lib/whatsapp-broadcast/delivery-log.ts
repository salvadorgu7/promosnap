// ============================================
// WhatsApp Broadcast — Delivery Log & Audit Trail
// DB-backed (Prisma) with in-memory fallback
// ============================================

import { logger } from "@/lib/logger"
import prisma from "@/lib/db/prisma"
import type {
  DeliveryLogEntry,
  DeliveryStatus,
  ComposedMessage,
  WaSendResult,
} from "./types"
import { ensureWaBroadcastTables } from "./db-init"

const log = logger.child({ module: "wa-broadcast.delivery-log" })

// ============================================
// In-memory fallback (when DB unavailable)
// ============================================

const fallbackLogs: DeliveryLogEntry[] = []
const MAX_FALLBACK_LOGS = 200

function dbToLogEntry(row: any): DeliveryLogEntry {
  return {
    id: row.id,
    channelId: row.channelId,
    channelName: row.channelName,
    campaignId: row.campaignId,
    campaignName: row.campaignName,
    status: row.status as DeliveryStatus,
    messageText: row.messageText,
    offerIds: row.offerIds || [],
    offerCount: row.offerCount,
    templateUsed: row.templateUsed || "",
    openingUsed: row.openingUsed || "",
    ctaUsed: row.ctaUsed || "",
    providerResponse: row.providerResponse as Record<string, unknown> | null,
    errorMessage: row.errorMessage,
    dryRun: row.dryRun,
    sentAt: row.sentAt,
    createdAt: row.createdAt,
  }
}

/**
 * Record a delivery attempt.
 */
export async function recordDelivery(params: {
  channelId: string
  channelName: string
  campaignId?: string | null
  campaignName?: string | null
  status: DeliveryStatus
  message: ComposedMessage
  sendResult?: WaSendResult | null
  dryRun?: boolean
}): Promise<DeliveryLogEntry> {
  const entryData = {
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
    providerResponse: (params.sendResult?.providerResponse as any) || null,
    errorMessage: params.sendResult?.error || null,
    dryRun: params.dryRun || false,
    sentAt: params.status === "sent" ? new Date() : null,
  }

  try {
    const row = await prisma.waDeliveryLog.create({ data: entryData })

    log.info("delivery-log.recorded", {
      id: row.id,
      channelId: row.channelId,
      status: row.status,
      offerCount: row.offerCount,
      offerIds: entryData.offerIds.length,
      dryRun: row.dryRun,
    })

    return dbToLogEntry(row)
  } catch (err) {
    log.warn("delivery-log.db-failed", { error: (err as Error).message })

    // Auto-init and retry once
    const created = await ensureWaBroadcastTables()
    if (created) {
      try {
        const row = await prisma.waDeliveryLog.create({ data: entryData })
        log.info("delivery-log.recorded-after-init", { id: row.id })
        return dbToLogEntry(row)
      } catch {
        // Still failing — fall through to in-memory
      }
    }

    // Fallback to in-memory
    const entry: DeliveryLogEntry = {
      id: `wa_log_fb_${Date.now()}`,
      ...entryData,
      createdAt: new Date(),
    }

    fallbackLogs.unshift(entry)
    if (fallbackLogs.length > MAX_FALLBACK_LOGS) {
      fallbackLogs.length = MAX_FALLBACK_LOGS
    }

    return entry
  }
}

/**
 * Get delivery history.
 */
export async function getDeliveryHistory(
  limit: number = 50,
  channelId?: string,
  status?: DeliveryStatus,
): Promise<DeliveryLogEntry[]> {
  try {
    const where: any = {}
    if (channelId) where.channelId = channelId
    if (status) where.status = status

    const rows = await prisma.waDeliveryLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    // Merge with any fallback logs
    const dbEntries = rows.map(dbToLogEntry)
    const fallbackEntries = fallbackLogs
      .filter(l => (!channelId || l.channelId === channelId) && (!status || l.status === status))
      .slice(0, limit)

    // Combine and sort by date, take limit
    return [...dbEntries, ...fallbackEntries]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
  } catch {
    // Pure fallback
    let filtered = fallbackLogs
    if (channelId) filtered = filtered.filter(l => l.channelId === channelId)
    if (status) filtered = filtered.filter(l => l.status === status)
    return filtered.slice(0, limit)
  }
}

/**
 * Get delivery stats.
 */
export async function getDeliveryStats(): Promise<{
  total: number
  sent: number
  failed: number
  dryRun: number
  todaySent: number
  todayFailed: number
  byChannel: Record<string, { sent: number; failed: number }>
  byCampaign: Record<string, { sent: number; failed: number }>
}> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [allLogs, todayLogs] = await Promise.all([
      prisma.waDeliveryLog.findMany({
        select: {
          status: true,
          dryRun: true,
          channelName: true,
          channelId: true,
          campaignName: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1000,
      }),
      prisma.waDeliveryLog.findMany({
        where: { createdAt: { gte: today } },
        select: { status: true },
      }),
    ])

    const stats = {
      total: allLogs.length,
      sent: 0,
      failed: 0,
      dryRun: 0,
      todaySent: 0,
      todayFailed: 0,
      byChannel: {} as Record<string, { sent: number; failed: number }>,
      byCampaign: {} as Record<string, { sent: number; failed: number }>,
    }

    for (const entry of allLogs) {
      if (entry.status === "sent") stats.sent++
      if (entry.status === "failed") stats.failed++
      if (entry.dryRun) stats.dryRun++

      const chKey = entry.channelName || entry.channelId
      if (!stats.byChannel[chKey]) stats.byChannel[chKey] = { sent: 0, failed: 0 }
      if (entry.status === "sent") stats.byChannel[chKey].sent++
      if (entry.status === "failed") stats.byChannel[chKey].failed++

      if (entry.campaignName) {
        if (!stats.byCampaign[entry.campaignName]) stats.byCampaign[entry.campaignName] = { sent: 0, failed: 0 }
        if (entry.status === "sent") stats.byCampaign[entry.campaignName].sent++
        if (entry.status === "failed") stats.byCampaign[entry.campaignName].failed++
      }
    }

    for (const entry of todayLogs) {
      if (entry.status === "sent") stats.todaySent++
      if (entry.status === "failed") stats.todayFailed++
    }

    return stats
  } catch {
    // Fallback to in-memory
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const stats = {
      total: fallbackLogs.length,
      sent: 0,
      failed: 0,
      dryRun: 0,
      todaySent: 0,
      todayFailed: 0,
      byChannel: {} as Record<string, { sent: number; failed: number }>,
      byCampaign: {} as Record<string, { sent: number; failed: number }>,
    }

    for (const entry of fallbackLogs) {
      if (entry.status === "sent") stats.sent++
      if (entry.status === "failed") stats.failed++
      if (entry.dryRun) stats.dryRun++

      if (entry.createdAt >= today) {
        if (entry.status === "sent") stats.todaySent++
        if (entry.status === "failed") stats.todayFailed++
      }

      const chKey = entry.channelName || entry.channelId
      if (!stats.byChannel[chKey]) stats.byChannel[chKey] = { sent: 0, failed: 0 }
      if (entry.status === "sent") stats.byChannel[chKey].sent++
      if (entry.status === "failed") stats.byChannel[chKey].failed++

      if (entry.campaignName) {
        if (!stats.byCampaign[entry.campaignName]) stats.byCampaign[entry.campaignName] = { sent: 0, failed: 0 }
        if (entry.status === "sent") stats.byCampaign[entry.campaignName].sent++
        if (entry.status === "failed") stats.byCampaign[entry.campaignName].failed++
      }
    }

    return stats
  }
}

/**
 * Get the last send time for a channel.
 */
export async function getLastSendTime(channelId: string): Promise<Date | null> {
  try {
    const row = await prisma.waDeliveryLog.findFirst({
      where: { channelId, status: "sent", dryRun: false },
      orderBy: { sentAt: "desc" },
      select: { sentAt: true },
    })
    return row?.sentAt || null
  } catch {
    const last = fallbackLogs.find(
      l => l.channelId === channelId && l.status === "sent" && !l.dryRun
    )
    return last?.sentAt || null
  }
}
