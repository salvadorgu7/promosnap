// ============================================================================
// PromosApp Canonicalizer — URL normalization, short link expansion, dedup keys
// ============================================================================

import { logger } from '@/lib/logger'
import { detectMarketplace } from './parser'
import type { PromosAppNormalizedItem } from './types'

const log = logger.child({ module: 'promosapp-canonicalizer' })

// ── Short Link Detection ───────────────────────────────────────────────────

const SHORT_LINK_HOSTS = [
  // Generic shorteners
  'bit.ly', 'bitly.com', 't.co', 'tinyurl.com', 'goo.gl',
  'cutt.ly', 'rebrand.ly', 'ow.ly', 'is.gd', 'v.gd',
  'short.io', 'bl.ink', 'soo.gd', 'clck.ru', 'rb.gy',
  'go.ly', 'ouo.io', 'linktr.ee',
  // Affiliate/promo shorteners common in Brazilian WhatsApp groups
  'tidd.ly', 'magalu.lu', 'app.magalu.com',
  // Amazon
  'amzn.to', 'a.co',
  // Shopee
  's.shopee.com.br', 'shopee.com.br/universal-link',
  // Mercado Livre
  'mercadolivre.com/sec', 'meli.la',
  // Shein
  'shein.com/universal-link', 'shein.top', 'dl.shein.com',
  // AliExpress
  's.aliexpress.com', 'a.aliexpress.com', 's.click.aliexpress.com',
]

function isShortLink(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return SHORT_LINK_HOSTS.some(h => host.endsWith(h))
  } catch {
    return false
  }
}

// ── URL Expansion ──────────────────────────────────────────────────────────

/**
 * Expand a short URL by following redirects.
 * Returns the final URL or the original on failure.
 */
async function expandUrl(url: string, timeoutMs: number = 8000): Promise<string> {
  // Strategy 1: HEAD with redirect follow (fast, works for most shorteners)
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        // Use a real browser UA — some shorteners (amzn.to, s.shopee) block bot UAs
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
      },
    })

    clearTimeout(timer)

    if (res.url && res.url !== url) {
      log.debug('promosapp.url-expanded', { from: url.slice(0, 60), to: res.url.slice(0, 60) })
      return res.url
    }

    return url
  } catch {
    // Strategy 1 failed — try Strategy 2: GET with manual redirect (catches JS redirects in Location header)
  }

  // Strategy 2: GET with redirect: 'manual' to read Location header
  // Some shorteners (especially amzn.to) return 301/302 with Location
  try {
    const controller2 = new AbortController()
    const timer2 = setTimeout(() => controller2.abort(), timeoutMs)

    const res = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: controller2.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      },
    })

    clearTimeout(timer2)

    const location = res.headers.get('location')
    if (location) {
      // Location might be relative — resolve against original URL
      const resolved = location.startsWith('http') ? location : new URL(location, url).toString()
      log.debug('promosapp.url-expanded-manual', { from: url.slice(0, 60), to: resolved.slice(0, 60) })
      return resolved
    }

    // Strategy 3: Check HTML body for meta refresh or JS redirect
    if (res.ok || res.status === 200) {
      const html = await res.text().catch(() => '')
      // Meta refresh: <meta http-equiv="refresh" content="0;url=...">
      const metaRefresh = html.match(/<meta[^>]+http-equiv=["']refresh["'][^>]+content=["']\d+;\s*url=([^"']+)/i)
      if (metaRefresh?.[1]) {
        const refreshUrl = metaRefresh[1].startsWith('http') ? metaRefresh[1] : new URL(metaRefresh[1], url).toString()
        log.debug('promosapp.url-expanded-meta-refresh', { from: url.slice(0, 60), to: refreshUrl.slice(0, 60) })
        return refreshUrl
      }
      // JS redirect: window.location = "..." or window.location.href = "..."
      const jsRedirect = html.match(/window\.location(?:\.href)?\s*=\s*["']([^"']+)["']/i)
      if (jsRedirect?.[1] && jsRedirect[1].startsWith('http')) {
        log.debug('promosapp.url-expanded-js', { from: url.slice(0, 60), to: jsRedirect[1].slice(0, 60) })
        return jsRedirect[1]
      }
    }

    return url
  } catch (err) {
    log.debug('promosapp.url-expand-failed', { url: url.slice(0, 60), error: String(err) })
    return url
  }
}

// ── Tracking Parameter Cleanup ─────────────────────────────────────────────

const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'ref', 'fbclid', 'gclid', 'gad_source', 'gbraid', 'wbraid',
  'mc_cid', 'mc_eid', '_gl', '_ga',
  'spm', 'pvid', 'scm', 'algo_pvid', 'algo_exp_id',
  'ns', 'aff_fcid', 'aff_fsk', 'aff_platform', 'aff_trace_key',
  'sk', 'aff_id',
  'pd_rd_r', 'pd_rd_w', 'pd_rd_wg', 'pf_rd_p', 'pf_rd_r',
  'linkId', 'smid', 'psc', 'camp', 'creative', 'creativeASIN',
  'ascsubtag', 'geniuslink',
])

