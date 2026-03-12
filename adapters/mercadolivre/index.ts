import { BaseAdapter } from '../shared/base'
import type { RawListing, SearchOptions, FetchOffersParams } from '@/types'

export class MercadoLivreAdapter extends BaseAdapter {
  name = 'Mercado Livre'
  slug = 'mercadolivre'
  isEnabled = true

  private affiliateId = process.env.MERCADOLIVRE_AFFILIATE_ID || ''

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
    // ML affiliate links only valid for product detail pages (PDP)
    return `https://www.mercadolivre.com.br/affiliate-redirect?url=${encodeURIComponent(productUrl)}&aff_id=${this.affiliateId}`
  }
}
