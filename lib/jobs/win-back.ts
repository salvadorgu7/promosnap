// ============================================================================
// Win-Back Campaign — re-engages inactive subscribers
// ============================================================================

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { sendEmail, isEmailConfigured } from '@/lib/email/send'
import { winBackEmail } from '@/lib/email/templates'
import { buildPersonalizedDigest } from '@/lib/email/personalized-digest'

const INACTIVE_DAYS = 30
const MIN_DAYS_BETWEEN_WINBACK = 60
const MAX_PER_RUN = 50

export async function runWinBack() {
  if (!isEmailConfigured()) {
    return { status: 'SKIPPED', reason: 'Email not configured' }
  }

  const inactiveSince = new Date(Date.now() - INACTIVE_DAYS * 24 * 60 * 60 * 1000)
  const winBackCooldown = new Date(Date.now() - MIN_DAYS_BETWEEN_WINBACK * 24 * 60 * 60 * 1000)

  // Find active subscribers who haven't had recent email activity
  const subscribers = await prisma.subscriber.findMany({
    where: {
      status: 'ACTIVE',
      updatedAt: { lt: inactiveSince },
    },
    select: { email: true, interests: true },
    take: MAX_PER_RUN * 2,
  })

  let sent = 0
  let skipped = 0

  for (const sub of subscribers) {
    if (sent >= MAX_PER_RUN) break

    // Check cooldown — no win-back if sent one recently
    const recentWinBack = await prisma.emailLog.findFirst({
      where: {
        to: sub.email,
        template: 'win-back',
        sentAt: { gt: winBackCooldown },
      },
    })
    if (recentWinBack) { skipped++; continue }

    try {
      // Get personalized content for this user
      const digest = await buildPersonalizedDigest(sub.interests, 5)

      // Skip if nothing interesting to show
      if (digest.priceDrops.length === 0 && digest.topDeals.length === 0) {
        skipped++
        continue
      }

      const html = winBackEmail({
        priceDrops: digest.priceDrops.slice(0, 3),
        topDeals: digest.topDeals.slice(0, 3),
      })

      await sendEmail({
        to: sub.email,
        subject: '📉 Sentimos sua falta — veja o que mudou no PromoSnap',
        html,
        template: 'win-back',
      })

      sent++
    } catch (err) {
      logger.warn('win-back.send-failed', { email: sub.email, error: err })
    }
  }

  logger.info('win-back.complete', { sent, skipped, total: subscribers.length })

  return {
    status: 'SUCCESS',
    itemsTotal: subscribers.length,
    itemsDone: sent,
    metadata: { sent, skipped },
  }
}
