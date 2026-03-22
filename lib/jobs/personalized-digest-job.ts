// ============================================================================
// Personalized Digest Job — envia emails personalizados semanais
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
    select: { email: true, interests: true, name: true },
    take: MAX_EMAILS_PER_RUN,
  })

  let sent = 0
  let skipped = 0

  for (const sub of subscribers) {
    try {
      // Verificar se já enviou esta semana (6 dias cooldown)
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

      // Pular se não tem conteúdo interessante
      if (digest.priceDrops.length === 0 && digest.topDeals.length === 0 && digest.newInCategories.length === 0) {
        skipped++
        continue
      }

      const html = personalizedDigestEmail(digest)

      // Subject line dinâmico baseado no conteúdo
      const dropCount = digest.priceDrops.length
      const dealCount = digest.topDeals.length
      let subject: string
      if (dropCount > 0 && dealCount > 0) {
        subject = `📉 ${dropCount} preços caíram + ${dealCount} ofertas selecionadas`
      } else if (dropCount > 0) {
        subject = `📉 ${dropCount} ${dropCount === 1 ? 'produto caiu' : 'produtos caíram'} de preço — veja agora`
      } else {
        subject = `🔥 ${dealCount} ofertas imperdíveis para você esta semana`
      }

      await sendEmail({
        to: sub.email,
        subject,
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
