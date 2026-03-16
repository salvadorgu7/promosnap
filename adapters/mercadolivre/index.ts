import { BaseAdapter } from '../shared/base'
import type { RawListing, SearchOptions, FetchOffersParams, HealthCheckResult } from '@/types'
import { logger } from '@/lib/logger'

/**
 * Mercado Livre adapter — stub.
 * Real imports use the admin ingest pipeline (seed, ML search, WhatsApp, Cola JSON).
 * Direct ML API calls happen in app/api/admin/ml/* routes with OAuth tokens.
 */
export class MercadoLivreAdapter extends BaseAdapter {
  name = 'Mercado Livre'
  slug = 'mercadolivre'
  isEnabled = false

  private affiliateId = process.env.MERCADOLIVRE_AFFILIATE_ID || ''
  private affiliateWord = process.env.MERCADOLIVRE_AFFILIATE_WORD || ''

  async searchProducts(query: string, _options?: SearchOptions): Promise<RawListing[]> {
    logger.debug("ml-adapter.search-not-implemented", { query })
    return []
  }

  async fetchProductById(externalId: string): Promise<RawListing | null> {
    logger.debug("ml-adapter.fetch-not-implemented", { externalId })
    return null
  }

  async fetchByItemIds(ids: string[]): Promise<RawListing[]> {
    const results: RawListing[] = []
    for (const id of ids) {
      const item = await this.fetchProductById(id)
      if (item) results.push(item)
    }
    return results
  }

  async fetchOffers(_params?: FetchOffersParams): Promise<RawListing[]> {
    return []
  }

  buildAffiliateUrl(productUrl: string): string {
    if (!this.affiliateId) return productUrl
    const sep = productUrl.includes('?') ? '&' : '?'
    const params = [`matt_tool=${this.affiliateId}`]
    if (this.affiliateWord) params.push(`matt_word=${this.affiliateWord}`)
    return `${productUrl}${sep}${params.join('&')}`
  }

  async healthCheck(): Promise<HealthCheckResult> {
    return { status: "BLOCKED", latencyMs: 0, message: "Use admin ingest pipeline instead" }
  }
}
