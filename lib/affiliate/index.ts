/**
 * Unified affiliate URL builder for all supported marketplaces.
 *
 * Reads affiliate tags from env vars:
 *   - ML:      MERCADOLIVRE_AFFILIATE_ID (matt_tool)
 *   - Amazon:  AMAZON_AFFILIATE_TAG (tag)
 *   - Shopee:  SHOPEE_AFFILIATE_ID (af_id)
 *   - Shein:   SHEIN_AFFILIATE_ID (aff_id)
 *   - Magalu:  MAGALU_AFFILIATE_ID (partner_id)
 *   - KaBuM:   KABUM_AFFILIATE_ID (tag)
 */

import { logger } from '@/lib/logger'

type MarketplaceConfig = {
  /** Domains that identify this marketplace */
  domains: string[]
  /** Env var name for the affiliate tag */
  envVar: string
  /** Query param name to inject */
  param: string
  /** Extra params to add (e.g. linkCode for Amazon) */
  extraParams?: Record<string, string>
}

const MARKETPLACES: MarketplaceConfig[] = [
  {
    domains: ['mercadolivre.com.br', 'mercadolibre.com', 'produto.mercadolivre.com.br'],
    envVar: 'MERCADOLIVRE_AFFILIATE_ID',
    param: 'matt_tool',
  },
  {
    domains: ['amazon.com.br'],
    envVar: 'AMAZON_AFFILIATE_TAG',
    param: 'tag',
    extraParams: { linkCode: 'll1' },
  },
  {
    domains: ['shopee.com.br'],
    envVar: 'SHOPEE_AFFILIATE_ID',
    param: 'af_id',
  },
  {
    domains: ['shein.com', 'shein.com.br'],
    envVar: 'SHEIN_AFFILIATE_ID',
    param: 'aff_id',
  },
  {
    domains: ['magazineluiza.com.br', 'magalu.com'],
    envVar: 'MAGALU_AFFILIATE_ID',
    param: 'partner_id',
  },
  {
    domains: ['kabum.com.br'],
    envVar: 'KABUM_AFFILIATE_ID',
    param: 'tag',
  },
]

/**
 * Detect which marketplace a URL belongs to.
 * Returns the config or null if unknown.
 */
function detectMarketplace(url: string): MarketplaceConfig | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    for (const mp of MARKETPLACES) {
      if (mp.domains.some(d => hostname.includes(d))) {
        return mp
      }
    }
  } catch {
    // not a valid URL
  }
  return null
}

/**
 * Build affiliate URL for any supported marketplace.
 * Returns the original URL if no affiliate tag is configured.
 */
export function buildAffiliateUrl(productUrl: string): string {
  if (!productUrl) return productUrl

  const mp = detectMarketplace(productUrl)
  if (!mp) return productUrl

  const tag = process.env[mp.envVar]
  if (!tag) return productUrl

  try {
    const url = new URL(productUrl)
    url.searchParams.set(mp.param, tag)
    if (mp.extraParams) {
      for (const [k, v] of Object.entries(mp.extraParams)) {
        url.searchParams.set(k, v)
      }
    }
    return url.toString()
  } catch (err) {
    logger.debug("affiliate.url-build-failed", { productUrl, error: err })
    // Fallback: append as query string
    const sep = productUrl.includes('?') ? '&' : '?'
    return `${productUrl}${sep}${mp.param}=${tag}`
  }
}

/**
 * Check if a URL already has an affiliate tag for its marketplace.
 */
export function hasAffiliateTag(productUrl: string): boolean {
  const mp = detectMarketplace(productUrl)
  if (!mp) return false

  try {
    const url = new URL(productUrl)
    return url.searchParams.has(mp.param)
  } catch {
    return false
  }
}

/**
 * Strip existing affiliate tags from a URL (useful for deduplication).
 */
export function stripAffiliateTag(productUrl: string): string {
  const mp = detectMarketplace(productUrl)
  if (!mp) return productUrl

  try {
    const url = new URL(productUrl)
    url.searchParams.delete(mp.param)
    if (mp.extraParams) {
      for (const k of Object.keys(mp.extraParams)) {
        url.searchParams.delete(k)
      }
    }
    return url.toString()
  } catch {
    return productUrl
  }
}
