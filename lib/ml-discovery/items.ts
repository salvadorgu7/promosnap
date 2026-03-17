// ============================================================================
// ML Items — hydrate product details from /products/{id} and /items/{id}
// ============================================================================

import type { MLProduct } from './types'
import { getMLToken } from '@/lib/ml-auth'
import { logger } from '@/lib/logger'

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
// Hydrate via multi-get /items?ids= (batch endpoint, different from /items/{id})
// ============================================================================

const MULTI_GET_BATCH = 20 // ML allows up to 20 IDs per multi-get

/**
 * Fetch multiple items in a single API call using the multi-get endpoint.
 * This is different from /items/{id} and may have different access rules.
 */
async function multiGetItems(ids: string[]): Promise<MLProduct[]> {
  const products: MLProduct[] = []

  for (let i = 0; i < ids.length; i += MULTI_GET_BATCH) {
    const batch = ids.slice(i, i + MULTI_GET_BATCH)
    const idsParam = batch.join(',')
    const attrs = 'id,title,price,permalink,thumbnail,shipping,pictures,available_quantity,sold_quantity,condition,category_id,official_store_name,original_price,currency_id,catalog_product_id,status'

    const res = await mlFetch(`${ML_API}/items?ids=${idsParam}&attributes=${attrs}`)

    if (!res.ok) {
      logger.error("ml-discovery.multi-get-failed", { status: res.status })
      continue
    }

    const data = await res.json()
    if (!Array.isArray(data)) continue

    for (const entry of data) {
      if (entry.code === 200 && entry.body) {
        const product = normalizeItem(entry.body)
        if (product.currentPrice > 0) {
          products.push(product)
        }
      }
    }
  }

  return products
}

// ============================================================================
// Hydrate catalog products via /products/{id}
// ============================================================================

async function hydrateCatalogProduct(id: string): Promise<MLProduct | null> {
  const res = await mlFetch(`${ML_API}/products/${id}`)
  if (!res.ok) return null

  const data = await res.json()
  const product = normalizeCatalogProduct(data, id)

  // If no buy_box_winner (price = 0), try /products/{id}/items to find actual listings
  if (product && product.currentPrice === 0) {
    const itemsFromProduct = await fetchProductItems(id)
    if (itemsFromProduct) {
      return {
        ...product,
        externalId: itemsFromProduct.id,
        currentPrice: itemsFromProduct.price,
        originalPrice: itemsFromProduct.originalPrice,
        productUrl: itemsFromProduct.permalink,
        imageUrl: itemsFromProduct.imageUrl || product.imageUrl,
        isFreeShipping: itemsFromProduct.isFreeShipping,
        availability: itemsFromProduct.availability,
        availableQuantity: itemsFromProduct.availableQuantity,
        soldQuantity: itemsFromProduct.soldQuantity,
        condition: itemsFromProduct.condition,
      }
    }
  }

  return product
}

/**
 * Fetch actual item listings for a catalog product via /products/{id}/items.
 * Returns the best available listing (cheapest with stock).
 */
async function fetchProductItems(productId: string): Promise<{
  id: string
  price: number
  originalPrice?: number
  permalink: string
  imageUrl?: string
  isFreeShipping: boolean
  availability: 'in_stock' | 'out_of_stock' | 'unknown'
  availableQuantity?: number
  soldQuantity?: number
  condition?: string
} | null> {
  try {
    const res = await mlFetch(`${ML_API}/products/${productId}/items?status=active&limit=5`)
    if (!res.ok) return null

    const data = await res.json()
    const results = data.results || data || []
    if (!Array.isArray(results) || results.length === 0) return null

    // Pick cheapest active item
    // Note: /products/{id}/items returns item_id (not id), price, shipping, condition
    // but NOT title, permalink, pictures, available_quantity, sold_quantity
    const sorted = results
      .filter((item: any) => (item.price ?? 0) > 0)
      .sort((a: any, b: any) => a.price - b.price)

    const best = sorted[0]
    if (!best) return null

    const itemId = best.item_id || best.id || ''
    // Construct permalink from item_id (MLB6205454066 → MLB-6205454066)
    const mlbNum = itemId.replace(/^MLB/, '')
    const permalink = `https://www.mercadolivre.com.br/p/${productId}`

    return {
      id: itemId,
      price: best.price,
      originalPrice: best.original_price ?? undefined,
      permalink,
      imageUrl: undefined, // No images in this endpoint — use parent product images
      isFreeShipping: best.shipping?.free_shipping ?? false,
      availability: 'in_stock' as const, // Active items are in stock
      availableQuantity: best.available_quantity,
      soldQuantity: best.sold_quantity,
      condition: best.condition,
    }
  } catch {
    return null
  }
}

// ============================================================================
// Hydrate a single product/item by ID (with type hint)
// ============================================================================

/**
 * Fetch product details. Uses type hint from highlights to pick the right endpoint.
 * - type "PRODUCT" → /products/{id} first (catalog product ID)
 * - type "ITEM" → /items/{id} first (listing item ID)
 */
