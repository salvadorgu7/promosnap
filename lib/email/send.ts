// ============================================
// SHARED EMAIL — sendEmail + isEmailConfigured
// Extracted from lib/email/jobs.ts for reuse across the codebase
// ============================================

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { createHash } from 'crypto'

const FROM_EMAIL = 'PromoSnap <noreply@promosnap.com.br>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.promosnap.com.br'

/** Generate unsubscribe token for email footer links */
function generateUnsubscribeToken(email: string): string {
  const secret = process.env.ADMIN_SECRET || 'promosnap-unsub'
  return createHash('sha256').update(`${email}:${secret}`).digest('hex').slice(0, 16)
}

/** Replace {{unsubscribe_url}} placeholder in email HTML */
function injectUnsubscribeUrl(html: string, email: string): string {
  const token = generateUnsubscribeToken(email)
  const url = `${APP_URL}/api/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`
  return html.replace(/\{\{unsubscribe_url\}\}/g, url)
}

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
        html: injectUnsubscribeUrl(opts.html, opts.to),
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
