// ============================================================================
// PromosApp Parser — Extract structured data from raw promo messages
// ============================================================================

import { createHash } from 'crypto'
import { logger } from '@/lib/logger'
import type { PromosAppRawEvent, PromosAppNormalizedItem } from './types'

const log = logger.child({ module: 'promosapp-parser' })

// ── Marketplace Detection ──────────────────────────────────────────────────

interface MarketplacePattern {
  slug: string
  name: string
  patterns: RegExp[]
  idExtractor?: (url: URL) => string | null
}

const MARKETPLACE_PATTERNS: MarketplacePattern[] = [
  {
    slug: 'mercadolivre',
    name: 'Mercado Livre',
    patterns: [
      /mercadolivre\.com\.br/i,
      /mercadolibre\.com/i,
      /produto\.mercadolivre/i,
    ],
    idExtractor: (url) => {
      const match = url.pathname.match(/MLB-?(\d+)/) || url.href.match(/MLB-?(\d+)/)
      return match ? `MLB${match[1]}` : null
    },
  },
  {
    slug: 'amazon-br',
    name: 'Amazon Brasil',
    patterns: [
      /amazon\.com\.br/i,
      /amzn\.to/i,
      /a\.co/i,
    ],
    idExtractor: (url) => {
      const match = url.pathname.match(/\/dp\/([A-Z0-9]{10})/) ||
                    url.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/) ||
                    url.pathname.match(/\/([A-Z0-9]{10})(?:\/|$)/)
      return match ? match[1] : null
    },
  },
  {
    slug: 'shopee',
    name: 'Shopee',
    patterns: [
      /shopee\.com\.br/i,
      /s\.shopee/i,
    ],
    idExtractor: (url) => {
      // Shopee URLs: /product/shopId/itemId or -i.shopId.itemId
      const match = url.pathname.match(/\.(\d+)\.(\d+)/) ||
                    url.pathname.match(/\/product\/(\d+)\/(\d+)/)
      return match ? `${match[1]}.${match[2]}` : null
    },
  },
  {
    slug: 'shein',
    name: 'Shein',
    patterns: [/shein\.com/i, /sheingsp\.com/i],
    idExtractor: (url) => {
      const match = url.pathname.match(/-p-(\d+)/)
      return match ? match[1] : null
    },
  },
  {
    slug: 'magalu',
    name: 'Magazine Luiza',
    patterns: [
      /magazineluiza\.com\.br/i,
      /magalu\.com\.br/i,
    ],
    idExtractor: (url) => {
      const match = url.pathname.match(/\/([a-z0-9]+)\/p\/([a-z0-9]+)/i)
      return match ? match[2] : null
    },
  },
  {
    slug: 'kabum',
    name: 'KaBuM!',
    patterns: [/kabum\.com\.br/i],
    idExtractor: (url) => {
      const match = url.pathname.match(/\/produto\/(\d+)/)
      return match ? match[1] : null
    },
  },
  {
    slug: 'aliexpress',
    name: 'AliExpress',
    patterns: [/aliexpress\.com/i, /s\.click\.aliexpress/i],
    idExtractor: (url) => {
      const match = url.pathname.match(/\/item\/(\d+)/) || url.pathname.match(/\/(\d+)\.html/)
      return match ? match[1] : null
    },
  },
]

// ── Price Extraction ───────────────────────────────────────────────────────

const PRICE_PATTERNS = [
  /R\$\s*([\d.,]+)/g,
  /(?:por|de)\s*R?\$?\s*([\d.,]+)/gi,
  /(\d{1,3}(?:\.\d{3})*,\d{2})/g,
]

