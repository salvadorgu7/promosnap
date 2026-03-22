// ============================================
// WhatsApp Broadcast — Send Queue / Delivery Orchestrator
// Handles actual message delivery to WhatsApp groups
// ============================================

import { logger } from "@/lib/logger"
import type { ComposedMessage, WaSendResult } from "./types"

const log = logger.child({ module: "wa-broadcast.send-queue" })

// ============================================
// Provider: WhatsApp Business API (group send)
// Supports any provider that accepts POST with text body
// ============================================

interface ProviderConfig {
  apiUrl: string
  apiToken: string
  phoneId: string | null
}

function getProviderConfig(): ProviderConfig | null {
  const apiUrl = process.env.WHATSAPP_API_URL
  const apiToken = process.env.WHATSAPP_API_TOKEN

  if (!apiUrl || !apiToken) return null

  return {
    apiUrl,
    apiToken,
    phoneId: process.env.WHATSAPP_PHONE_ID || null,
  }
}

/**
 * Check if WhatsApp broadcast API is configured and ready.
 */
export function isBroadcastReady(): boolean {
  return getProviderConfig() !== null
}

/**
 * Send a composed message to a WhatsApp group.
 * Uses the configured provider (generic REST API).
 */
export async function sendToGroup(
  destinationId: string,
  message: ComposedMessage,
): Promise<WaSendResult> {
  const config = getProviderConfig()

  if (!config) {
    return {
      success: false,
      error: "WhatsApp API nao configurado. Configure WHATSAPP_API_URL + WHATSAPP_API_TOKEN.",
    }
  }

  try {
    log.info("send-queue.sending", {
      destinationId,
      channelId: message.channelId,
      campaignId: message.campaignId,
      offersCount: message.offers.length,
      structure: message.structure,
    })

    const res = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiToken}`,
      },
      body: JSON.stringify({
        // Standard WhatsApp Business API format
        messaging_product: "whatsapp",
        recipient_type: "group",
        to: destinationId,
        type: "text",
        text: {
          body: message.text,
        },
        // Additional metadata
        ...(config.phoneId ? { phone_number_id: config.phoneId } : {}),
      }),
      signal: AbortSignal.timeout(30000), // 30s timeout
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "Unknown error")
      log.error("send-queue.provider-error", {
        status: res.status,
        body: body.slice(0, 500),
        destinationId,
      })
      return {
        success: false,
        error: `WhatsApp API ${res.status}: ${body.slice(0, 200)}`,
        providerResponse: { status: res.status, body: body.slice(0, 500) },
      }
    }

    const data = await res.json().catch(() => ({}))

    log.info("send-queue.sent", {
      destinationId,
      messageId: data.messages?.[0]?.id,
    })

    return {
      success: true,
      messageId: data.messages?.[0]?.id || data.id || `wa_${Date.now()}`,
      providerResponse: data,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido"
    log.error("send-queue.send-failed", { error: msg, destinationId })
    return {
      success: false,
      error: msg,
    }
  }
}

/**
 * Send a test message to verify configuration.
 */
export async function sendTestMessage(destinationId: string): Promise<WaSendResult> {
  const config = getProviderConfig()
  if (!config) {
    return { success: false, error: "WhatsApp API nao configurado" }
  }

  try {
    const res = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "group",
        to: destinationId,
        type: "text",
        text: {
          body: "PromoSnap test — integracao WhatsApp Broadcast funcionando!",
        },
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      return { success: false, error: `API ${res.status}: ${body.slice(0, 200)}` }
    }

    const data = await res.json().catch(() => ({}))
    return { success: true, messageId: data.messages?.[0]?.id || "test_ok" }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Erro" }
  }
}

// ============================================
// Retry logic
// ============================================

const MAX_RETRIES = 3
const RETRY_DELAYS = [5000, 15000, 45000] // 5s, 15s, 45s

/**
 * Send with automatic retry on failure.
 */
export async function sendWithRetry(
  destinationId: string,
  message: ComposedMessage,
): Promise<WaSendResult & { retries: number }> {
  let lastResult: WaSendResult = { success: false, error: "Not attempted" }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAYS[attempt - 1] || 60000
      log.info("send-queue.retry", { attempt, delay, destinationId })
      await new Promise(r => setTimeout(r, delay))
    }

    lastResult = await sendToGroup(destinationId, message)

    if (lastResult.success) {
      return { ...lastResult, retries: attempt }
    }

    // Don't retry on auth errors (4xx)
    if (lastResult.error?.includes("401") || lastResult.error?.includes("403")) {
      break
    }
  }

  return { ...lastResult, retries: MAX_RETRIES }
}
