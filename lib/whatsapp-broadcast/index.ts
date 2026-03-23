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
import { selectOffers, selectOffersEnhanced } from "./offer-selector"
import { composeMessage, composeSingleOffer, composeExceptionalOffer } from "./composer"
import type { SingleOfferMessage } from "./composer"
import { generateBatchMiniCopy, generateExceptionalCopy } from "./ai-copy"
import { checkFatigue, getRecentOfferIds, getResentableOfferIds, recordSend } from "./fatigue-guard"
import { sendWithRetry, isBroadcastReady, sendTestMessage } from "./send-queue"
import { sendBroadcastMessage as evolutionSendBroadcast } from "@/lib/whatsapp/evolution-api"
import { isEvolutionConfigured } from "@/lib/whatsapp/evolution-api"
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

  // 4. Select offers (72h dedup + price-drop re-send + click demand signals)
  const [excludeOfferIds, resentableOfferIds] = await Promise.all([
    getRecentOfferIds(channel.id, 72),
    getResentableOfferIds(channel.id, 72),
  ])

  let { offers, exceptionalOffers, demandCategories } = await selectOffersEnhanced({
    channel,
    campaign,
    limit: options.offerCount || campaign?.offerCount || channel.defaultOfferCount,
    excludeOfferIds,
    resentableOfferIds,
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

  // 5. Determine mode: individual (1 msg per product) vs composed (1 msg with all)
  const useIndividualMode = isEvolutionConfigured()
  const structure = options.structure || campaign?.structureType || channel.templateMode || "radar"
  const tonality = options.tonality || channel.tonality || "curadoria"
  const timeWindow = options.timeWindow || detectTimeWindow()

  // 5a. Check for exceptional offers (score 90+) — send FIRST as solo urgent message
  if (exceptionalOffers.length > 0 && useIndividualMode && !dryRun && isBroadcastReady()) {
    const topExceptional = exceptionalOffers[0] // Best exceptional offer
    log.info("broadcast.exceptional-offer-detected", {
      channelId,
      offerId: topExceptional.offerId,
      score: topExceptional.offerScore,
      productName: topExceptional.productName.slice(0, 50),
    })

    // Generate aggressive AI copy for this exceptional offer
    const exceptionalCopyResult = await generateExceptionalCopy(topExceptional).catch(() => null)
    const exceptionalMsg = composeExceptionalOffer(topExceptional, channel, campaign, exceptionalCopyResult)

    // Send the exceptional offer FIRST (solo, with image)
    try {
      await evolutionSendBroadcast(
        channel.destinationId,
        exceptionalMsg.text,
        exceptionalMsg.imageUrl,
      )
      log.info("broadcast.exceptional-sent", {
        channelId,
        offerId: topExceptional.offerId,
        score: topExceptional.offerScore,
      })
      // Small delay before regular offers
      await new Promise(r => setTimeout(r, 3000))
    } catch (err) {
      log.warn("broadcast.exceptional-send-failed", { error: String(err) })
    }

    // Remove exceptional from regular offers to avoid duplicate
    const exceptionalIds = new Set(exceptionalOffers.map(o => o.offerId))
    offers = offers.filter(o => !exceptionalIds.has(o.offerId))
  }

  // 5b. Generate AI mini copy for individual mode (batch call — 1 GPT request for all offers)
  const miniCopyMap = useIndividualMode && offers.length > 0
    ? await generateBatchMiniCopy(offers).catch((err) => {
        log.warn("broadcast.ai-copy-failed", { error: String(err) })
        return new Map()
      })
    : new Map()

  // 6. Send or dry-run
  let sendResult: WaSendResult | null = null
  let status: "sent" | "failed" | "dry_run"
  let message: ComposedMessage | null = null

  if (dryRun) {
    // For preview, compose in the selected mode
    if (useIndividualMode) {
      const singleMessages = offers.map(o =>
        composeSingleOffer(o, channel, campaign, tonality, miniCopyMap.get(o.offerId) || null)
      )
      // Join all for preview display
      message = {
        text: singleMessages.map((m, i) => `--- Msg ${i + 1}/${singleMessages.length} ---\n${m.text}`).join("\n\n"),
        offers,
        structure: "individual" as MessageStructure,
        opening: "",
        cta: "",
        transition: null,
        channelId: channel.id,
        campaignId: campaign?.id || null,
        templateKey: `individual_${tonality}`,
      }
    } else {
      message = composeMessage({ offers, channel, campaign, structure, tonality, timeWindow })
    }
    status = "dry_run"
    log.info("broadcast.dry-run", { channelId, offerCount: offers.length, mode: useIndividualMode ? "individual" : "composed", aiCopy: miniCopyMap.size > 0 })
  } else {
    // Check provider is ready
    if (!isBroadcastReady()) {
      return {
        success: false, dryRun, channel, campaign, message: null,
        sendResult: null, deliveryLog: null, fatigueCheck,
        offerCount: offers.length, error: "WhatsApp API não configurado",
      }
    }

    if (useIndividualMode) {
      // ── Modo individual: 1 mensagem por produto com imagem + AI minicopy ──
      const singleMessages = offers.map(o =>
        composeSingleOffer(o, channel, campaign, tonality, miniCopyMap.get(o.offerId) || null)
      )
      let sentCount = 0
      let lastMessageId: string | undefined
      const errors: string[] = []

      for (let i = 0; i < singleMessages.length; i++) {
        const msg = singleMessages[i]
        try {
          const result = await evolutionSendBroadcast(
            channel.destinationId,
            msg.text,
            msg.imageUrl,
          )
          if (result.success) {
            sentCount++
            lastMessageId = result.messageId
          } else {
            errors.push(`Offer ${i + 1}: ${result.error}`)
          }
        } catch (err) {
          errors.push(`Offer ${i + 1}: ${err instanceof Error ? err.message : "erro"}`)
        }

        // Delay entre mensagens (2s) para não flodar
        if (i < singleMessages.length - 1) {
          await new Promise(r => setTimeout(r, 2000))
        }
      }

      sendResult = {
        success: sentCount > 0,
        messageId: lastMessageId || `batch_${Date.now()}`,
        error: errors.length > 0 ? errors.join("; ") : undefined,
      }
      status = sentCount > 0 ? "sent" : "failed"

      // Build composed message for the delivery log
      message = {
        text: singleMessages.map(m => m.text).join("\n\n---\n\n"),
        offers,
        structure: "individual" as MessageStructure,
        opening: "",
        cta: "",
        transition: null,
        channelId: channel.id,
        campaignId: campaign?.id || null,
        templateKey: `individual_${tonality}`,
      }

      log.info("broadcast.individual-sent", {
        channelId, total: singleMessages.length, sent: sentCount, failed: errors.length,
        aiCopy: miniCopyMap.size > 0,
      })
    } else {
      // ── Modo composto: 1 mensagem com tudo ──
      message = composeMessage({ offers, channel, campaign, structure, tonality, timeWindow })
      sendResult = await sendWithRetry(channel.destinationId, message)
      status = sendResult.success ? "sent" : "failed"
    }

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
    message: message!,
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