function parsePrice(raw: string): number {
  // R$ 1.299,00 → 1299.00
  const cleaned = raw
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

function extractPrices(text: string): { current: number; original?: number } {
  const prices: number[] = []

  for (const pattern of PRICE_PATTERNS) {
    pattern.lastIndex = 0
    let match
    while ((match = pattern.exec(text)) !== null) {
      const p = parsePrice(match[1])
      if (p > 0 && p < 100000) prices.push(p) // Sanity: reject > R$100k
    }
  }

  // Deduplicate
  const unique = [...new Set(prices)].sort((a, b) => a - b)

  if (unique.length === 0) return { current: 0 }
  if (unique.length === 1) return { current: unique[0] }

  // Smallest = current, largest = original (typical promo message pattern: "de X por Y")
  return { current: unique[0], original: unique[unique.length - 1] }
}

// ── URL Extraction ─────────────────────────────────────────────────────────

const URL_PATTERN = /https?:\/\/[^\s<>"')\]]+/gi

function extractUrls(text: string): string[] {
  const matches = text.match(URL_PATTERN) || []
  // Clean trailing punctuation
  return matches.map(u => u.replace(/[.,;:!?)]+$/, '')).filter(Boolean)
}

// ── Coupon Extraction ──────────────────────────────────────────────────────

const COUPON_PATTERNS = [
  /(?:cup[oã][mn]|c[oó]digo|code|voucher)[\s:]*([A-Z0-9_-]{3,30})/gi,
  /use\s+(?:o\s+)?(?:cup[oã][mn]\s+)?([A-Z0-9_-]{3,30})/gi,
  /\b([A-Z]{2,}[0-9]{2,}[A-Z0-9]*)\b/g, // Generic: PROMO20, DESCONTO15
]

function extractCoupon(text: string): string | undefined {
  for (const pattern of COUPON_PATTERNS) {
    pattern.lastIndex = 0
    const match = pattern.exec(text)
    if (match) {
      const code = match[1].trim().toUpperCase()
      // Filter noise: too short, too long, common words
      if (code.length >= 3 && code.length <= 30 && !isCommonWord(code)) {
        return code
      }
    }
  }
  return undefined
}

const COMMON_WORDS = new Set([
  'COM', 'SEM', 'POR', 'PARA', 'GRATIS', 'FREE', 'OFF',
  'THE', 'AND', 'QUE', 'NAO', 'SIM', 'BRL', 'USD',
])

function isCommonWord(s: string): boolean {
  return COMMON_WORDS.has(s)
}

// ── Discount Extraction ────────────────────────────────────────────────────

function extractDiscount(text: string, current: number, original?: number): number {
  // From explicit text
  const match = text.match(/(\d{1,2})%\s*(?:off|desc|de\s+desconto)/i)
  if (match) return parseInt(match[1], 10)

  // From prices
  if (original && original > current && current > 0) {
    return Math.round(((original - current) / original) * 100)
  }

  return 0
}

// ── Free Shipping Detection ────────────────────────────────────────────────

function detectFreeShipping(text: string): boolean {
  return /frete\s+gr[aá]tis|envio\s+gr[aá]tis|free\s+shipping|entrega\s+gr[aá]tis/i.test(text)
}

// ── Message Hash ───────────────────────────────────────────────────────────

export function computeMessageHash(text: string): string {
  const normalized = text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim()
  return createHash('sha256').update(normalized).digest('hex').slice(0, 32)
}

// ── Marketplace Detection ──────────────────────────────────────────────────

function detectMarketplace(url: string): { slug: string; name: string; externalId: string | null } | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  for (const mp of MARKETPLACE_PATTERNS) {
    if (mp.patterns.some(p => p.test(url))) {
      const externalId = mp.idExtractor ? mp.idExtractor(parsed) : null
      return { slug: mp.slug, name: mp.name, externalId }
    }
  }

  return null
}

// ── Main Parser ────────────────────────────────────────────────────────────

/**
 * Parse a single raw PromosApp event into a normalized item.
 * Never throws — returns errors in the parseErrors array.
 */
