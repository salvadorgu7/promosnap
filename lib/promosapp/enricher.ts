// ============================================================================
// PromosApp Enricher — Enrich normalized items via existing marketplace adapters
// ============================================================================

import { adapterRegistry } from '@/lib/adapters/registry'
import { logger } from '@/lib/logger'
import type { PromosAppNormalizedItem } from './types'

const log = logger.child({ module: 'promosapp-enricher' })

// ── Per-adapter rate limits ─────────────────────────────────────────────────
// Different APIs have different rate limits. This configuration controls
// both concurrency (parallel requests) and delay (ms between batches) per adapter.

interface AdapterRateConfig {
  concurrency: number   // Max parallel requests
  delayMs: number       // Delay between batches (0 = no delay)
}

const ADAPTER_RATE_LIMITS: Record<string, AdapterRateConfig> = {
  'amazon-br':     { concurrency: 1, delayMs: 1000 },  // PA-API: 1 req/s
  'mercadolivre':  { concurrency: 5, delayMs: 200 },   // ML API: generous limits
  'shopee':        { concurrency: 2, delayMs: 500 },    // Shopee: moderate
  'shein':         { concurrency: 2, delayMs: 500 },    // Shein: moderate
  'magalu':        { concurrency: 3, delayMs: 300 },    // Magalu: moderate
  'kabum':         { concurrency: 2, delayMs: 500 },    // KaBuM: moderate
  'aliexpress':    { concurrency: 2, delayMs: 500 },    // AliExpress: moderate
}

const DEFAULT_RATE: AdapterRateConfig = { concurrency: 3, delayMs: 0 }

function getRateConfig(slug: string): AdapterRateConfig {
  return ADAPTER_RATE_LIMITS[slug] || DEFAULT_RATE
}

function sleep(ms: number): Promise<void> {
  return ms > 0 ? new Promise(r => setTimeout(r, ms)) : Promise.resolve()
}

/**
 * Enrichment result — original item with additional data from adapter lookup.
 */
export interface EnrichmentResult {
  item: PromosAppNormalizedItem
  enriched: boolean
  adapterData?: {
    title?: string
    imageUrl?: string
    currentPrice?: number
    originalPrice?: number
    rating?: number
    reviewsCount?: number
    salesCount?: number
    sellerName?: string
    sellerRating?: number
    isFreeShipping?: boolean
    availability?: string
    brand?: string
    category?: string
    coupon?: string
  }
  enrichmentError?: string
}

/**
 * Enrich a single item using the corresponding marketplace adapter.
 * Non-destructive: adapter data is returned separately, caller decides what to merge.
 */
async function enrichSingle(item: PromosAppNormalizedItem): Promise<EnrichmentResult> {
  const adapter = adapterRegistry.get(item.sourceSlug)

  if (!adapter) {
    return { item, enriched: false, enrichmentError: `No adapter for ${item.sourceSlug}` }
  }

  if (!adapter.isConfigured()) {
    return { item, enriched: false, enrichmentError: `Adapter ${item.sourceSlug} not configured` }
  }

  // Only try enrichment if we have a real external ID
  if (item.dedupeKey.startsWith('hash:')) {
    return { item, enriched: false, enrichmentError: 'No external ID to look up' }
  }

  try {
    const product = await adapter.getProduct(item.externalId)

    if (!product) {
      return { item, enriched: false, enrichmentError: `Product ${item.externalId} not found via adapter` }
    }

    return {
      item,
      enriched: true,
      adapterData: {
        title: product.title,
        imageUrl: product.imageUrl,
        currentPrice: product.currentPrice,
        originalPrice: product.originalPrice,
        rating: product.rating,
        reviewsCount: product.reviewsCount,
        salesCount: product.salesCount,
        sellerName: product.seller?.name,
        sellerRating: product.seller?.rating,
        isFreeShipping: product.isFreeShipping,
        availability: product.availability,
        brand: product.brand,
        category: product.category,
        coupon: product.coupon,
      },
    }
  } catch (err) {
    log.warn('promosapp.enrich-failed', {
      externalId: item.externalId,
      source: item.sourceSlug,
      error: String(err),
    })
    return { item, enriched: false, enrichmentError: String(err) }
  }
}

/**
 * Merge adapter enrichment data into the normalized item.
 * Adapter data takes precedence where it exists (more reliable than group message parsing).
 */
export function mergeEnrichment(result: EnrichmentResult): PromosAppNormalizedItem {
  if (!result.enriched || !result.adapterData) return result.item

  const data = result.adapterData
  const item = { ...result.item }

  // Adapter title is more reliable than parsed message text
  if (data.title && data.title.length > item.title.length * 0.5) {
    item.title = data.title
  }

  // Adapter price is ground truth
  if (data.currentPrice && data.currentPrice > 0) {
    item.currentPrice = data.currentPrice
  }
  if (data.originalPrice && data.originalPrice > 0) {
    item.originalPrice = data.originalPrice
  }

  // Recalculate discount from enriched prices
  if (item.originalPrice && item.originalPrice > item.currentPrice && item.currentPrice > 0) {
    item.discount = Math.round(((item.originalPrice - item.currentPrice) / item.originalPrice) * 100)
  }

  // Fill missing data
  if (data.imageUrl && !item.imageUrl) item.imageUrl = data.imageUrl
  if (data.isFreeShipping) item.isFreeShipping = true
  if (data.sellerName && !item.sellerName) item.sellerName = data.sellerName
  if (data.coupon && !item.couponCode) item.couponCode = data.coupon

  return item
}

