// ============================================================================
// ML Items — hydrate product details from /products/{id} and /items/{id}
// ============================================================================

import type { MLProduct } from './types'
import { getMLToken } from '@/lib/ml-auth'

const ML_API = 'https://api.mercadolibre.com'

// ============================================================================
// Shared authenticated fetch
// ============================================================================

export async function mlFetch(url: string, init?: RequestInit): Promise<Response> {
  let token: string | undefined
  try { token = await getMLToken() } catch { /* proceed without */ }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init?.headers as Record<string, string> || {}),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  return fetch(url, { ...init, headers })
}

// ============================================================================
// Hydrate a single product/item by ID
// ============================================================================

/**
 * Fetch product details. Tries /items/{id} first (most common from highlights),
 * falls back to /products/{id} (catalog product).
 * Also tries without auth if authenticated request fails (some endpoints are public).
 */
export async function hydrateItem(id: string): Promise<MLProduct | null> {
  // Try item endpoint first (most highlight IDs are item IDs)
  const itemRes = await mlFetch(`${ML_API}/items/${id}`)

  if (itemRes.ok) {
    const data = await itemRes.json()
    return normalizeItem(data)
  }

  // Try catalog product endpoint
  const prodRes = await mlFetch(`${ML_API}/products/${id}`)

  if (prodRes.ok) {
    const data = await prodRes.json()
    return normalizeCatalogProduct(data, id)
  }

  // Last resort: try item without auth (public endpoint)
  try {
    const publicRes = await fetch(`${ML_API}/items/${id}`, {
      headers: { Accept: 'application/json' },
    })
    if (publicRes.ok) {
      const data = await publicRes.json()
      return normalizeItem(data)
    }
  } catch { /* ignore */ }

  console.error(`[ml-discovery] hydrate ${id}: items=${itemRes.status} products=${prodRes.status}`)
  return null
}

// ============================================================================
// Batch hydrate — parallel with concurrency control
// ============================================================================

const MAX_CONCURRENT = 5

/**
 * Hydrate multiple product/item IDs in parallel batches.
 * Returns only successfully hydrated products with price > 0.
 */
export async function batchHydrateItems(ids: string[]): Promise<{ products: MLProduct[]; failed: string[] }> {
  const products: MLProduct[] = []
  const failed: string[] = []

  // Process in batches to avoid overwhelming the API
  for (let i = 0; i < ids.length; i += MAX_CONCURRENT) {
    const batch = ids.slice(i, i + MAX_CONCURRENT)
    const results = await Promise.allSettled(batch.map(hydrateItem))

    for (let j = 0; j < results.length; j++) {
      const result = results[j]
      if (result.status === 'fulfilled' && result.value && result.value.currentPrice > 0) {
        products.push(result.value)
      } else {
        failed.push(batch[j])
      }
    }
  }

  return { products, failed }
}

// ============================================================================
// Normalize ML API responses to MLProduct
// ============================================================================

interface MLCatalogProductResponse {
  id: string
  name: string
  pictures?: { url: string }[]
  buy_box_winner?: {
    item_id: string
    price: number
    original_price: number | null
    currency_id: string
    permalink: string
    shipping?: { free_shipping: boolean }
    available_quantity: number
    sold_quantity?: number
    condition?: string
    official_store_name?: string | null
  }
}

interface MLItemResponse {
  id: string
  title: string
  price: number
  original_price: number | null
  currency_id: string
  permalink: string
  thumbnail: string
  pictures?: { url: string; secure_url: string }[]
  shipping: { free_shipping: boolean }
  available_quantity: number
  sold_quantity: number
  condition: string
  catalog_product_id?: string | null
  official_store_name?: string | null
  category_id?: string
  status: string
}

function normalizeCatalogProduct(data: MLCatalogProductResponse, originalId: string): MLProduct | null {
  const bb = data.buy_box_winner
  if (!bb) {
    return {
      externalId: originalId,
      catalogProductId: data.id,
      title: data.name,
      currentPrice: 0,
      currency: 'BRL',
      productUrl: `https://www.mercadolivre.com.br/p/${data.id}`,
      imageUrl: data.pictures?.[0]?.url,
      isFreeShipping: false,
      availability: 'unknown',
    }
  }

  return {
    externalId: bb.item_id || originalId,
    catalogProductId: data.id,
    title: data.name,
    currentPrice: bb.price,
    originalPrice: bb.original_price ?? undefined,
    currency: bb.currency_id || 'BRL',
    productUrl: bb.permalink,
    imageUrl: data.pictures?.[0]?.url,
    isFreeShipping: bb.shipping?.free_shipping ?? false,
    availability: (bb.available_quantity ?? 0) > 0 ? 'in_stock' : 'out_of_stock',
    availableQuantity: bb.available_quantity,
    soldQuantity: bb.sold_quantity,
    condition: bb.condition,
    officialStoreName: bb.official_store_name ?? undefined,
  }
}

export function normalizeItem(data: MLItemResponse): MLProduct {
  const mainImage = data.pictures?.[0]?.secure_url
    || data.pictures?.[0]?.url
    || data.thumbnail?.replace(/-I\.jpg$/, '-O.jpg')

  return {
    externalId: data.id,
    catalogProductId: data.catalog_product_id ?? undefined,
    title: data.title,
    currentPrice: data.price,
    originalPrice: data.original_price ?? undefined,
    currency: data.currency_id || 'BRL',
    productUrl: data.permalink,
    imageUrl: mainImage,
    isFreeShipping: data.shipping?.free_shipping ?? false,
    availability: (data.available_quantity ?? 0) > 0 ? 'in_stock' : 'out_of_stock',
    availableQuantity: data.available_quantity,
    soldQuantity: data.sold_quantity,
    condition: data.condition,
    categoryId: data.category_id,
    officialStoreName: data.official_store_name ?? undefined,
  }
}
