// ============================================================================
// Evolution API v2 Client — conexão WhatsApp via QR code
// Docs: https://doc.evolution-api.com/v2
// ============================================================================

import { logger } from "@/lib/logger"

const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || "promosnap"

function getConfig() {
  const apiUrl = process.env.EVOLUTION_API_URL
  const apiKey = process.env.EVOLUTION_API_KEY
  return { apiUrl, apiKey, instanceName: INSTANCE_NAME }
}

export function isEvolutionConfigured(): boolean {
  const { apiUrl, apiKey } = getConfig()
  return !!(apiUrl && apiKey)
}

async function call<T = Record<string, unknown>>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<{ ok: boolean; data: T; status: number }> {
  const { apiUrl, apiKey } = getConfig()
  if (!apiUrl || !apiKey) {
    return { ok: false, data: { error: "Evolution API não configurada" } as T, status: 0 }
  }

  const url = `${apiUrl.replace(/\/+$/, "")}${path}`

  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
    })

    const text = await res.text()
    let data: T
    try {
      data = JSON.parse(text)
    } catch {
      data = { raw: text } as T
    }

    return { ok: res.ok, data, status: res.status }
  } catch (err) {
    logger.error("evolution-api.call-failed", { method, path, error: err })
    return {
      ok: false,
      data: { error: err instanceof Error ? err.message : String(err) } as T,
      status: 0,
    }
  }
}

// ─── Instance Management ─────────────────────────────────────────────────

export interface InstanceInfo {
  instanceName: string
  state: "open" | "close" | "connecting" | "unknown"
}

/**
 * Cria uma instância no Evolution API (ou retorna a existente).
 * Já pede o QR code junto.
 */
export async function createInstance(): Promise<{
  ok: boolean
  qrcode?: string
  instance?: InstanceInfo
  error?: string
}> {
  const { instanceName } = getConfig()

  const { ok, data } = await call<{
    instance?: { instanceName: string; status: string }
    qrcode?: { base64: string }
    error?: string
    message?: string
  }>("POST", "/instance/create", {
    instanceName,
    integration: "WHATSAPP-BAILEYS",
    qrcode: true,
    reject_call: true,
    always_online: true,
  })

  if (!ok) {
    // Instância já existe — tentar conectar
    const errorMsg = data?.error || data?.message || ""
    if (
      typeof errorMsg === "string" &&
      (errorMsg.includes("already") || errorMsg.includes("exists") || errorMsg.includes("instance"))
    ) {
      return connectInstance()
    }
    return { ok: false, error: JSON.stringify(data) }
  }

  return {
    ok: true,
    qrcode: data?.qrcode?.base64,
    instance: {
      instanceName: data?.instance?.instanceName || instanceName,
      state: (data?.instance?.status as InstanceInfo["state"]) || "connecting",
    },
  }
}

/**
 * Pede novo QR code para uma instância existente.
 */
export async function connectInstance(): Promise<{
  ok: boolean
  qrcode?: string
  instance?: InstanceInfo
  error?: string
}> {
  const { instanceName } = getConfig()

  const { ok, data } = await call<{
    base64?: string
    code?: string
    instance?: { state: string }
    error?: string
  }>("GET", `/instance/connect/${instanceName}`)

  if (!ok) {
    return { ok: false, error: JSON.stringify(data) }
  }

  // Se já está conectado, não retorna QR code
  if (data?.instance?.state === "open") {
    return {
      ok: true,
      instance: { instanceName, state: "open" },
    }
  }

  return {
    ok: true,
    qrcode: data?.base64 || undefined,
    instance: {
      instanceName,
      state: (data?.instance?.state as InstanceInfo["state"]) || "connecting",
    },
  }
}

/**
 * Verifica o estado da conexão.
 */
export async function getConnectionState(): Promise<{
  ok: boolean
  state: InstanceInfo["state"]
  instance?: InstanceInfo
  error?: string
}> {
  const { instanceName } = getConfig()

  const { ok, data } = await call<{
    instance?: { instanceName: string; state: string }
    error?: string
  }>("GET", `/instance/connectionState/${instanceName}`)

  if (!ok) {
    return { ok: false, state: "unknown", error: JSON.stringify(data) }
  }

  const state = (data?.instance?.state || "unknown") as InstanceInfo["state"]
  return {
    ok: true,
    state,
    instance: {
      instanceName: data?.instance?.instanceName || instanceName,
      state,
    },
  }
}

/**
 * Desconecta (logout) a instância.
 */
export async function disconnectInstance(): Promise<{ ok: boolean; error?: string }> {
  const { instanceName } = getConfig()
  const { ok, data } = await call<{ error?: string }>(
    "DELETE",
    `/instance/logout/${instanceName}`,
  )
  return { ok, error: ok ? undefined : JSON.stringify(data) }
}

// ─── Envio de Mensagens ──────────────────────────────────────────────────

export interface SendTextResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Envia mensagem de texto via Evolution API.
 * @param number — número ou groupId (ex: "120363xxx@g.us")
 * @param text — texto da mensagem (max 4096 chars)
 */
export async function sendText(number: string, text: string): Promise<SendTextResult> {
  const { instanceName } = getConfig()

  const { ok, data } = await call<{
    key?: { id: string; remoteJid: string }
    error?: string
    message?: string
  }>("POST", `/message/sendText/${instanceName}`, {
    number,
    text,
  })

  if (!ok) {
    return {
      success: false,
      error: data?.error || data?.message || "Falha ao enviar",
    }
  }

  return {
    success: true,
    messageId: data?.key?.id,
  }
}

/**
 * Envia mensagem de teste rápida.
 */
export async function sendTestMessage(
  groupId: string,
  text = "✅ PromoSnap conectado! Este é um teste do sistema de broadcast.",
): Promise<SendTextResult> {
  return sendText(groupId, text)
}

// ─── Utilitários ─────────────────────────────────────────────────────────

/**
 * Retorna status geral para o dashboard admin.
 */
export async function getDashboardStatus(): Promise<{
  configured: boolean
  connected: boolean
  state: InstanceInfo["state"]
  instanceName: string
  apiUrl: string | undefined
}> {
  const { apiUrl, instanceName } = getConfig()

  if (!isEvolutionConfigured()) {
    return {
      configured: false,
      connected: false,
      state: "unknown",
      instanceName,
      apiUrl,
    }
  }

  const { state } = await getConnectionState()

  return {
    configured: true,
    connected: state === "open",
    state,
    instanceName,
    apiUrl,
  }
}
