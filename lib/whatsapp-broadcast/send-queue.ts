// ============================================
// WhatsApp Broadcast — Send Queue / Delivery Orchestrator
// Handles actual message delivery to WhatsApp groups
// Supports: Evolution API v2 (primary) + WhatsApp Business API (fallback)
// ============================================

import { logger } from "@/lib/logger"
import type { ComposedMessage, WaSendResult } from "./types"
import { isEvolutionConfigured, sendText as evolutionSendText } from "@/lib/whatsapp/evolution-api"

const log = logger.child({ module: "wa-broadcast.send-queue" })

// ============================================
// Provider detection: Evolution API > WA Business API
// ============================================

type ProviderType = "evolution" | "whatsapp-business" | "none"

interface ProviderConfig {
  type: ProviderType
  apiUrl: string
  apiToken: string
  phoneId: string | null
}

function detectProvider(): ProviderType {
  if (isEvolutionConfigured()) return "evolution"
  if (process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN) return "whatsapp-business"
  return "none"
}

function getProviderConfig(): ProviderConfig | null {
  const provider = detectProvider()

  if (provider === "evolution") {
    return {
      type: "evolution",
      apiUrl: process.env.EVOLUTION_API_URL || "",
      apiToken: process.env.EVOLUTION_API_KEY || "",
      phoneId: null,
    }
  }

  if (provider === "whatsapp-business") {
    return {
      type: "whatsapp-business",
      apiUrl: process.env.WHATSAPP_API_URL!,
      apiToken: process.env.WHATSAPP_API_TOKEN!,
      phoneId: process.env.WHATSAPP_PHONE_ID || null,
    }
  }

  return null
}

/**
 * Check if WhatsApp broadcast API is configured and ready.
 */
export function isBroadcastReady(): boolean {
  return detectProvider() !== "none"
}

/**
 * Returns which provider is active.
 */
export function getActiveProviderName(): ProviderType {
  return detectProvider()
}

/**
 * Send a composed message to a WhatsApp group.
 * Automatically uses Evolution API if configured, otherwise falls back to WA Business API.
 */
export async function sendToGroup(
  destinationId: string,
  message: ComposedMessage,
): Promise<WaSendResult> {
  const config = getProviderConfig()

  if (!config) {
    return {
      success: false,
      error: "WhatsApp não configurado. Configure EVOLUTION_API_URL + EVOLUTION_API_KEY ou WHATSAPP_API_URL + WHATSAPP_API_TOKEN.",
    }
  }

  try {
    log.info("send-queue.sending", {
      destinationId,
      channelId: message.channelId,
      campaignId: message.campaignId,
      offersCount: message.offers.length,
      structure: message.structure,
      provider: config.type,
    })

    // ── Evolution API v2 ──
    if (config.type === "evolution") {
      const result = await evolutionSendText(destinationId, message.text)
      if (!result.success) {
        log.error("send-queue.evolution-error", { error: result.error, destinationId })
        return { success: false, error: result.error || "Falha Evolution API" }
      }
      log.info("send-queue.sent", { destinationId, messageId: result.messageId, provider: "evolution" })
      return {
        success: true,
        messageId: result.messageId || `evo_${Date.now()}`,
        providerResponse: { provider: "evolution" },
      }
    }

    // ── WhatsApp Business API (fallback) ──
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
          body: message.text,
        },
        ...(config.phoneId ? { phone_number_id: config.phoneId } : {}),
      }),
      signal: AbortSignal.timeout(30000),
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
      provider: "whatsapp-business",
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
 * Uses Evolution API if configured.
 */
export async function sendTestMessage(destinationId: string): Promise<WaSendResult> {
  const provider = detectProvider()

  if (provider === "none") {
    return { success: false, error: "WhatsApp não configurado" }
  }

  const testText = "✅ PromoSnap Broadcast — integração funcionando!"

  // ── Evolution API ──
  if (provider === "evolution") {
    const result = await evolutionSendText(destinationId, testText)
    return {
      success: result.success,
      messageId: result.messageId || "test_ok",
      error: result.error,
    }
  }

  // ── WA Business API fallback ──
  const config = getProviderConfig()!
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
        text: { body: testText },
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
