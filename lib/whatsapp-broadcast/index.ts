// ============================================
// WhatsApp Broadcast Engine — Main Orchestrator
// Coordinates all modules for end-to-end broadcast
// ============================================

import { logger } from "@/lib/logger"
import type {
  ComposedMessage,
  BroadcastChannel,
  BroadcastCampaign,
  WaSendResult,
  DeliveryLogEntry,
  MessageStructure,
  MessageTonality,
  TimeWindow,
} from "./types"
import { selectOffers } from "./offer-selector"
import { composeMessage } from "./composer"
import { checkFatigue, getRecentOfferIds, recordSend } from "./fatigue-guard"
import { sendWithRetry, isBroadcastReady, sendTestMessage } from "./send-queue"
import { recordDelivery, getDeliveryHistory, getDeliveryStats } from "./delivery-log"
import {
  getAllChannels,
  getChannel,
  getActiveChannels,
  getAllCampaigns,
  getCampaign,
  getCampaignsForChannel,
  getActiveCampaigns,
  getDueCampaigns,
  recordCampaignRun,
  recordChannelSend,
  resetDailyCounters,
  createChannel,
  updateChannel,
  deleteChannel,
  createCampaign,
  updateCampaign,
  deleteCampaign,
} from "./channel-registry"
import { detectTimeWindow } from "./templates"

const log = logger.child({ module: "wa-broadcast" })

// ============================================
// Core broadcast execution
// ============================================

export interface BroadcastOptions {
  channelId: string
  campaignId?: string | null
  dryRun?: boolean
  structure?: MessageStructure
  tonality?: MessageTonality
  timeWindow?: TimeWindow
  offerCount?: number
}

export interface BroadcastResult {
  success: boolean
  dryRun: boolean
  channel: BroadcastChannel
  campaign: BroadcastCampaign | null
  message: ComposedMessage | null
  sendResult: WaSendResult | null
  deliveryLog: DeliveryLogEntry | null
  fatigueCheck: { allowed: boolean; reasons: string[] }
  offerCount: number
  error?: string
}

/**
 * Execute a broadcast: select offers → compose → send (or dry-run).
 * This is the main entry point for the engine.
 */
export async function executeBroadcast(options: BroadcastOptions): Promise<BroadcastResult> {
  const { channelId, campaignId, dryRun = false } = options

  // 1. Resolve channel
  const channel = await getChannel(channelId)
  if (!channel) {
    return {
      success: false,
      dryRun,
      channel: null as any,
      campaign: null,
      message: null,
      sendResult: null,
      deliveryLog: null,
      fatigueCheck: { allowed: false, reasons: ["Canal nao encontrado"] },
      offerCount: 0,
      error: `Canal ${channelId} nao encontrado`,
    }
  }

  // 2. Resolve campaign (optional)
  const campaign = campaignId ? await getCampaign(campaignId) : null

  // 3. Check fatigue (skip for dry-run)
  const fatigueCheck = dryRun
    ? { allowed: true, reasons: [] as string[] }
    : await checkFatigue(
        channel.id,
        channel.dailyLimit,
        channel.quietHoursStart,
        channel.quietHoursEnd,
        channel.timezone,
      )

  if (!fatigueCheck.allowed && !dryRun) {
    log.info("broadcast.blocked-by-fatigue", {
      channelId,
      reasons: fatigueCheck.reasons,
    })
    return {
      success: false,
      dryRun,
      channel,
      campaign,
      message: null,
      sendResult: null,
      deliveryLog: null,
      fatigueCheck,
      offerCount: 0,
      error: `Envio bloqueado: ${fatigueCheck.reasons.join(", ")}`,
    }
  }

  // 4. Select offers
  const excludeOfferIds = await getRecentOfferIds(channel.id, 24)
  const offers = await selectOffers({
    channel,
    campaign,
    limit: options.offerCount || campaign?.offerCount || channel.defaultOfferCount,
    excludeOfferIds,
  })

  if (offers.length === 0) {
    log.warn("broadcast.no-offers", { channelId, campaignId })
    return {
      success: false,
      dryRun,
      channel,
      campaign,
      message: null,
      sendResult: null,
      deliveryLog: null,
      fatigueCheck,
      offerCount: 0,
      error: "Nenhuma oferta elegivel encontrada",
    }
  }

  // 5. Compose message
  const message = composeMessage({
    offers,
    channel,
    campaign,
    structure: options.structure,
    tonality: options.tonality,
    timeWindow: options.timeWindow || detectTimeWindow(),
  })

  // 6. Send or dry-run
  let sendResult: WaSendResult | null = null
  let status: "sent" | "failed" | "dry_run"

  if (dryRun) {
    status = "dry_run"
    log.info("broadcast.dry-run", {
      channelId,
      offerCount: offers.length,
      textLength: message.text.length,
    })
  } else {
    // Check provider is ready
    if (!isBroadcastReady()) {
      return {
        success: false,
        dryRun,
        channel,
        campaign,
        message,
        sendResult: null,
        deliveryLog: null,
        fatigueCheck,
        offerCount: offers.length,
        error: "WhatsApp API nao configurado",
      }
    }

    sendResult = await sendWithRetry(channel.destinationId, message)
    status = sendResult.success ? "sent" : "failed"

    if (sendResult.success) {
      // Record fatigue tracking
      recordSend(offers.map(o => ({
        offerId: o.offerId,
        channelId: channel.id,
        sentAt: new Date(),
        productName: o.productName,
        category: null,
        marketplace: o.sourceSlug,
      })))

      // Update channel/campaign counters
      await recordChannelSend(channel.id)
      if (campaign) await recordCampaignRun(campaign.id)
    }
  }

  // 7. Record delivery log
  const deliveryLog = await recordDelivery({
    channelId: channel.id,
    channelName: channel.name,
    campaignId: campaign?.id,
    campaignName: campaign?.name,
    status,
    message,
    sendResult,
    dryRun,
  })

  return {
    success: status === "sent" || status === "dry_run",
    dryRun,
    channel,
    campaign,
    message,
    sendResult,
    deliveryLog,
    fatigueCheck,
    offerCount: offers.length,
  }
}

