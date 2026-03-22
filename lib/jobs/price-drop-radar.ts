// ============================================================================
// Price Drop Radar — detects price drops and notifies subscribers
// ============================================================================

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { sendEmail, isEmailConfigured } from '@/lib/email/send'
import { priceDropEmail } from '@/lib/email/templates'

const MAX_EMAILS_PER_SUBSCRIBER = 3
const MAX_DROPS_PER_RUN = 50
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.promosnap.com.br'

export async function runPriceDropRadar() {
  if (!isEmailConfigured()) {
    return { status: 'SKIPPED', reason: 'Email not configured' }
  }

  // Find price drops in last 24h: current snapshot price < previous snapshot price
  const drops: {
    productId: string
    productName: string
    productSlug: string
    imageUrl: string | null
    categorySlug: string | null
    currentPrice: number
    previousPrice: number
  }[] = await prisma.$queryRaw`
    WITH ranked AS (
      SELECT
        p.id as "productId",
        p.name as "productName",
        p.slug as "productSlug",
        p."imageUrl",
        cat.slug as "categorySlug",
        ps.price as "currentPrice",
        LAG(ps.price) OVER (PARTITION BY ps."offerId" ORDER BY ps."capturedAt" DESC) as "previousPrice",
        ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY ps."capturedAt" DESC) as rn
      FROM price_snapshots ps
      JOIN offers o ON ps."offerId" = o.id
      JOIN listings l ON o."listingId" = l.id
      JOIN products p ON l."productId" = p.id
      LEFT JOIN categories cat ON p."categoryId" = cat.id
      WHERE ps."capturedAt" > NOW() - INTERVAL '48 hours'
      AND o."isActive" = true
      AND p.status = 'ACTIVE'
    )
    SELECT "productId", "productName", "productSlug", "imageUrl", "categorySlug",
           "currentPrice", "previousPrice"
    FROM ranked
    WHERE rn = 1
    AND "previousPrice" IS NOT NULL
    AND "currentPrice" < "previousPrice" * 0.95
    ORDER BY ("previousPrice" - "currentPrice") DESC
    LIMIT ${MAX_DROPS_PER_RUN}
  `

  if (drops.length === 0) {
    return { status: 'SUCCESS', itemsTotal: 0, itemsDone: 0, metadata: { drops: 0, emails: 0 } }
  }

  // Get subscribers grouped by interests
  const subscribers = await prisma.subscriber.findMany({
    where: { status: 'ACTIVE' },
    select: { email: true, interests: true },
  })

  let emailsSent = 0
  const emailCountPerSubscriber = new Map<string, number>()

  for (const drop of drops) {
    // Find subscribers interested in this category
    const interested = subscribers.filter(s => {
      if (s.interests.length === 0) return true // No interests = interested in all
      return drop.categorySlug && s.interests.includes(drop.categorySlug)
    })

    for (const sub of interested) {
      const count = emailCountPerSubscriber.get(sub.email) ?? 0
      if (count >= MAX_EMAILS_PER_SUBSCRIBER) continue

      // Check if already notified about this product today
      const alreadySent = await prisma.emailLog.findFirst({
        where: {
          to: sub.email,
          template: 'price-drop',
          subject: { contains: drop.productSlug },
          sentAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      })
      if (alreadySent) continue

      try {
        const discountPct = Math.round(((drop.previousPrice - drop.currentPrice) / drop.previousPrice) * 100)

        const html = priceDropEmail({
          productName: drop.productName,
          currentPrice: drop.currentPrice,
          previousPrice: drop.previousPrice,
          discountPct,
          productUrl: `${APP_URL}/produto/${drop.productSlug}`,
          imageUrl: drop.imageUrl,
        })

        const shortName = drop.productName.length > 40
          ? drop.productName.slice(0, 37) + '...'
          : drop.productName
        const priceStr = drop.currentPrice.toFixed(2).replace('.', ',')

        await sendEmail({
          to: sub.email,
          subject: `📉 ${shortName} caiu ${discountPct}% — agora R$ ${priceStr}`,
          html,
          template: 'price-drop',
        })

        emailsSent++
        emailCountPerSubscriber.set(sub.email, count + 1)
      } catch (err) {
        logger.warn('price-drop-radar.send-failed', { email: sub.email, error: err })
      }
    }
  }

  logger.info('price-drop-radar.complete', { drops: drops.length, emailsSent })

  return {
    status: 'SUCCESS',
    itemsTotal: drops.length,
    itemsDone: emailsSent,
    metadata: { drops: drops.length, emails: emailsSent },
  }
}
