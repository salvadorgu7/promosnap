/**
 * Telegram Daily Deals — posts top deals to Telegram channel automatically.
 *
 * Selects the best deals of the day (highest discount vs historical average),
 * formats them, and sends to the configured Telegram channel.
 *
 * Env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 */

import prisma from '@/lib/db/prisma'
import { isTelegramConfigured, formatTelegramMessage, sendTelegramMessage } from '@/lib/distribution/telegram'
import type { DistributableOffer } from '@/lib/distribution/types'
import { logger } from '@/lib/logger'

const log = logger.child({ job: 'telegram-daily-deals' })

export async function sendDailyDeals() {
  if (!isTelegramConfigured()) {
    return { status: 'SKIPPED', reason: 'Telegram não configurado' }
  }

  // Fetch top deals: active offers with biggest discounts, ordered by score
  const offers = await prisma.offer.findMany({
    where: {
      isActive: true,
      currentPrice: { gt: 0 },
      originalPrice: { gt: 0 },
    },
    orderBy: { offerScore: 'desc' },
    take: 50,
    include: {
      listing: {
        include: {
          source: { select: { name: true } },
          product: { select: { name: true, slug: true, imageUrl: true } },
        },
      },
    },
  })

  // Filter to real discounts > 10% and map to DistributableOffer
  const deals: (DistributableOffer & { score: number })[] = []

  for (const offer of offers) {
    if (!offer.originalPrice || offer.originalPrice <= offer.currentPrice) continue
    const discount = Math.round((1 - offer.currentPrice / offer.originalPrice) * 100)
    if (discount < 10) continue

    const product = offer.listing?.product
    if (!product) continue

    deals.push({
      offerId: offer.id,
      productName: product.name,
      productSlug: product.slug,
      currentPrice: offer.currentPrice,
      originalPrice: offer.originalPrice,
      discount,
      offerScore: offer.offerScore,
      sourceSlug: offer.listing?.source?.name?.toLowerCase().replace(/\s+/g, '-') || 'promosnap',
      productUrl: `https://www.promosnap.com.br/produto/${product.slug}`,
      affiliateUrl: offer.affiliateUrl || `https://www.promosnap.com.br/api/clickout/${offer.id}?page=telegram`,
      sourceName: offer.listing?.source?.name || 'PromoSnap',
      imageUrl: product.imageUrl || offer.listing?.imageUrl || null,
      isFreeShipping: offer.isFreeShipping,
      rating: null,
      reviewsCount: null,
      couponText: null,
      score: offer.offerScore,
    })
  }

  if (deals.length === 0) {
    return { status: 'OK', sent: 0, reason: 'Nenhuma oferta com desconto > 10% encontrada' }
  }

  // Select top 5 deals (best score)
  const topDeals = deals
    .sort((a, b) => b.discount - a.discount)
    .slice(0, 5)

  let sent = 0
  const errors: string[] = []

  // Send header message
  await sendTelegramMessage(`🔥 *Top ${topDeals.length} Ofertas do Dia — PromoSnap*\n\nAs melhores promoções que encontramos hoje:`)

  // Send each deal with a small delay to avoid rate limiting
  for (const deal of topDeals) {
    const msg = formatTelegramMessage(deal)
    const result = await sendTelegramMessage(msg)

    if (result.success) {
      sent++
    } else {
      errors.push(`${deal.productName}: ${result.error}`)
    }

    // Telegram rate limit: max 20 msg/min to groups
    await new Promise(resolve => setTimeout(resolve, 3500))
  }

  log.info('telegram-daily-deals.complete', { sent, total: topDeals.length, errors: errors.length })

  return {
    status: errors.length === 0 ? 'OK' : 'PARTIAL',
    sent,
    total: topDeals.length,
    errors,
  }
}