// ── og:image Fallback ─────────────────────────────────────────────────────

/**
 * Fetch og:image meta tag from a product URL as a universal image fallback.
 * Works for any marketplace that sets Open Graph meta tags (most do).
 * Returns null on failure — never throws.
 */
async function fetchOgImage(url: string, timeoutMs = 5000): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PromoSnap/1.0; +https://promosnap.com.br)',
        'Accept': 'text/html',
      },
      redirect: 'follow',
    })

    clearTimeout(timer)

    if (!res.ok) return null

    // Read only the first ~50KB to find og:image (no need to download full page)
    const reader = res.body?.getReader()
    if (!reader) return null

    let html = ''
    const decoder = new TextDecoder()
    const MAX_BYTES = 50_000

    while (html.length < MAX_BYTES) {
      const { done, value } = await reader.read()
      if (done) break
      html += decoder.decode(value, { stream: true })
      // Early exit if we found the closing </head>
      if (html.includes('</head>')) break
    }

    reader.cancel().catch(() => {})

    // Extract og:image — handle both attribute orders
    const match =
      html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/) ||
      html.match(/<meta\s+content="([^"]+)"\s+property="og:image"/) ||
      html.match(/<meta\s+property='og:image'\s+content='([^']+)'/) ||
      html.match(/<meta\s+content='([^']+)'\s+property='og:image'/)

    if (match && match[1] && match[1].startsWith('http')) {
      log.debug('promosapp.og-image-found', { url: url.slice(0, 60), image: match[1].slice(0, 80) })
      return match[1]
    }

    return null
  } catch (err) {
    log.debug('promosapp.og-image-failed', { url: url.slice(0, 60), error: String(err) })
    return null
  }
}

/**
 * Enrich a batch of items using marketplace adapters.
 * Concurrency-limited to avoid overwhelming APIs.
 */
export async function enrichBatch(
  items: PromosAppNormalizedItem[],
  options?: { enabled?: boolean }
): Promise<{
  items: PromosAppNormalizedItem[]
  enriched: number
  failed: number
  skipped: number
}> {
  if (options?.enabled === false) {
    return { items, enriched: 0, failed: 0, skipped: items.length }
  }

  let enrichedCount = 0
  let failedCount = 0
  let skippedCount = 0
  const results: PromosAppNormalizedItem[] = []

  // Group items by adapter for per-adapter rate limiting
  const byAdapter = new Map<string, PromosAppNormalizedItem[]>()
  for (const item of items) {
    const slug = item.sourceSlug
    if (!byAdapter.has(slug)) byAdapter.set(slug, [])
    byAdapter.get(slug)!.push(item)
  }

  // Process each adapter group with its own rate config
  for (const [slug, adapterItems] of byAdapter) {
    const rate = getRateConfig(slug)

    for (let i = 0; i < adapterItems.length; i += rate.concurrency) {
      const batch = adapterItems.slice(i, i + rate.concurrency)
      const enrichResults = await Promise.allSettled(batch.map(enrichSingle))

      for (const result of enrichResults) {
        if (result.status === 'fulfilled') {
          const merged = mergeEnrichment(result.value)
          results.push(merged)
          if (result.value.enriched) enrichedCount++
          else if (result.value.enrichmentError) failedCount++
          else skippedCount++
        } else {
          failedCount++
        }
      }

      // Rate-limit delay between batches for this adapter
      if (i + rate.concurrency < adapterItems.length) {
        await sleep(rate.delayMs)
      }
    }
  }

  // ── Fallback: og:image scraping for items still missing images ──
  let ogImageFetched = 0
  const needsImage = results.filter(item => !item.imageUrl && item.productUrl)

  if (needsImage.length > 0) {
    const OG_CONCURRENCY = 3
    for (let i = 0; i < needsImage.length; i += OG_CONCURRENCY) {
      const batch = needsImage.slice(i, i + OG_CONCURRENCY)
      const ogResults = await Promise.allSettled(
        batch.map(item => fetchOgImage(item.productUrl))
      )
      for (let j = 0; j < ogResults.length; j++) {
        const ogResult = ogResults[j]
        if (ogResult.status === 'fulfilled' && ogResult.value) {
          batch[j].imageUrl = ogResult.value
          ogImageFetched++
        }
      }
      // Small delay between batches to be respectful
      if (i + OG_CONCURRENCY < needsImage.length) await sleep(300)
    }
  }

  log.info('promosapp.enriched-batch', {
    total: items.length,
    enriched: enrichedCount,
    failed: failedCount,
    skipped: skippedCount,
    adapterGroups: byAdapter.size,
    ogImageFetched,
  })

  return { items: results, enriched: enrichedCount, failed: failedCount, skipped: skippedCount }
}