export function parseRawEvent(event: PromosAppRawEvent): PromosAppNormalizedItem | null {
  const errors: string[] = []
  const text = [event.rawText, event.rawTitle].filter(Boolean).join(' ')

  if (!text.trim() && !event.rawUrl) {
    return null // Nothing to parse
  }

  // 1. Extract URLs
  const urls = [
    ...(event.rawUrl ? [event.rawUrl] : []),
    ...(event.affiliateUrlConverted ? [event.affiliateUrlConverted] : []),
    ...extractUrls(text),
  ].filter(Boolean)

  if (urls.length === 0) {
    errors.push('No URL found in event')
    return null
  }

  // 2. Find best marketplace URL
  let bestMatch: { url: string; slug: string; name: string; externalId: string | null } | null = null

  for (const url of urls) {
    const mp = detectMarketplace(url)
    if (mp) {
      bestMatch = { url, ...mp }
      break
    }
  }

  // Fallback: use PromosApp's marketplace guess
  if (!bestMatch && event.marketplaceGuess) {
    const guessMp = MARKETPLACE_PATTERNS.find(p =>
      p.slug === event.marketplaceGuess ||
      p.name.toLowerCase().includes(event.marketplaceGuess!.toLowerCase())
    )
    if (guessMp) {
      bestMatch = { url: urls[0], slug: guessMp.slug, name: guessMp.name, externalId: null }
    }
  }

  // Still no match — use generic
  if (!bestMatch) {
    bestMatch = { url: urls[0], slug: 'unknown', name: 'Desconhecido', externalId: null }
    errors.push(`Could not detect marketplace from URL: ${urls[0]}`)
  }

  // 3. Extract prices
  const priceFromField = event.rawPrice ? parsePrice(event.rawPrice) : 0
  const origFromField = event.rawOriginalPrice ? parsePrice(event.rawOriginalPrice) : undefined
  const pricesFromText = extractPrices(text)

  const currentPrice = priceFromField || pricesFromText.current
  const originalPrice = origFromField || pricesFromText.original

  // 4. Build title
  const title = (event.rawTitle || text.slice(0, 200)).replace(/https?:\/\/\S+/g, '').trim()

  if (!title) {
    errors.push('Could not extract title')
  }

  // 5. Generate IDs
  const externalId = bestMatch.externalId || computeMessageHash(bestMatch.url)
  const dedupeKey = bestMatch.externalId
    ? `${bestMatch.slug}:${bestMatch.externalId}`
    : `hash:${computeMessageHash(bestMatch.url)}`

  // 6. Clean URL for canonical form
  let canonicalUrl = bestMatch.url
  try {
    const u = new URL(bestMatch.url)
    // Remove tracking params
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'ref', 'fbclid', 'gclid', 'gad_source', 'mc_cid', 'mc_eid', '_gl', 'spm', 'pvid']
    trackingParams.forEach(p => u.searchParams.delete(p))
    canonicalUrl = u.toString()
  } catch { /* keep original */ }

  // 7. Extract extras
  const couponCode = event.rawCoupon || extractCoupon(text)
  const discount = extractDiscount(text, currentPrice, originalPrice)
  const isFreeShipping = detectFreeShipping(text)

  // 8. Message hash
  const messageHash = event.messageHash || computeMessageHash(text)

  return {
    externalId,
    title: title || `Produto ${bestMatch.slug}`,
    currentPrice,
    originalPrice,
    productUrl: canonicalUrl,
    affiliateUrl: event.affiliateUrlConverted || undefined,
    sourceSlug: bestMatch.slug,
    marketplace: bestMatch.name,
    canonicalUrl,
    dedupeKey,
    couponCode,
    discount,
    isFreeShipping,
    rawEvent: { ...event, messageHash },
    parseErrors: errors,
  }
}

/**
 * Parse a batch of raw events. Filters nulls (unparseable events).
 */
export function parseRawEvents(events: PromosAppRawEvent[]): {
  items: PromosAppNormalizedItem[]
  unparseable: number
} {
  const items: PromosAppNormalizedItem[] = []
  let unparseable = 0

  for (const event of events) {
    try {
      const item = parseRawEvent(event)
      if (item) {
        items.push(item)
      } else {
        unparseable++
      }
    } catch (err) {
      log.warn('promosapp.parse-error', { error: String(err) })
      unparseable++
    }
  }

  log.info('promosapp.parsed', { total: events.length, parsed: items.length, unparseable })
  return { items, unparseable }
}
