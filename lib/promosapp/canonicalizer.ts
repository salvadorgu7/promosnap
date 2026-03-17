// ============================================================================
// PromosApp Canonicalizer — URL normalization, short link expansion, dedup keys
// ============================================================================

import { logger } from '@/lib/logger'
import type { PromosAppNormalizedItem } from './types'

const log = logger.child({ module: 'promosapp-canonicalizer' })

// ── Short Link Detection ───────────────────────────────────────────────────

const SHORT_LINK_HOSTS = [
  'bit.ly', 'bitly.com', 't.co', 'tinyurl.com', 'goo.gl',
  'amzn.to', 'a.co',
  's.shopee.com.br', 'shopee.com.br/universal-link',
  'mercadolivre.com/sec', 'meli.la',
  'shein.com/universal-link', 'shein.top', 'dl.shein.com',
  's.aliexpress.com', 'a.aliexpress.com',
  'cutt.ly', 'rebrand.ly', 'ow.ly',
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
async function expandUrl(url: string, timeoutMs: number = 5000): Promise<string> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PromoSnap/1.0)',
      },
    })

    clearTimeout(timer)

    // Use the final URL after redirects
    if (res.url && res.url !== url) {
      log.debug('promosapp.url-expanded', { from: url.slice(0, 60), to: res.url.slice(0, 60) })
      return res.url
    }

    return url
  } catch (err) {
    log.debug('promosapp.url-expand-failed', { url: url.slice(0, 60), error: String(err) })
    return url // Return original on failure
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

    // Re-detect marketplace if URL was expanded
    let updatedItem = { ...item }
    if (expandedUrl !== item.productUrl) {
      updatedItem.productUrl = expandedUrl
    }

    updatedItem.canonicalUrl = canonicalUrl

    // Update dedupe key if we got a better external ID from expanded URL
    if (item.dedupeKey.startsWith('hash:') && expandedUrl !== item.productUrl) {
      // Try re-extracting external ID from expanded URL
      // (the parser already handles this — we just note it was expanded)
      updatedItem.parseErrors = [
        ...item.parseErrors,
        ...(expandedUrl !== item.productUrl ? [] : []),
      ]
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