function cleanTrackingParams(url: URL): URL {
  const cleaned = new URL(url.toString())
  for (const param of [...cleaned.searchParams.keys()]) {
    if (TRACKING_PARAMS.has(param)) {
      cleaned.searchParams.delete(param)
    }
  }
  return cleaned
}

// ── Canonical URL Generation ───────────────────────────────────────────────

function buildCanonicalUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const cleaned = cleanTrackingParams(parsed)

    // Remove hash
    cleaned.hash = ''

    // Normalize protocol
    if (cleaned.protocol === 'http:') {
      cleaned.protocol = 'https:'
    }

    return cleaned.toString()
  } catch {
    return url
  }
}

// ── Main Canonicalization ──────────────────────────────────────────────────

/**
 * Canonicalize a batch of normalized items:
 * 1. Expand short links
 * 2. Clean tracking parameters
 * 3. Update canonical URLs and dedupe keys
 */
export async function canonicalizeItems(
  items: PromosAppNormalizedItem[],
  options?: { timeoutMs?: number }
): Promise<PromosAppNormalizedItem[]> {
  const timeoutMs = options?.timeoutMs ?? 5000
  const results: PromosAppNormalizedItem[] = []

  // Batch expand short links (with concurrency limit)
  const CONCURRENCY = 5
  const needsExpansion = items.filter(item => isShortLink(item.productUrl))
  const expandedUrls = new Map<string, string>()

  for (let i = 0; i < needsExpansion.length; i += CONCURRENCY) {
    const batch = needsExpansion.slice(i, i + CONCURRENCY)
    const expanded = await Promise.allSettled(
      batch.map(async (item) => {
        const expanded = await expandUrl(item.productUrl, timeoutMs)
        return { original: item.productUrl, expanded }
      })
    )

    for (const result of expanded) {
      if (result.status === 'fulfilled') {
        expandedUrls.set(result.value.original, result.value.expanded)
      }
    }
  }

  // Apply canonicalization to all items
  for (const item of items) {
    const expandedUrl = expandedUrls.get(item.productUrl) || item.productUrl
    const canonicalUrl = buildCanonicalUrl(expandedUrl)

    // Re-detect marketplace if URL was expanded and source is unknown
    let updatedItem = { ...item }
    if (expandedUrl !== item.productUrl) {
      updatedItem.productUrl = expandedUrl

      // Re-detect marketplace from expanded URL (e.g., bit.ly → shopee.com.br)
      if (item.sourceSlug === 'unknown') {
        const mp = detectMarketplace(expandedUrl)
        if (mp) {
          updatedItem.sourceSlug = mp.slug
          updatedItem.marketplace = mp.name
          if (mp.externalId) {
            updatedItem.externalId = mp.externalId
            updatedItem.dedupeKey = `${mp.slug}:${mp.externalId}`
          }
          log.info('promosapp.source-redetected', {
            from: 'unknown',
            to: mp.slug,
            url: expandedUrl.slice(0, 80),
          })
        }
      }
    }

    updatedItem.canonicalUrl = canonicalUrl

    // Update dedupe key if we got a better external ID from expanded URL
    if (item.dedupeKey.startsWith('hash:') && expandedUrl !== item.productUrl) {
      const mp = detectMarketplace(expandedUrl)
      if (mp?.externalId) {
        updatedItem.externalId = mp.externalId
        updatedItem.dedupeKey = `${mp.slug}:${mp.externalId}`
      }
    }

    results.push(updatedItem)
  }

  log.info('promosapp.canonicalized', {
    total: items.length,
    expanded: expandedUrls.size,
  })

  return results
}

/**
 * Deduplicate items within a batch by dedupeKey.
 * Keeps the item with the most information (highest data completeness).
 */
export function deduplicateBatch(items: PromosAppNormalizedItem[]): {
  unique: PromosAppNormalizedItem[]
  duplicatesRemoved: number
} {
  const seen = new Map<string, PromosAppNormalizedItem>()

  for (const item of items) {
    const existing = seen.get(item.dedupeKey)
    if (!existing) {
      seen.set(item.dedupeKey, item)
    } else {
      // Keep the one with more data
      const existingScore = dataCompleteness(existing)
      const newScore = dataCompleteness(item)
      if (newScore > existingScore) {
        seen.set(item.dedupeKey, item)
      }
    }
  }

  const unique = Array.from(seen.values())
  const duplicatesRemoved = items.length - unique.length

  if (duplicatesRemoved > 0) {
    log.debug('promosapp.dedup-batch', { before: items.length, after: unique.length, removed: duplicatesRemoved })
  }

  return { unique, duplicatesRemoved }
}

function dataCompleteness(item: PromosAppNormalizedItem): number {
  let score = 0
  if (item.title && item.title.length > 10) score += 2
  if (item.currentPrice > 0) score += 2
  if (item.originalPrice) score += 1
  if (item.imageUrl) score += 1
  if (item.couponCode) score += 1
  if (item.externalId && !item.dedupeKey.startsWith('hash:')) score += 3
  if (item.affiliateUrl) score += 1
  if (item.parseErrors.length === 0) score += 1
  return score
}
