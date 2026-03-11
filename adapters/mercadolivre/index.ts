import { BaseAdapter } from '../shared/base'
import type { RawListing, SearchOptions, FetchOffersParams } from '@/types'
import { getMLToken } from '@/lib/ml-auth'

interface MLItem {
  id: string
  title: string
  price: number
  original_price: number | null
  permalink: string
  thumbnail: string
  sold_quantity: number
  available_quantity: number
  shipping: { free_shipping: boolean }
  installments?: { quantity: number; amount: number }
  category_id?: string
  seller?: { id: number; nickname: string }
  attributes?: Array<{ id: string; name: string; value_name: string | null }>
}

interface MLSearchResponse {
  results: MLItem[]
  paging: { total: number; offset: number; limit: number }
}

const ML_API = 'https://api.mercadolibre.com'

export class MercadoLivreAdapter extends BaseAdapter {
  name = 'Mercado Livre'
  slug = 'mercadolivre'
  isEnabled = true

  private affiliateId = process.env.MERCADOLIVRE_AFFILIATE_ID || ''

  async searchProducts(query: string, options?: SearchOptions): Promise<RawListing[]> {
    this.log(`Searching: "${query}"`, options)

    const params = new URLSearchParams({
      q: query,
      limit: String(options?.limit ?? 20),
      offset: String(((options?.page ?? 1) - 1) * (options?.limit ?? 20)),
      ...(options?.minPrice ? { price_min: String(options.minPrice) } : {}),
      ...(options?.maxPrice ? { price_max: String(options.maxPrice) } : {}),
      ...(options?.sortBy === 'price_asc' ? { sort: 'price_asc' } : {}),
      ...(options?.sortBy === 'price_desc' ? { sort: 'price_desc' } : {}),
    })

    const token = await getMLToken()
    const res = await fetch(`${ML_API}/sites/MLB/search?${params}`, {
      headers: {
        'User-Agent': 'PromoSnap/1.0',
        Authorization: `Bearer ${token}`,
      },
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      this.warn(`API error: ${res.status} ${res.statusText}`)
      return []
    }

    const data: MLSearchResponse = await res.json()
    return data.results.map((item) => this.mapItem(item))
  }

  async fetchProductById(externalId: string): Promise<RawListing | null> {
    this.log(`Fetching product: ${externalId}`)

    const res = await fetch(`${ML_API}/items/${externalId}`, {
      headers: { 'User-Agent': 'PromoSnap/1.0' },
      next: { revalidate: 600 },
    })

    if (!res.ok) {
      this.warn(`Item not found: ${externalId}`)
      return null
    }

    const item: MLItem = await res.json()
    return this.mapItem(item)
  }

  async fetchOffers(params?: FetchOffersParams): Promise<RawListing[]> {
    return this.searchProducts(params?.categorySlug ?? 'ofertas', {
      limit: params?.limit ?? 20,
    })
  }

  buildAffiliateUrl(productUrl: string): string {
    if (!this.affiliateId) return productUrl
    return `${productUrl}?matt_tool=${this.affiliateId}`
  }

  private mapItem(item: MLItem): RawListing {
    const brand = item.attributes?.find((a) => a.id === 'BRAND')?.value_name ?? undefined

    return {
      externalId: item.id,
      sourceSlug: this.slug,
      title: item.title,
      brand,
      imageUrl: item.thumbnail?.replace(/\-I\.jpg$/, '-O.jpg'),
      productUrl: item.permalink,
      currentPrice: item.price,
      originalPrice: item.original_price ?? undefined,
      currency: 'BRL',
      availability: item.available_quantity > 0 ? 'in_stock' : 'out_of_stock',
      salesCount: item.sold_quantity,
      isFreeShipping: item.shipping?.free_shipping ?? false,
      installment: item.installments
        ? `${item.installments.quantity}x R$${item.installments.amount.toFixed(2)}`
        : undefined,
      rawPayload: item as unknown as Record<string, unknown>,
    }
  }
}
