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

  // No adapter at all → skip (og:meta will handle it later)
  if (!adapter) {
    return { item, enriched: false, enrichmentError: `No adapter for ${item.sourceSlug}` }
  }

  // Only try enrichment if we have a real external ID
  if (item.dedupeKey.startsWith('hash:')) {
    return { item, enriched: false, enrichmentError: 'No external ID to look up' }
  }

  // Let the adapter try — even "unconfigured" adapters may have fallback paths
  // (e.g., Shopee public API works without credentials, Amazon affiliate-only
  //  returns a stub that og:meta can complement)
  try {
    const product = await adapter.getProduct(item.externalId)

    if (!product) {
      log.debug('promosapp.enrich-no-result', {
        externalId: item.externalId,
        source: item.sourceSlug,
        configured: adapter.isConfigured(),
      })
      return { item, enriched: false, enrichmentError: `Product ${item.externalId} not found via adapter` }
    }

    // Validate enrichment is useful (has real data, not just a stub)
    const isStubTitle = product.title === `Amazon Product ${item.externalId}`
    const hasUsefulData = (product.imageUrl || (product.currentPrice && product.currentPrice > 0) || !isStubTitle)

    if (!hasUsefulData) {
      log.debug('promosapp.enrich-stub', {
        externalId: item.externalId,
        source: item.sourceSlug,
      })
      // Even stubs provide useful affiliate URLs — return partial enrichment
      // The item still has title/price from WhatsApp message parsing
      if (product.affiliateUrl) {
        return {
          item,
          enriched: false, // Not fully enriched, but affiliate URL is valid
          adapterData: {
            // Only keep the affiliate URL — rest is stub
          },
          enrichmentError: 'Adapter returned stub data (affiliate URL preserved)',
        }
      }
      return { item, enriched: false, enrichmentError: 'Adapter returned stub data' }
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

  // Carry enrichment metrics for scoring
  if (data.rating != null) item.rating = data.rating
  if (data.reviewsCount != null) item.reviewsCount = data.reviewsCount
  if (data.salesCount != null) item.salesCount = data.salesCount

  return item
}

// ── og:meta Scraping (Universal Fallback) ─────────────────────────────────

interface OgMeta {
  title?: string
  image?: string
  price?: string
  siteName?: string
}

/**
 * Extract an Open Graph meta tag value from HTML.
 * Handles both attribute orders: property="X" content="Y" and content="Y" property="X".
 */
function extractOgTag(html: string, property: string): string | null {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match =
    html.match(new RegExp(`<meta\\s+property="${escaped}"\\s+content="([^"]+)"`, 'i')) ||
    html.match(new RegExp(`<meta\\s+content="([^"]+)"\\s+property="${escaped}"`, 'i')) ||
    html.match(new RegExp(`<meta\\s+property='${escaped}'\\s+content='([^']+)'`, 'i')) ||
    html.match(new RegExp(`<meta\\s+content='([^']+)'\\s+property='${escaped}'`, 'i'))
  return match?.[1] || null
}

/**
 * Extract a generic meta tag value (name="X" content="Y").
 */
function extractMetaTag(html: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match =
    html.match(new RegExp(`<meta\\s+name="${escaped}"\\s+content="([^"]+)"`, 'i')) ||
    html.match(new RegExp(`<meta\\s+content="([^"]+)"\\s+name="${escaped}"`, 'i'))
  return match?.[1] || null
}

/**
 * Fetch og:title, og:image, and price from a product URL.
 * This is the universal fallback — works for any marketplace with Open Graph tags.
 * Most marketplaces (Shopee, ML, Amazon, Magalu, etc.) set these correctly.
 * Returns partial data on partial success — never throws.
 */
async function fetchOgMeta(url: string, timeoutMs = 12000): Promise<OgMeta | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    // Use Googlebot-compatible UA for better SSR from SPAs like Shopee
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
      },
      redirect: 'follow',
    })

    clearTimeout(timer)

    if (!res.ok) return null

    // Read only first ~80KB to find meta tags in <head>
    const reader = res.body?.getReader()
    if (!reader) return null

    let html = ''
    const decoder = new TextDecoder()
    const MAX_BYTES = 80_000

    while (html.length < MAX_BYTES) {
      const { done, value } = await reader.read()
      if (done) break
      html += decoder.decode(value, { stream: true })
      if (html.includes('</head>')) break
    }

    reader.cancel().catch(() => {})

    const result: OgMeta = {}

    // Extract og:title (real product name from the marketplace)
    const ogTitle = extractOgTag(html, 'og:title')
    if (ogTitle && ogTitle.length > 3) {
      // Clean common site suffixes: "Product Name | Shopee Brasil", "Product - Amazon.com.br"
      let cleanTitle = ogTitle
        .replace(/\s*[|–—-]\s*(?:Shopee|Amazon|Mercado Livre|Magazine Luiza|Magalu|KaBuM|AliExpress|Shein).*$/i, '')
        .replace(/\s*[|–—-]\s*(?:Compre|Frete|Entrega).*$/i, '')
        .trim()
      if (cleanTitle.length > 3) {
        result.title = cleanTitle
      }
    }

    // Fallback: <title> tag
    if (!result.title) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
      if (titleMatch && titleMatch[1].length > 5) {
        let cleanTitle = titleMatch[1]
          .replace(/\s*[|–—-]\s*(?:Shopee|Amazon|Mercado Livre|Magazine Luiza|Magalu|KaBuM|AliExpress|Shein).*$/i, '')
          .trim()
        if (cleanTitle.length > 5) {
          result.title = cleanTitle
        }
      }
    }

    // Extract og:image
    const ogImage = extractOgTag(html, 'og:image')
    if (ogImage && ogImage.startsWith('http')) {
      result.image = ogImage
    }

    // Extract price from og:price:amount or product:price:amount
    const ogPrice =
      extractOgTag(html, 'og:price:amount') ||
      extractOgTag(html, 'product:price:amount') ||
      extractMetaTag(html, 'product:price:amount') ||
      extractMetaTag(html, 'price')
    if (ogPrice) {
      result.price = ogPrice
    }

    // Extract site name
    const siteName = extractOgTag(html, 'og:site_name')
    if (siteName) {
      result.siteName = siteName
    }

    const hasData = result.title || result.image || result.price
    if (hasData) {
      log.debug('promosapp.og-meta-found', {
        url: url.slice(0, 60),
        title: result.title?.slice(0, 50),
        hasImage: !!result.image,
        price: result.price,
      })
    }

    return hasData ? result : null
  } catch (err) {
    log.debug('promosapp.og-meta-failed', { url: url.slice(0, 60), error: String(err) })
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

  // ── og:meta scraping — fetch real product data from the page ──
  // This is the key step: instead of trusting WhatsApp copy, we follow the link
  // and get the real product title, image, and price from the marketplace page.
  // Applied to ALL items with a productUrl (not just those missing data).
  let ogMetaFetched = 0
  const needsOgMeta = results.filter(item => item.productUrl)

  if (needsOgMeta.length > 0) {
    const OG_CONCURRENCY = 3
    for (let i = 0; i < needsOgMeta.length; i += OG_CONCURRENCY) {
      const batch = needsOgMeta.slice(i, i + OG_CONCURRENCY)
      const ogResults = await Promise.allSettled(
        batch.map(item => fetchOgMeta(item.productUrl))
      )
      for (let j = 0; j < ogResults.length; j++) {
        const ogResult = ogResults[j]
        if (ogResult.status === 'fulfilled' && ogResult.value) {
          const meta = ogResult.value
          ogMetaFetched++

          // og:title from the marketplace is the REAL product name (replaces WhatsApp copy)
          if (meta.title && meta.title.length > 5) {
            batch[j].title = meta.title
          }

          // og:image — fill if missing
          if (meta.image && !batch[j].imageUrl) {
            batch[j].imageUrl = meta.image
          }

          // og:price — use as ground truth if we don't have adapter-confirmed price
          if (meta.price) {
            const ogPrice = parseFloat(meta.price.replace(/\./g, '').replace(',', '.'))
            if (ogPrice > 0 && ogPrice < 100000) {
              // Only override if we don't have an adapter-enriched price
              if (!batch[j].currentPrice || batch[j].currentPrice === 0) {
                batch[j].currentPrice = ogPrice
              }
            }
          }
        }
      }
      // Small delay between batches to be respectful
      if (i + OG_CONCURRENCY < needsOgMeta.length) await sleep(300)
    }
  }

  log.info('promosapp.enriched-batch', {
    total: items.length,
    enriched: enrichedCount,
    failed: failedCount,
    skipped: skippedCount,
    adapterGroups: byAdapter.size,
    ogMetaFetched,
  })

  return { items: results, enriched: enrichedCount, failed: failedCount, skipped: skippedCount }
}
