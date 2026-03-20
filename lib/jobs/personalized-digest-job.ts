// ============================================================================
// Personalized Digest Job — sends weekly personalized emails to subscribers
// ============================================================================

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { sendEmail, isEmailConfigured } from '@/lib/email/send'
import { buildPersonalizedDigest } from '@/lib/email/personalized-digest'
import { personalizedDigestEmail } from '@/lib/email/templates'

const MAX_EMAILS_PER_RUN = 100

export async function runPersonalizedDigest() {
  if (!isEmailConfigured()) {
    return { status: 'SKIPPED', reason: 'Email not configured' }
  }

  const subscribers = await prisma.subscriber.findMany({
    where: {
      status: 'ACTIVE',
      frequency: { in: ['weekly', 'daily'] },
    },
    select: { email: true, interests: true },
    take: MAX_EMAILS_PER_RUN,
  })

  let sent = 0
  let skipped = 0

  for (const sub of subscribers) {
    try {
      // Check if already sent this week
      const recentEmail = await prisma.emailLog.findFirst({
        where: {
          to: sub.email,
          template: 'personalized-digest',
          sentAt: { gt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) },
        },
      })

      if (recentEmail) {
        skipped++
        continue
      }

      const digest = await buildPersonalizedDigest(sub.interests, 5)

      // Skip if no interesting content
      if (digest.priceDrops.length === 0 && digest.topDeals.length === 0) {
        skipped++
        continue
      }

      const html = personalizedDigestEmail(digest)

      await sendEmail({
        to: sub.email,
        subject: `🔥 Suas ofertas da semana — ${digest.priceDrops.length} quedas de preco`,
        html,
        template: 'personalized-digest',
      })

      sent++
    } catch (err) {
      logger.warn('personalized-digest.subscriber-failed', { email: sub.email, error: err })
    }
  }

  logger.info('personalized-digest.complete', { sent, skipped, total: subscribers.length })

  return {
    status: 'SUCCESS',
    itemsTotal: subscribers.length,
    itemsDone: sent,
    metadata: { sent, skipped },
  }
}
