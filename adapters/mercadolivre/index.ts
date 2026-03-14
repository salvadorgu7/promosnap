import { BaseAdapter } from '../shared/base'
import type { RawListing, SearchOptions, FetchOffersParams, HealthCheckResult } from '@/types'

export class MercadoLivreAdapter extends BaseAdapter {
  name = 'Mercado Livre'
  slug = 'mercadolivre'
  isEnabled = true

  private affiliateId = process.env.MERCADOLIVRE_AFFILIATE_ID || ''
  private affiliateWord = process.env.MERCADOLIVRE_AFFILIATE_WORD || ''

  async searchProducts(query: string, options?: SearchOptions): Promise<RawListing[]> {
    this.log(`Searching: "${query}"`, options)
    // TODO: Implement ML public API: GET /sites/MLB/search?q=...
    return []
  }

  async fetchProductById(externalId: string): Promise<RawListing | null> {
    this.log(`Fetching product: ${externalId}`)
    // TODO: Implement ML API: GET /items/{id}
    return null
  }

  async fetchByItemIds(ids: string[]): Promise<RawListing[]> {
    this.log(`Fetching items by IDs: ${ids.length}`)
    const results: RawListing[] = []
    for (const id of ids) {
      const item = await this.fetchProductById(id)
      if (item) results.push(item)
    }
    return results
  }

  async fetchOffers(params?: FetchOffersParams): Promise<RawListing[]> {
    this.log('Fetching offers', params)
    return []
  }

  buildAffiliateUrl(productUrl: string): string {
    if (!this.affiliateId) return productUrl
    // ML affiliate format: matt_tool (numeric ID) + matt_word (username)
    const sep = productUrl.includes('?') ? '&' : '?'
    const params = [`matt_tool=${this.affiliateId}`]
    if (this.affiliateWord) params.push(`matt_word=${this.affiliateWord}`)
    return `${productUrl}${sep}${params.join('&')}`
  }

  async healthCheck(): Promise<HealthCheckResult> {
    return { status: "MOCK", latencyMs: 0, message: "Adapter not yet implemented" }
  }
}
