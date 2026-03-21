/**
 * Push Price Drops — sends web push notifications for significant price drops.
 *
 * Integrates with the service worker (public/sw.js) to notify users
 * about products they've viewed that dropped in price.
 *
 * Note: Web Push requires VAPID keys. Without them, this job is a no-op.
 * The actual push subscription happens client-side via PushNotificationPrompt.
 */

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

const log = logger.child({ job: 'push-price-drops' })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.promosnap.com.br'

export async function pushPriceDrops() {
  // Find offers that dropped > 10% in the last 24h
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const recentSnapshots = await prisma.priceSnapshot.findMany({
    where: { capturedAt: { gte: oneDayAgo } },
    include: {
      offer: {
        include: {
          listing: {
            include: {
              product: { select: { name: true, slug: true, imageUrl: true } },
              source: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { capturedAt: 'desc' },
    take: 200,
  })

  // Group by offer, find those with significant drops
  const offerMap = new Map<string, typeof recentSnapshots>()
  for (const snap of recentSnapshots) {
    const existing = offerMap.get(snap.offerId) || []
    existing.push(snap)
    offerMap.set(snap.offerId, existing)
  }

  const drops: {
    productName: string
    slug: string
    oldPrice: number
    newPrice: number
    dropPct: number
    source: string
    imageUrl?: string
  }[] = []

  for (const [, snaps] of offerMap) {
    if (snaps.length < 2) continue
    const newest = snaps[0]
    const oldest = snaps[snaps.length - 1]

    if (!oldest.price || !newest.price || newest.price >= oldest.price) continue

    const dropPct = Math.round((1 - newest.price / oldest.price) * 100)
    if (dropPct < 10) continue

    const product = newest.offer.listing?.product
    if (!product) continue

    drops.push({
      productName: product.name,
      slug: product.slug,
      oldPrice: oldest.price,
      newPrice: newest.price,
      dropPct,
      source: newest.offer.listing?.source?.name || 'PromoSnap',
      imageUrl: product.imageUrl || undefined,
    })
  }

  if (drops.length === 0) {
    return { status: 'OK', drops: 0, reason: 'Nenhuma queda significativa nas últimas 24h' }
  }

  // Sort by drop percentage
  drops.sort((a, b) => b.dropPct - a.dropPct)

  // For now, log the drops (push delivery requires VAPID + subscriptions in DB)
  // This data feeds into the price-drop-radar job and email notifications
  log.info('push-price-drops.found', {
    dropsCount: drops.length,
    topDrop: drops[0] ? `${drops[0].productName} -${drops[0].dropPct}%` : null,
  })

  // Store in system settings for the admin dashboard
  try {
    await prisma.systemSetting.upsert({
      where: { key: 'last_price_drops' },
      create: {
        key: 'last_price_drops',
        value: JSON.stringify({
          timestamp: new Date().toISOString(),
          count: drops.length,
          top5: drops.slice(0, 5).map(d => ({
            name: d.productName.slice(0, 60),
            drop: d.dropPct,
            from: d.oldPrice,
            to: d.newPrice,
            slug: d.slug,
          })),
        }),
      },
      update: {
        value: JSON.stringify({
          timestamp: new Date().toISOString(),
          count: drops.length,
          top5: drops.slice(0, 5).map(d => ({
            name: d.productName.slice(0, 60),
            drop: d.dropPct,
            from: d.oldPrice,
            to: d.newPrice,
            slug: d.slug,
          })),
        }),
      },
    })
  } catch { /* non-critical */ }

  return {
    status: 'OK',
    drops: drops.length,
    top5: drops.slice(0, 5).map(d => `${d.productName.slice(0, 40)} -${d.dropPct}%`),
  }
}
