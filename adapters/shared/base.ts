import type { MarketplaceAdapter, RawListing, SearchOptions, FetchOffersParams } from '@/types'

export abstract class BaseAdapter implements MarketplaceAdapter {
  abstract name: string
  abstract slug: string
  abstract isEnabled: boolean
  abstract searchProducts(query: string, options?: SearchOptions): Promise<RawListing[]>
  abstract fetchProductById(externalId: string): Promise<RawListing | null>
  abstract fetchOffers(params?: FetchOffersParams): Promise<RawListing[]>
  abstract buildAffiliateUrl(productUrl: string, metadata?: Record<string, string>): string

  validateListing(listing: RawListing): boolean {
    if (!listing.externalId || !listing.title || listing.title.length < 3) return false
    if (!listing.productUrl || !listing.currentPrice || listing.currentPrice <= 0) return false
    return true
  }

  protected normalizePrice(value: string | number | undefined): number {
    if (typeof value === 'number') return value
    if (!value) return 0
    return parseFloat(value.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')) || 0
  }

  protected log(msg: string, data?: unknown) { console.log(`[Adapter:${this.slug}] ${msg}`, data ?? '') }
  protected warn(msg: string, data?: unknown) { console.warn(`[Adapter:${this.slug}] ${msg}`, data ?? '') }
}
