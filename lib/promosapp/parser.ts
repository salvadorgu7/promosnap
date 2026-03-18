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
      /meli\.la/i,  // ML official short links (common in WhatsApp groups)
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
      /divulguei\.app/i,  // amzn.divulguei.app affiliate redirect → Amazon
      /promos\.app\.br.*marketplace=amazon/i,  // casa.promos.app.br redirect
    ],
    idExtractor: (url) => {
      // Standard Amazon URLs: /dp/ASIN or /gp/product/ASIN
      const match = url.pathname.match(/\/dp\/([A-Z0-9]{10})/) ||
                    url.pathname.match(/\/gp\/product\/([A-Z0-9]{10})/) ||
                    url.pathname.match(/\/([A-Z0-9]{10})(?:\/|$)/)
      if (match) return match[1]
      // Third-party redirects with ?id=ASIN (casa.promos.app.br, tempromo.app.br)
      const idParam = url.searchParams.get('id')
      if (idParam && /^B[A-Z0-9]{9}$/.test(idParam)) return idParam
      return null
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
      // Shopee URL formats:
      // 1. /username/shopId/itemId  — most common in WhatsApp affiliate links
      // 2. /product/shopId/itemId   — canonical product page
      // 3. -i.shopId.itemId         — old dot-separated format
      // IDs are large numbers (≥5 digits) to avoid false matches
      const match = url.pathname.match(/\/[^\/]+\/(\d{5,})\/(\d{5,})/) ||
                    url.pathname.match(/\/product\/(\d+)\/(\d+)/) ||
                    url.pathname.match(/\.(\d+)\.(\d+)/)
      return match ? `${match[1]}.${match[2]}` : null
    },
  },
  {
    slug: 'shein',
    name: 'Shein',
    patterns: [/shein\.com/i, /sheingsp\.com/i, /shein\.top/i, /dl\.shein\.com/i],
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

/**
 * Non-product paths on marketplace sites — these are NOT product pages
 * and should be rejected to avoid creating bogus entries like "perfil social".
 */
const NON_PRODUCT_PATHS: Record<string, RegExp[]> = {
  mercadolivre: [
    /^\/perfil\b/i,         // Seller profile pages
    /^\/usuario\b/i,        // User profile pages
    /^\/loja\b/i,           // Store/shop pages
    /^\/vendedor\b/i,       // Seller pages
    /^\/busca\b/i,          // Search result pages
    /^\/categorias?\b/i,    // Category pages
    /^\/sugestoes\b/i,      // Suggestions
    /^\/ranking\b/i,        // Rankings
    /^\/conta\b/i,          // Account pages
    /^\/help\b/i,           // Help/support
    /^\/gz\//i,             // ML generic zone pages
    /^\/ofertas\b/i,        // Offers listing (not a product)
    /^\/cupons?\b/i,        // Coupons listing
    /^\/navigation\b/i,     // Navigation pages
  ],
  'amazon-br': [
    /^\/stores\b/i,         // Store pages
    /^\/s\?/i,              // Search pages
    /^\/hz\/wishlist/i,     // Wishlists
    /^\/ap\//i,             // Account pages
  ],
  shopee: [
    /^\/shop\//i,           // Shop pages (not product)
    /^\/search\b/i,         // Search pages
  ],
}

function isNonProductUrl(slug: string, pathname: string): boolean {
  const patterns = NON_PRODUCT_PATHS[slug]
  if (!patterns) return false
  return patterns.some(p => p.test(pathname))
}

export function detectMarketplace(url: string): { slug: string; name: string; externalId: string | null } | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  for (const mp of MARKETPLACE_PATTERNS) {
    if (mp.patterns.some(p => p.test(url))) {
      // Reject non-product URLs (profiles, search, stores, etc.)
      if (isNonProductUrl(mp.slug, parsed.pathname)) {
        log.info('parser.rejected-non-product-url', { url, slug: mp.slug, pathname: parsed.pathname })
        return null
      }
      const externalId = mp.idExtractor ? mp.idExtractor(parsed) : null
      return { slug: mp.slug, name: mp.name, externalId }
    }
  }

  return null
}

// ── Title Cleaning ────────────────────────────────────────────────────────

// Pre-compiled regexes for stripping leading/trailing emojis + whitespace
const LEADING_EMOJI_WS = /^[\s\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{2702}-\u{27B0}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{231A}-\u{23FA}\u{25AA}-\u{25FE}\u{2614}-\u{2653}\u{267F}-\u{26FD}\u{2702}-\u{270F}]+/u
const TRAILING_EMOJI_WS = /[\s\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{2702}-\u{27B0}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{231A}-\u{23FA}\u{25AA}-\u{25FE}\u{2614}-\u{2653}\u{267F}-\u{26FD}\u{2702}-\u{270F}]+$/u
const ALL_EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}\u{2702}-\u{27B0}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{231A}-\u{23FA}\u{25AA}-\u{25FE}\u{2614}-\u{2653}\u{267F}-\u{26FD}\u{2702}-\u{270F}]/gu