export async function hydrateItem(id: string, typeHint?: 'PRODUCT' | 'ITEM'): Promise<MLProduct | null> {
  if (typeHint === 'PRODUCT') {
    // Try /products/ first for catalog product IDs
    const prod = await hydrateCatalogProduct(id)
    if (prod) return prod

    // Fallback: maybe it's actually an item ID
    const itemRes = await mlFetch(`${ML_API}/items/${id}`)
    if (itemRes.ok) {
      const data = await itemRes.json()
      return normalizeItem(data)
    }
  } else {
    // Try /items/ first for item IDs
    const itemRes = await mlFetch(`${ML_API}/items/${id}`)
    if (itemRes.ok) {
      const data = await itemRes.json()
      return normalizeItem(data)
    }

    // Fallback to /products/
    const prod = await hydrateCatalogProduct(id)
    if (prod) return prod
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

  return null
}

// ============================================================================
// Batch hydrate — tries multi-get first, falls back to individual
// ============================================================================

const MAX_CONCURRENT = 5

export interface HydrateEntry {
  id: string
  type?: 'PRODUCT' | 'ITEM'
}

/**
 * Hydrate multiple product/item IDs.
 * Strategy:
 * 1. Separate PRODUCT vs ITEM IDs
 * 2. Try multi-get for ITEM IDs (most efficient)
 * 3. Batch /products/{id} for PRODUCT IDs
 * 4. Fall back to individual calls for any failures
 */
export async function batchHydrateItems(
  entries: HydrateEntry[] | string[]
): Promise<{ products: MLProduct[]; failed: string[] }> {
  const products: MLProduct[] = []
  const failed: string[] = []
  const seen = new Set<string>()

  // Normalize input
  const normalized: HydrateEntry[] = entries.map(e =>
    typeof e === 'string' ? { id: e, type: undefined } : e
  )

  const productIds = normalized.filter(e => e.type === 'PRODUCT').map(e => e.id)
  const itemIds = normalized.filter(e => e.type !== 'PRODUCT').map(e => e.id)

  // ── Strategy 1: Multi-get for item IDs ──
  if (itemIds.length > 0) {
    try {
      const multiProducts = await multiGetItems(itemIds)
      for (const p of multiProducts) {
        if (!seen.has(p.externalId)) {
          products.push(p)
          seen.add(p.externalId)
        }
      }
      // Track failures
      const gotIds = new Set(multiProducts.map(p => p.externalId))
      for (const id of itemIds) {
        if (!gotIds.has(id)) failed.push(id)
      }
    } catch (err) {
      logger.error("ml-discovery.multi-get-error", { error: err })
      // Fall back to individual
      for (const id of itemIds) failed.push(id)
    }
  }

  // ── Strategy 2: /products/ for catalog product IDs ──
  if (productIds.length > 0) {
    // Also try multi-get first (some catalog IDs work with /items too)
    try {
      const multiProducts = await multiGetItems(productIds)
      for (const p of multiProducts) {
        if (!seen.has(p.externalId)) {
          products.push(p)
          seen.add(p.externalId)
        }
      }
      const gotIds = new Set(multiProducts.map(p => p.externalId))
      // Individual /products/ for remaining
      const remaining = productIds.filter(id => !gotIds.has(id))
      if (remaining.length > 0) {
        for (let i = 0; i < remaining.length; i += MAX_CONCURRENT) {
          const batch = remaining.slice(i, i + MAX_CONCURRENT)
          const results = await Promise.allSettled(
            batch.map(id => hydrateCatalogProduct(id))
          )
          for (let j = 0; j < results.length; j++) {
            const result = results[j]
            if (result.status === 'fulfilled' && result.value && result.value.currentPrice > 0) {
              if (!seen.has(result.value.externalId)) {
                products.push(result.value)
                seen.add(result.value.externalId)
              }
            } else {
              failed.push(batch[j])
            }
          }
        }
      }
    } catch {
      // Individual fallback
      for (let i = 0; i < productIds.length; i += MAX_CONCURRENT) {
        const batch = productIds.slice(i, i + MAX_CONCURRENT)
        const results = await Promise.allSettled(
          batch.map(id => hydrateCatalogProduct(id))
        )
        for (let j = 0; j < results.length; j++) {
          const result = results[j]
          if (result.status === 'fulfilled' && result.value && result.value.currentPrice > 0) {
            if (!seen.has(result.value.externalId)) {
              products.push(result.value)
              seen.add(result.value.externalId)
            }
          } else {
            failed.push(batch[j])
          }
        }
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
  const rawPicUrl = data.pictures?.[0]?.url
  const catalogImage = rawPicUrl && rawPicUrl.length > 5 ? rawPicUrl : undefined

  if (!bb) {
    return {
      externalId: originalId,
      catalogProductId: data.id,
      title: data.name,
      currentPrice: 0,
      currency: 'BRL',
      productUrl: `https://www.mercadolivre.com.br/p/${data.id}`,
      imageUrl: catalogImage,
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
    imageUrl: catalogImage,
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
    || (data.thumbnail ? data.thumbnail.replace(/-I\.jpg$/, '-O.jpg') : undefined)

  // Ensure empty strings become undefined (critical for downstream null checks)
  const imageUrl = mainImage && mainImage.length > 5 ? mainImage : undefined

  return {
    externalId: data.id,
    catalogProductId: data.catalog_product_id ?? undefined,
    title: data.title,
    currentPrice: data.price,
    originalPrice: data.original_price ?? undefined,
    currency: data.currency_id || 'BRL',
    productUrl: data.permalink,
    imageUrl,
    isFreeShipping: data.shipping?.free_shipping ?? false,
    availability: (data.available_quantity ?? 0) > 0 ? 'in_stock' : 'out_of_stock',
    availableQuantity: data.available_quantity,
    soldQuantity: data.sold_quantity,
    condition: data.condition,
    categoryId: data.category_id,
    officialStoreName: data.official_store_name ?? undefined,
  }
}
