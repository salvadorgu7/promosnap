// ============================================================================
// Welcome Email Job — sends welcome emails to new subscribers
// ============================================================================

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { sendEmail, isEmailConfigured } from '@/lib/email/send'
import { welcomeEmail } from '@/lib/email/templates'

export async function runWelcomeEmails() {
  if (!isEmailConfigured()) {
    return { status: 'SKIPPED', reason: 'Email not configured' }
  }

  // Find subscribers created in last 4h who haven't received welcome email
  const since = new Date(Date.now() - 4 * 60 * 60 * 1000)

  const newSubscribers = await prisma.subscriber.findMany({
    where: {
      status: 'ACTIVE',
      createdAt: { gt: since },
    },
    select: { email: true },
  })

  let sent = 0
  let skipped = 0

  for (const sub of newSubscribers) {
    // Check if already sent
    const alreadySent = await prisma.emailLog.findFirst({
      where: { to: sub.email, template: 'welcome' },
    })

    if (alreadySent) {
      skipped++
      continue
    }

    try {
      await sendEmail({
        to: sub.email,
        subject: 'Bem-vindo ao PromoSnap! Comece a economizar',
        html: welcomeEmail(),
        template: 'welcome',
      })
      sent++
    } catch (err) {
      logger.warn('welcome-email.failed', { email: sub.email, error: err })
    }
  }

  logger.info('welcome-email.complete', { sent, skipped, total: newSubscribers.length })

  return {
    status: 'SUCCESS',
    itemsTotal: newSubscribers.length,
    itemsDone: sent,
    metadata: { sent, skipped },
  }
}