/**
 * WhatsApp promo message prefixes — marketing copy before the product name.
 * These appear at the start of WhatsApp group messages, often in *bold*.
 * Ordered from most specific to least to avoid partial matches.
 */
const PROMO_PREFIX_PATTERNS = [
  // Multi-word expressions (must come first)
  /^\*?(?:SUA\s+CHANCE\s+DE\s+PAGAR\s+BARATO)\b[^a-záàâãéèêíïóôõöúç]*/i,
  /^\*?(?:MENOR\s+PRE[ÇC][OÔ]*O*\s+DA\s+SH[OÔ])\b[^a-záàâãéèêíïóôõöúç]*/i,
  /^\*?(?:OFERTA\s+DA\s+SH[OÔ])\b[^a-záàâãéèêíïóôõöúç]*/i,
  /^\*?(?:EU\s+SEI\s+QUE\s+VOC[ÊE]\s+PRECISA)\b[^a-záàâãéèêíïóôõöúç]*/i,
  /^\*?(?:GENTE\s+OLHA\s+ISSO+)\b[^a-záàâãéèêíïóôõöúç]*/i,
  /^\*?(?:PERDE\s+N[ÃA]O+)\b[^a-záàâãéèêíïóôõöúç]*/i,
  /^\*?(?:CAIU\s+DEMAIS+)\b[^a-záàâãéèêíïóôõöúç]*/i,
  /^\*?(?:BAIXOU\s+DEMAIS+)\b[^a-záàâãéèêíïóôõöúç]*/i,
  /^\*?(?:SUA\s+CHANCE)\b[^a-záàâãéèêíïóôõöúç]*/i,
  /^\*?(?:CORRE\s+QUE)\b[^a-záàâãéèêíïóôõöúç]*/i,
  /^\*?(?:[ÚU]LTIMA\s+CHANCE)\b[^a-záàâãéèêíïóôõöúç]*/i,
  /^\*?(?:PAGAR\s+BARATO)\b[^a-záàâãéèêíïóôõöúç]*/i,
  /^\*?(?:BEST\s+SELLER|MAIS\s+VENDIDO|TOP\s+OFERTA)\b[^a-záàâãéèêíïóôõöúç]*/i,
  /^\*?(?:FLASH\s+SALE)\b[^a-záàâãéèêíïóôõöúç]*/i,
  // Single-word expressions
  /^\*?(?:MEGA\s*OFERTA|SUPER\s*OFERTA|OFERTA|PROMO[ÇC][ÃA]O|PROMO)\b[^a-záàâãéèêíïóôõöúç]*/i,
  /^\*?(?:MENOR\s+PRE[ÇC][OÔ]*O*)\b[^a-záàâãéèêíïóôõöúç]*/i,
  /^\*?(?:IMPERD[ÍI]VEL|REL[ÂA]MPAGO)\b[^a-záàâãéèêíïóôõöúç]*/i,
  /^\*?(?:BAIXOU|BAIXO+U+)\b[^a-záàâãéèêíïóôõöúç]*/i,
  /^\*?(?:DA\s+SH[OÔ])\b[^a-záàâãéèêíïóôõöúç]*/i,
  /^\*?(?:DEMAIS+)\b[^a-záàâãéèêíïóôõöúç]*/i,
  // Informal hooks: "Casaco baratinho!", "200ML!", "Preção nesse X!", "Custa o dobro..."
  /^\*?(?:Cada\s+um\s+por)\b[^a-záàâãéèêíïóôõöúç]*/i,
  /^\*?(?:Custa\s+o\s+dobro)\b[^a-záàâãéèêíïóôõöúç]*/i,
  /^\*?(?:Pre[çc][ãa]o\s+nesse?)\b[^a-záàâãéèêíïóôõöúç]*/i,
]

const PROMO_SUFFIX_PATTERNS = [
  /\s*[-–—]\s*(?:Tem\s+Prom[oô]|Promo[çc][ãa]o|PromosApp|Link\s+na\s+Bio).*$/i,
  /\s*(?:Compre\s+aqui|Clique\s+aqui|Aproveite|Garanta\s+(?:j[áa]|o\s+seu)|Corre|Confira)[\s:!]*.*$/i,
  /\s*(?:Use\s+(?:o\s+)?cup[oã]m|Frete\s+gr[áa]tis).*$/i,
  /\s*(?:Promo[çc][ãa]o\s+sujeita).*$/i,
]

/**
 * Clean marketing copy from a raw title, leaving only the product name.
 * Handles WhatsApp-style promo messages with bold markers, emojis, and CTAs.
 *
 * WhatsApp promo message typical structure:
 *   *MARKETING COPY EMOJIS* 🛍 Product Name Here Details
 *   De ~R$ 999,99~
 *   💸 Por *R$ 799,99*
 *   🛒 Compre aqui: https://...
 *
 * The product name is AFTER the 🛍 emoji on the first content line.
 */
