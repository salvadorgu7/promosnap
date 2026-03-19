/**
 * SerpApi Google Shopping Connector
 *
 * Searches Google Shopping BR via SerpApi and returns structured product results.
 * Covers ALL major Brazilian stores: Amazon, ML, Shopee, Magalu, KaBuM, etc.
 *
 * Env: SERPAPI_KEY
 * Docs: https://serpapi.com/google-shopping-api
 */

import { logger } from '@/lib/logger'
import type { ExternalCandidate, SourceConnector } from '../candidate-resolver'

const log = logger.child({ module: 'serpapi-shopping' })

const SERPAPI_KEY = process.env.SERPAPI_KEY

/**
 * Google Shopping connector via SerpApi.
 */
export const serpApiShoppingConnector: SourceConnector = {
  name: 'Google Shopping',
  slug: 'google-shopping',

  isReady(): boolean {
    return !!SERPAPI_KEY
  },

  async search(query: string, options?: { maxPrice?: number; limit?: number }): Promise<ExternalCandidate[]> {
    if (!SERPAPI_KEY) return []

    const limit = options?.limit || 10

    try {
      const params = new URLSearchParams({
        engine: 'google_shopping',
        q: query,
        location: 'Brazil',
        gl: 'br',
        hl: 'pt',
        api_key: SERPAPI_KEY,
        num: String(Math.min(limit * 2, 20)), // Fetch extra to filter
      })

      // Add price filter if specified
      if (options?.maxPrice) {
        params.set('tbs', `mr:1,price:1,ppr_max:${options.maxPrice}`)
      }

      const res = await fetch(`https://serpapi.com/search.json?${params}`, {
        signal: AbortSignal.timeout(10000), // 10s timeout
      })

      if (!res.ok) {
        log.error('serpapi.search.failed', { status: res.status, query })
        return []
      }

      const data = await res.json()
      const results = data.shopping_results || data.immersive_products || []

      log.info('serpapi.search.ok', {
        query,
        resultsCount: results.length,
        searchId: data.search_metadata?.id,
      })

      return results
        .slice(0, limit)
        .map((item: any) => mapToCandidate(item))
        .filter((c: ExternalCandidate | null): c is ExternalCandidate => c !== null)
    } catch (err) {
      log.error('serpapi.search.error', { query, error: err })
      return []
    }
  },
}

/**
 * Map a SerpApi shopping result to our ExternalCandidate format.
 */
function mapToCandidate(item: any): ExternalCandidate | null {
  const title = item.title
  if (!title || title.length < 3) return null

  // Extract price — SerpApi returns extracted_price as number or price as string
  let price: number | undefined
  if (item.extracted_price && item.extracted_price > 0) {
    price = item.extracted_price
  } else if (item.price) {
    // Parse "R$ 1.299,00" format
    const cleaned = String(item.price).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
    const parsed = parseFloat(cleaned)
    if (!isNaN(parsed) && parsed > 0) price = parsed
  }

  // Extract old/original price
  let originalPrice: number | undefined
  if (item.old_price) {
    if (typeof item.old_price === 'number') {
      originalPrice = item.old_price
    } else {
      const cleaned = String(item.old_price).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
      const parsed = parseFloat(cleaned)
      if (!isNaN(parsed) && parsed > 0) originalPrice = parsed
    }
  }

  // Extract URL — prefer product_link, fallback to link
  const url = item.product_link || item.link || item.serpapi_product_api
  if (!url) return null

  // Extract source/merchant
  const sourceDomain = extractDomain(url) || item.source || 'unknown'
  const merchant = item.source || item.seller || extractStoreName(sourceDomain)

  return {
    rawTitle: title,
    externalUrl: url,
    price,
    originalPrice,
    imageUrl: item.thumbnail || item.image,
    sourceDomain,
    merchant,
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return 'unknown'
  }
}

function extractStoreName(domain: string): string {
  const STORE_NAMES: Record<string, string> = {
    'amazon.com.br': 'Amazon Brasil',
    'mercadolivre.com.br': 'Mercado Livre',
    'shopee.com.br': 'Shopee',
    'magazineluiza.com.br': 'Magazine Luiza',
    'magalu.com': 'Magalu',
    'kabum.com.br': 'KaBuM!',
    'casasbahia.com.br': 'Casas Bahia',
    'americanas.com.br': 'Americanas',
    'carrefour.com.br': 'Carrefour',
    'extra.com.br': 'Extra',
    'ponto.com.br': 'Ponto',
    'shein.com': 'Shein',
  }

  for (const [d, name] of Object.entries(STORE_NAMES)) {
    if (domain.includes(d)) return name
  }
  return domain
}
