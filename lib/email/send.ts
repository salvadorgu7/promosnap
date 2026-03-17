// ============================================
// SHARED EMAIL — sendEmail + isEmailConfigured
// Extracted from lib/email/jobs.ts for reuse across the codebase
// ============================================

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

const FROM_EMAIL = 'PromoSnap <noreply@promosnap.com.br>'

/**
 * Check if email provider is configured. Returns false if RESEND_API_KEY is missing.
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}

/**
 * Send a single email via Resend. Logs the result to EmailLog.
 */
export async function sendEmail(opts: {
  to: string
  subject: string
  html: string
  template: string
}): Promise<boolean> {
  if (!isEmailConfigured()) {
    logger.warn("email.resend-not-configured")
    return false
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      }),
    })

    const ok = res.ok

    try {
      await prisma.emailLog.create({
        data: {
          to: opts.to,
          subject: opts.subject,
          template: opts.template,
          status: ok ? 'sent' : 'failed',
        },
      })
    } catch {
      // logging failure should not block the caller
    }

    return ok
  } catch (error) {
    logger.error("email.send-failed", { error })

    try {
      await prisma.emailLog.create({
        data: {
          to: opts.to,
          subject: opts.subject,
          template: opts.template,
          status: 'failed',
        },
      })
    } catch {
      // logging failure should not block the caller
    }

    return false
  }
}
