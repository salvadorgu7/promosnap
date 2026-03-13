// ============================================
// INTEGRATIONS — Email Execution Tracking
// ============================================
// Wraps/logs email sends for observability.
// Works alongside existing Resend integration.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EmailType = 'welcome' | 'alert' | 'deal' | 'campaign' | 'digest' | 'other'

export interface EmailExecutionEntry {
  id: string
  emailId: string
  type: EmailType
  recipient: string
  status: 'sent' | 'failed' | 'bounced'
  error?: string
  sentAt: Date
}

export interface EmailStats {
  totalSent: number
  totalFailed: number
  byType: Record<EmailType, { sent: number; failed: number }>
  lastSentAt: Date | null
}

// ---------------------------------------------------------------------------
// In-memory log (last 200)
// ---------------------------------------------------------------------------

const emailLog: EmailExecutionEntry[] = []
let emailLogCounter = 0

// ---------------------------------------------------------------------------
// Track email execution
// ---------------------------------------------------------------------------

export function trackEmailExecution(
  emailId: string,
  type: EmailType,
  recipient: string,
  status: 'sent' | 'failed' | 'bounced',
  error?: string
): EmailExecutionEntry {
  const entry: EmailExecutionEntry = {
    id: `em_${++emailLogCounter}_${Date.now()}`,
    emailId,
    type,
    recipient,
    status,
    error,
    sentAt: new Date(),
  }

  emailLog.unshift(entry)
  if (emailLog.length > 200) {
    emailLog.length = 200
  }

  return entry
}

// ---------------------------------------------------------------------------
// Get execution log
// ---------------------------------------------------------------------------

export function getEmailExecutionLog(limit = 50): EmailExecutionEntry[] {
  return emailLog.slice(0, limit)
}

// ---------------------------------------------------------------------------
// Get email stats
// ---------------------------------------------------------------------------

const ALL_TYPES: EmailType[] = ['welcome', 'alert', 'deal', 'campaign', 'digest', 'other']

export function getEmailStats(): EmailStats {
  const byType: Record<EmailType, { sent: number; failed: number }> = {} as any
  for (const t of ALL_TYPES) {
    byType[t] = { sent: 0, failed: 0 }
  }

  let totalSent = 0
  let totalFailed = 0
  let lastSentAt: Date | null = null

  for (const entry of emailLog) {
    if (entry.status === 'sent') {
      totalSent++
      byType[entry.type].sent++
      if (!lastSentAt || entry.sentAt > lastSentAt) {
        lastSentAt = entry.sentAt
      }
    } else {
      totalFailed++
      byType[entry.type].failed++
    }
  }

  return { totalSent, totalFailed, byType, lastSentAt }
}

// ---------------------------------------------------------------------------
// Resend wrapper helper
// ---------------------------------------------------------------------------

/**
 * Wraps an existing Resend send call to track execution.
 * Usage:
 *   const result = await trackResendSend('deal', 'user@example.com', async () => {
 *     return resend.emails.send({ ... })
 *   })
 */
export async function trackResendSend<T>(
  type: EmailType,
  recipient: string,
  sendFn: () => Promise<T & { id?: string; error?: unknown }>
): Promise<T & { id?: string; error?: unknown }> {
  try {
    const result = await sendFn()
    const emailId = (result as any)?.id ?? `resend_${Date.now()}`
    const hasError = !!(result as any)?.error

    trackEmailExecution(
      emailId,
      type,
      recipient,
      hasError ? 'failed' : 'sent',
      hasError ? String((result as any).error) : undefined
    )

    return result
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    trackEmailExecution(`resend_err_${Date.now()}`, type, recipient, 'failed', msg)
    throw err
  }
}