// ============================================
// Scheduled broadcast (for cron job)
// ============================================

/**
 * Run all due scheduled campaigns.
 * Called by the cron job.
 */
export async function runScheduledBroadcasts(): Promise<{
  status: string
  executed: number
  skipped: number
  failed: number
  results: Array<{ campaign: string; channel: string; success: boolean; error?: string }>
}> {
  await resetDailyCounters()

  const due = await getDueCampaigns()
  log.info("broadcast.scheduled.start", { dueCampaigns: due.length })

  if (due.length === 0) {
    return { status: "OK", executed: 0, skipped: 0, failed: 0, results: [] }
  }

  let executed = 0
  let skipped = 0
  let failed = 0
  const results: Array<{ campaign: string; channel: string; success: boolean; error?: string }> = []

  for (const { campaign, channel } of due) {
    try {
      const result = await executeBroadcast({
        channelId: channel.id,
        campaignId: campaign.id,
      })

      if (result.success) {
        executed++
      } else if (result.error?.includes("bloqueado")) {
        skipped++
      } else {
        failed++
      }

      results.push({
        campaign: campaign.name,
        channel: channel.name,
        success: result.success,
        error: result.error,
      })
    } catch (error) {
      failed++
      const msg = error instanceof Error ? error.message : "Erro desconhecido"
      log.error("broadcast.scheduled.campaign-failed", {
        campaignId: campaign.id,
        error: msg,
      })
      results.push({
        campaign: campaign.name,
        channel: channel.name,
        success: false,
        error: msg,
      })
    }

    // Small delay between campaigns to avoid rate limiting
    await new Promise(r => setTimeout(r, 2000))
  }

  log.info("broadcast.scheduled.complete", { executed, skipped, failed })

  return {
    status: failed === 0 ? "OK" : "PARTIAL",
    executed,
    skipped,
    failed,
    results,
  }
}

// ============================================
// Public API (re-exports for convenience)
// ============================================

export {
  // Channel registry
  getAllChannels,
  getChannel,
  getActiveChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  // Campaign registry
  getAllCampaigns,
  getCampaign,
  getCampaignsForChannel,
  getActiveCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  // Delivery log
  getDeliveryHistory,
  getDeliveryStats,
  // Send queue
  isBroadcastReady,
  sendTestMessage,
  // Templates
  detectTimeWindow,
}

export { getAllTemplateData } from "./templates"

// Campaign Calendar (Mega Prompt 03)
export {
  getPromoCalendar,
  getUpcomingEvents,
  getActiveEvents,
  getEventPhase,
  getCampaignTemplates,
  getCampaignTemplate,
  getCalendarData,
} from "./campaign-calendar"

// Metrics & Revenue Analytics (Mega Prompt 04)
export {
  computeKPIs,
  getMetricsDashboard,
} from "./metrics"
