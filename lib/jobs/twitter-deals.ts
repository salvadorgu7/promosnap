/**
 * Twitter/X Daily Deals — posts top deals to Twitter automatically.
 *
 * Env: TWITTER_BEARER_TOKEN, TWITTER_API_KEY, TWITTER_API_SECRET,
 *      TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET
 *
 * Uses Twitter API v2 for posting tweets.
 */

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { createHmac, randomBytes } from 'crypto'

const log = logger.child({ job: 'twitter-deals' })
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.promosnap.com.br'

function isTwitterConfigured(): boolean {
  return !!(
    process.env.TWITTER_API_KEY &&
    process.env.TWITTER_API_SECRET &&
    process.env.TWITTER_ACCESS_TOKEN &&
    process.env.TWITTER_ACCESS_SECRET
  )
}

function formatBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`
}

/**
 * Post a tweet using OAuth 1.0a (required for user context).
 */
async function postTweet(text: string): Promise<{ success: boolean; id?: string; error?: string }> {
  const apiKey = process.env.TWITTER_API_KEY!
  const apiSecret = process.env.TWITTER_API_SECRET!
  const accessToken = process.env.TWITTER_ACCESS_TOKEN!
  const accessSecret = process.env.TWITTER_ACCESS_SECRET!

  const url = 'https://api.twitter.com/2/tweets'
  const method = 'POST'
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = randomBytes(16).toString('hex')

  // OAuth 1.0a signature
  const params: Record<string, string> = {
    oauth_consumer_key: apiKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: accessToken,
    oauth_version: '1.0',
  }

  const sortedParams = Object.keys(params).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&')
  const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`
  const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessSecret)}`
  const signature = createHmac('sha1', signingKey).update(baseString).digest('base64')

  const authHeader = `OAuth oauth_consumer_key="${encodeURIComponent(apiKey)}",oauth_nonce="${encodeURIComponent(nonce)}",oauth_signature="${encodeURIComponent(signature)}",oauth_signature_method="HMAC-SHA1",oauth_timestamp="${timestamp}",oauth_token="${encodeURIComponent(accessToken)}",oauth_version="1.0"`

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    })

    if (!res.ok) {
      const body = await res.text()
      return { success: false, error: `Twitter ${res.status}: ${body.slice(0, 200)}` }
    }

    const data = await res.json()
    return { success: true, id: data.data?.id }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function postDailyDeals() {
  if (!isTwitterConfigured()) {
    return { status: 'SKIPPED', reason: 'Twitter API não configurada' }
  }

  // Get top deal of the day
  const topOffer = await prisma.offer.findFirst({
    where: {
      isActive: true,
      currentPrice: { gt: 0 },
      originalPrice: { gt: 0 },
    },
    orderBy: { offerScore: 'desc' },
    include: {
      listing: {
        include: {
          source: { select: { name: true } },
          product: { select: { name: true, slug: true } },
        },
      },
    },
  })

  if (!topOffer || !topOffer.listing?.product) {
    return { status: 'OK', sent: 0, reason: 'Nenhuma oferta encontrada' }
  }

  const product = topOffer.listing.product
  const discount = topOffer.originalPrice
    ? Math.round((1 - topOffer.currentPrice / topOffer.originalPrice) * 100)
    : 0

  const tweet = [
    `🔥 ${product.name.slice(0, 80)}`,
    ``,
    `💰 ${formatBRL(topOffer.currentPrice)}${discount > 0 ? ` (-${discount}%)` : ''}`,
    topOffer.originalPrice ? `De: ${formatBRL(topOffer.originalPrice)}` : null,
    `📦 ${topOffer.listing.source?.name || 'PromoSnap'}`,
    ``,
    `🔗 ${APP_URL}/produto/${product.slug}`,
    ``,
    `#PromoSnap #Oferta #Desconto`,
  ].filter(Boolean).join('\n')

  // Twitter has 280 char limit
  const trimmedTweet = tweet.length > 280 ? tweet.slice(0, 277) + '...' : tweet

  const result = await postTweet(trimmedTweet)

  if (result.success) {
    log.info('twitter-deals.posted', { tweetId: result.id, product: product.name.slice(0, 40) })
  } else {
    log.error('twitter-deals.failed', { error: result.error })
  }

  return {
    status: result.success ? 'OK' : 'FAILED',
    sent: result.success ? 1 : 0,
    tweetId: result.id,
    error: result.error,
  }
}
