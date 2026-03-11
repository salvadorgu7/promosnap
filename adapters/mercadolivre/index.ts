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

const PUBLIC_HEADERS = {
  'User-Agent': 'PromoSnap/1.0',
  Accept: 'application/json',
}

// Categorias padrão para ingestão — sobrescrevível via MERCADOLIVRE_CATEGORIES (CSV de IDs)
const DEFAULT_CATEGORIES = [
  'MLB1051',  // Celulares e Telefones
  'MLB1000',  // Eletrônicos, Áudio e Vídeo
  'MLB1648',  // Informática
  'MLB5726',  // Eletrodomésticos
  'MLB1276',  // Esportes e Fitness
]

export class MercadoLivreAdapter extends BaseAdapter {
  name = 'Mercado Livre'
  slug = 'mercadolivre'
  isEnabled = true

  private affiliateId = process.env.MERCADOLIVRE_AFFILIATE_ID || ''

  // ─── busca pública por texto ──────────────────────────────────────────────

  async searchProducts(query: string, options?: SearchOptions): Promise<RawListing[]> {
    this.log(`searchProducts: "${query}"`)

    const params = new URLSearchParams({
      q: query,
      limit: String(options?.limit ?? 20),
      offset: String(((options?.page ?? 1) - 1) * (options?.limit ?? 20)),
      ...(options?.minPrice ? { price_min: String(options.minPrice) } : {}),
      ...(options?.maxPrice ? { price_max: String(options.maxPrice) } : {}),
      ...(options?.sortBy === 'price_asc' ? { sort: 'price_asc' } : {}),
      ...(options?.sortBy === 'price_desc' ? { sort: 'price_desc' } : {}),
    })

    const data = await this.publicGet<MLSearchResponse>(
      `${ML_API}/sites/MLB/search?${params}`,
    ).catch(() => null)

    if (!data) return []
    return data.results.map((item) => this.mapItem(item))
  }

  // ─── busca pública por categoria ML ──────────────────────────────────────

  async searchByCategory(categoryId: string, options?: SearchOptions): Promise<RawListing[]> {
    this.log(`searchByCategory: ${categoryId}`)

    const params = new URLSearchParams({
      category: categoryId,
      limit: String(options?.limit ?? 20),
      offset: String(((options?.page ?? 1) - 1) * (options?.limit ?? 20)),
      ...(options?.sortBy === 'price_asc' ? { sort: 'price_asc' } : {}),
      ...(options?.sortBy === 'price_desc' ? { sort: 'price_desc' } : {}),
    })

    const data = await this.publicGet<MLSearchResponse>(
      `${ML_API}/sites/MLB/search?${params}`,
    ).catch(() => null)

    if (!data) return []
    return data.results.map((item) => this.mapItem(item))
  }

  // ─── fetchOffers — itera sobre categorias configuradas ───────────────────

  async fetchOffers(params?: FetchOffersParams): Promise<RawListing[]> {
    const limitPerCategory = Math.ceil((params?.limit ?? 20) / DEFAULT_CATEGORIES.length)

    const configured = process.env.MERCADOLIVRE_CATEGORIES
      ? process.env.MERCADOLIVRE_CATEGORIES.split(',').map((c) => c.trim())
      : DEFAULT_CATEGORIES

    const categoryId = params?.categorySlug ?? configured[0]

    // se vier uma categoria específica, busca só ela
    if (params?.categorySlug) {
      return this.searchByCategory(categoryId, { limit: params.limit ?? 20 })
    }

    // senão, distribui entre as categorias configuradas
    const results = await Promise.all(
      configured.map((cat) => this.searchByCategory(cat, { limit: limitPerCategory })),
    )

    return results.flat()
  }

  // ─── fetchProductById ─────────────────────────────────────────────────────

  async fetchProductById(externalId: string): Promise<RawListing | null> {
    this.log(`fetchProductById: ${externalId}`)
    const item = await this.publicGet<MLItem>(`${ML_API}/items/${externalId}`).catch(() => null)
    if (!item) return null
    return this.mapItem(item)
  }

  // ─── fetchByItemIds (lista manual) ───────────────────────────────────────

  async fetchByItemIds(ids: string[]): Promise<RawListing[]> {
    this.log(`fetchByItemIds: ${ids.length} items`)

    const cleanIds = ids.map((id) => {
      const match = id.match(/MLB-?\d+/)
      return match ? match[0].replace('-', '') : id
    })

    const chunks: string[][] = []
    for (let i = 0; i < cleanIds.length; i += 20) {
      chunks.push(cleanIds.slice(i, i + 20))
    }

    const results: RawListing[] = []
    for (const chunk of chunks) {
      const url = `${ML_API}/items?ids=${chunk.join(',')}`
      // /items?ids= requer autenticação
      const rows = await this.authGet<Array<{ code: number; body: MLItem }>>(url).catch(() => [])
      for (const row of rows) {
        if (row.code === 200) results.push(this.mapItem(row.body))
      }
    }

    return results
  }

  // ─── affiliate URL ────────────────────────────────────────────────────────

  buildAffiliateUrl(productUrl: string): string {
    if (!this.affiliateId) return productUrl
    return `${productUrl}?matt_tool=${this.affiliateId}`
  }

  // ─── helpers ─────────────────────────────────────────────────────────────

  private async publicGet<T>(url: string): Promise<T> {
    const res = await fetch(url, { headers: PUBLIC_HEADERS, cache: 'no-store' })
    if (!res.ok) throw new Error(`ML API ${res.status}: ${url}`)
    return res.json() as Promise<T>
  }

  // mantido para uso interno caso precise de endpoints autenticados no futuro
  protected async authGet<T>(url: string): Promise<T> {
    const token = await getMLToken()
    const res = await fetch(url, {
      headers: { ...PUBLIC_HEADERS, Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`ML API ${res.status}: ${url}`)
    return res.json() as Promise<T>
  }

  // ─── map ──────────────────────────────────────────────────────────────────

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