function cleanPromoTitle(raw: string): string {
  let title = raw

  // Remove URLs first
  title = title.replace(/https?:\/\/\S+/g, '')

  // Remove WhatsApp bold markers and strikethrough markers
  title = title.replace(/\*/g, '')
  title = title.replace(/~/g, '')

  // Strategy 1: Extract product name after 🛍 emoji (most reliable for WhatsApp promos)
  const shoppingBagMatch = title.match(/🛍\s*(.+?)(?:\s*De\s+[_~]|$)/)
  if (shoppingBagMatch && shoppingBagMatch[1].trim().length > 5) {
    title = shoppingBagMatch[1].trim()
    // Clean remaining emojis and trim
    title = title.replace(ALL_EMOJI, ' ').replace(/\s+/g, ' ').trim()
    // Remove trailing price patterns
    title = title.replace(/\s+(?:De|Por|Apenas)\s*R?\$.*$/i, '')
    title = title.replace(/R\$\s*[\d.,]+/g, '')
    title = title.replace(/\s+/g, ' ').trim()
    title = title.replace(/^[\s\-–—:,;!.•·]+/, '').replace(/[\s\-–—:,;!.•·]+$/, '')
    if (title.length > 5) return title
  }

  // Strategy 2: Multi-line message — find the product name line
  const lines = title.split('\n').map(l => l.trim()).filter(l => l.length > 3)
  if (lines.length > 1) {
    // Skip lines that are: price lines, CTAs, promo copy, warnings
    const productLine = lines.find(l =>
      !(/^(?:De|Por|Apenas|R\$|Compre|Clique|Use|Frete|Cupom|Promoção)/i.test(l)) &&
      !(/^\d{1,3}(?:\.\d{3})*,\d{2}$/.test(l)) &&
      !(/^⚠/.test(l)) &&
      l.length > 10 // Product names are usually >10 chars
    )
    if (productLine) title = productLine
  }

  // Remove leading/trailing emojis
  title = title.replace(LEADING_EMOJI_WS, '')
  title = title.replace(TRAILING_EMOJI_WS, '')

  // Remove promo prefixes (iterate until no more match)
  let changed = true
  while (changed) {
    changed = false
    for (const pattern of PROMO_PREFIX_PATTERNS) {
      const before = title
      title = title.replace(pattern, '').trim()
      if (title !== before) changed = true
    }
    // Also strip leading emojis after each pass
    title = title.replace(LEADING_EMOJI_WS, '')
  }

  // Remove promo suffixes
  for (const pattern of PROMO_SUFFIX_PATTERNS) {
    title = title.replace(pattern, '')
  }

  // Remove inline price mentions
  title = title.replace(/R\$\s*[\d.,]+/g, '')
  title = title.replace(/\b\d{1,3}(?:\.\d{3})*,\d{2}\b/g, '')
  title = title.replace(/\bDe\s+_?\s*$/i, '')
  title = title.replace(/\bPor\s*$/i, '')

  // Remove residual marketing fragments that may remain
  title = title.replace(/^(?:e\s+bem\s+avaliado|baratinho)\s*/i, '')

  // Clean up whitespace and leading/trailing punctuation
  title = title.replace(/\s+/g, ' ').trim()
  title = title.replace(/^[\s\-–—:,;!.•·]+/, '').replace(/[\s\-–—:,;!.•·]+$/, '')

  // If title is too short or empty, it means the raw was just marketing copy — try harder
  if (title.length < 5) {
    // Last resort: use the raw but strip all known junk
    title = raw.replace(/https?:\/\/\S+/g, '').replace(/\*/g, '').replace(/~/g, '')
    title = title.replace(ALL_EMOJI, ' ').replace(/\s+/g, ' ').trim()
    title = title.replace(/R\$\s*[\d.,]+/g, '').replace(/\s+/g, ' ').trim()
  }

  return title.slice(0, 200) || raw.replace(/https?:\/\/\S+/g, '').replace(/\*/g, '').trim().slice(0, 200)
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

  // 4. Build title (clean marketing copy from WhatsApp messages)
  // IMPORTANT: always prefer the full rawText (multi-line body) over rawTitle.
  // rawTitle is typically only the first line of the message (the hype headline
  // like "GENTE OLHA ISSOO 🥵") — cleanPromoTitle's Strategy 1/2 require the
  // full message so they can find the 🛍 emoji line or the first non-price line.
  const title = cleanPromoTitle(event.rawText || event.rawTitle || text.slice(0, 500))

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

  // Use WhatsApp image URL if provided (only real https:// URLs — base64 thumbnails are skipped)
  const imageUrl = event.rawImageUrl && event.rawImageUrl.startsWith('https://') ? event.rawImageUrl : undefined

  return {
    externalId,
    title: title || `Produto ${bestMatch.slug}`,
    currentPrice,
    originalPrice,
    productUrl: canonicalUrl,
    affiliateUrl: event.affiliateUrlConverted || undefined,
    imageUrl,
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
