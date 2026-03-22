/**
 * WhatsApp Broadcast Job — runs scheduled campaigns.
 *
 * Checks all active campaigns, determines which are due based on schedule,
 * and executes broadcasts for each.
 *
 * Env: WHATSAPP_API_URL, WHATSAPP_API_TOKEN, WHATSAPP_GROUP_ID
 */

import { logger } from "@/lib/logger"
import { runScheduledBroadcasts, isBroadcastReady } from "@/lib/whatsapp-broadcast"

const log = logger.child({ job: "whatsapp-broadcast" })

export async function runWhatsAppBroadcast() {
  if (!isBroadcastReady()) {
    return {
      status: "SKIPPED",
      reason: "WhatsApp API nao configurado. Configure WHATSAPP_API_URL + WHATSAPP_API_TOKEN.",
    }
  }

  log.info("whatsapp-broadcast.start")

  try {
    const result = await runScheduledBroadcasts()

    log.info("whatsapp-broadcast.complete", {
      executed: result.executed,
      skipped: result.skipped,
      failed: result.failed,
    })

    return {
      ...result,
      status: result.failed === 0 ? "OK" : "PARTIAL",
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido"
    log.error("whatsapp-broadcast.failed", { error: msg })
    return {
      status: "FAILED",
      error: msg,
    }
  }
}
