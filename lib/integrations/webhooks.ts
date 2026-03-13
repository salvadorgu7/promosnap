// ============================================
// INTEGRATIONS — Generic Webhook Sender
// ============================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WebhookConfig {
  url: string
  secret?: string
  headers?: Record<string, string>
  enabled: boolean
}

export interface WebhookSendOptions {
  /** Timeout in ms (default 5000) */
  timeoutMs?: number
  /** Number of retries on failure (default 1) */
  retries?: number
  /** Custom headers merged with config headers */
  headers?: Record<string, string>
  /** Webhook style — determines JSON body shape */
  style?: 'generic' | 'slack' | 'discord'
}

export interface WebhookExecutionLog {
  id: string
  url: string
  style: string
  status: 'success' | 'failed'
  statusCode?: number
  error?: string
  sentAt: Date
  durationMs: number
}

// ---------------------------------------------------------------------------
// In-memory execution log (last 100)
// ---------------------------------------------------------------------------

const executionLog: WebhookExecutionLog[] = []
let logCounter = 0

function addLog(entry: Omit<WebhookExecutionLog, 'id'>): WebhookExecutionLog {
  const log: WebhookExecutionLog = {
    ...entry,
    id: `wh_${++logCounter}_${Date.now()}`,
  }
  executionLog.unshift(log)
  if (executionLog.length > 100) {
    executionLog.length = 100
  }
  return log
}

// ---------------------------------------------------------------------------
// URL validation
// ---------------------------------------------------------------------------

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Send webhook
// ---------------------------------------------------------------------------

export async function sendWebhook(
  url: string,
  payload: Record<string, unknown>,
  options?: WebhookSendOptions
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const timeoutMs = options?.timeoutMs ?? 5000
  const retries = options?.retries ?? 1
  const style = options?.style ?? 'generic'

  if (!isValidUrl(url)) {
    const err = `URL invalida: ${url}`
    addLog({ url, style, status: 'failed', error: err, sentAt: new Date(), durationMs: 0 })
    return { success: false, error: err }
  }

  // Build body based on style
  let body: Record<string, unknown>
  switch (style) {
    case 'slack':
      body = { text: payload.text ?? payload.message ?? JSON.stringify(payload) }
      break
    case 'discord':
      body = { content: payload.content ?? payload.message ?? JSON.stringify(payload) }
      break
    default:
      body = payload
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers,
  }

  let lastError = ''
  let lastStatusCode: number | undefined

  for (let attempt = 0; attempt <= retries; attempt++) {
    const start = Date.now()
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      clearTimeout(timer)
      const durationMs = Date.now() - start
      lastStatusCode = res.status

      if (res.ok) {
        addLog({ url, style, status: 'success', statusCode: res.status, sentAt: new Date(), durationMs })
        return { success: true, statusCode: res.status }
      }

      lastError = `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`
    } catch (err) {
      const durationMs = Date.now() - start
      lastError = err instanceof Error ? err.message : 'Erro desconhecido'
      if (attempt === retries) {
        addLog({ url, style, status: 'failed', error: lastError, sentAt: new Date(), durationMs })
      }
    }
  }

  addLog({ url, style, status: 'failed', statusCode: lastStatusCode, error: lastError, sentAt: new Date(), durationMs: 0 })
  return { success: false, statusCode: lastStatusCode, error: lastError }
}

// ---------------------------------------------------------------------------
// Validate webhook config
// ---------------------------------------------------------------------------

export function validateWebhookConfig(config: WebhookConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!config.url) {
    errors.push('URL e obrigatoria')
  } else if (!isValidUrl(config.url)) {
    errors.push('URL invalida — deve comecar com http:// ou https://')
  }

  return { valid: errors.length === 0, errors }
}

// ---------------------------------------------------------------------------
// Get webhook status / execution log
// ---------------------------------------------------------------------------

export function getWebhookStatus(): {
  totalExecutions: number
  successCount: number
  failCount: number
  recentExecutions: WebhookExecutionLog[]
} {
  const successCount = executionLog.filter((e) => e.status === 'success').length
  return {
    totalExecutions: executionLog.length,
    successCount,
    failCount: executionLog.length - successCount,
    recentExecutions: executionLog.slice(0, 20),
  }
}

export function getWebhookExecutionLog(limit = 100): WebhookExecutionLog[] {
  return executionLog.slice(0, limit)
}
