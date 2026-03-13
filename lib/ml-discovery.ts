// ML Product Discovery — uses endpoints that work from any IP
// /highlights (best sellers) + /items (details) + /trends
// Replaces /sites/MLB/search which is geo-blocked from non-BR IPs

import { getMLToken } from '@/lib/ml-auth'

const ML_API = 'https://api.mercadolibre.com'

// ============================================================================
// ML Category Map — popular categories for PromoSnap
// ============================================================================

export const ML_CATEGORIES: Record<string, { id: string; name: string }> = {
  celular:      { id: 'MLB1055', name: 'Celulares e Smartphones' },
  smartphone:   { id: 'MLB1055', name: 'Celulares e Smartphones' },
  notebook:     { id: 'MLB1652', name: 'Notebooks' },
  laptop:       { id: 'MLB1652', name: 'Notebooks' },
  tablet:       { id: 'MLB1659', name: 'Tablets' },
  ipad:         { id: 'MLB1659', name: 'Tablets' },
  fone:         { id: 'MLB1676', name: 'Fones de Ouvido' },
  headphone:    { id: 'MLB1676', name: 'Fones de Ouvido' },
  smartwatch:   { id: 'MLB352679', name: 'Smartwatches e Acessorios' },
  relogio:      { id: 'MLB352679', name: 'Smartwatches e Acessorios' },
  tv:           { id: 'MLB1002', name: 'TVs' },
  televisao:    { id: 'MLB1002', name: 'TVs' },
  monitor:      { id: 'MLB1670', name: 'Monitores e Acessorios' },
  camera:       { id: 'MLB1039', name: 'Cameras e Acessorios' },
  console:      { id: 'MLB186456', name: 'Consoles' },
  playstation:  { id: 'MLB186456', name: 'Consoles' },
  xbox:         { id: 'MLB186456', name: 'Consoles' },
  videogame:    { id: 'MLB186456', name: 'Consoles' },
  impressora:   { id: 'MLB1672', name: 'Impressoras' },
  ssd:          { id: 'MLB7517', name: 'Discos e SSDs' },
  hd:           { id: 'MLB7517', name: 'Discos e SSDs' },
  teclado:      { id: 'MLB12119', name: 'Teclados' },
  mouse:        { id: 'MLB4739', name: 'Mouses' },
  'ar condicionado': { id: 'MLB1596', name: 'Ar Condicionado' },
  geladeira:    { id: 'MLB1576', name: 'Geladeiras e Freezers' },
  microondas:   { id: 'MLB111079', name: 'Micro-ondas' },
  aspirador:    { id: 'MLB1574', name: 'Aspiradores e Limpeza' },
  cafeteira:    { id: 'MLB110447', name: 'Cafeteiras' },
  perfume:      { id: 'MLB1246', name: 'Perfumes' },
  tenis:        { id: 'MLB99614', name: 'Tenis' },
  mochila:      { id: 'MLB16117', name: 'Mochilas' },
}

// Default categories for auto-sync (most popular product categories for PromoSnap)
export const DEFAULT_SYNC_CATEGORIES = [
  'MLB1055',   // Celulares
  'MLB1652',   // Notebooks
  'MLB1676',   // Fones
  'MLB352679', // Smartwatches
  'MLB1002',   // TVs
  'MLB186456', // Consoles
  'MLB1659',   // Tablets
]

// ============================================================================
// Find best matching category for a search query
// ============================================================================

export function findCategory(query: string): { id: string; name: string } | null {
  const q = query.toLowerCase().trim()

  // Exact match
  if (ML_CATEGORIES[q]) return ML_CATEGORIES[q]

  // Partial match — check if query contains a category keyword
  for (const [keyword, cat] of Object.entries(ML_CATEGORIES)) {
    if (q.includes(keyword) || keyword.includes(q)) return cat
  }

  return null
}

// ============================================================================
// Get auth headers
// ============================================================================

async function mlHeaders(): Promise<Record<string, string>> {
  try {
    const token = await getMLToken()
    return { Authorization: `Bearer ${token}`, Accept: 'application/json' }
  } catch {
    return { Accept: 'application/json' }
  }
}

// ============================================================================
// Get best-seller product IDs for a category
// ============================================================================

interface HighlightItem {
  id: string
  position: number
  type: string // "PRODUCT" or "ITEM"
}

export async function getHighlights(categoryId: string): Promise<string[]> {
  const headers = await mlHeaders()
  const res = await fetch(`${ML_API}/highlights/MLB/category/${categoryId}`, { headers })

  if (!res.ok) {
    console.error(`[ml-discovery] highlights/${categoryId} failed:`, res.status)
    return []
  }

  const data = await res.json()
  const items: HighlightItem[] = data.content || []

  // Highlights returns catalog product IDs (e.g., "MLB55034955")
  // We need to convert these to item IDs to get full details
  return items.map((item) => item.id)
}

// ============================================================================
// Get product details by catalog product ID
// ============================================================================

interface MLProductDetail {
  id: string
  name: string
  main_features?: { text: string }[]
  pictures?: { url: string }[]
  buy_box_winner?: {
    item_id: string
    price: number
    original_price: number | null
    currency_id: string
    permalink: string
    shipping?: { free_shipping: boolean }
    available_quantity: number
  }
}

export interface DiscoveredProduct {
  externalId: string
  title: string
  currentPrice: number
  originalPrice?: number
  productUrl: string
  imageUrl?: string
  isFreeShipping: boolean
  availability: string
  category?: string
}

export async function getProductDetails(productId: string): Promise<DiscoveredProduct | null> {
  const headers = await mlHeaders()

  // Try catalog product endpoint first
  const res = await fetch(`${ML_API}/products/${productId}`, { headers })

  if (res.ok) {
    const data: MLProductDetail = await res.json()

    if (data.buy_box_winner) {
      return {
        externalId: data.buy_box_winner.item_id || productId,
        title: data.name,
        currentPrice: data.buy_box_winner.price,
        originalPrice: data.buy_box_winner.original_price ?? undefined,
        productUrl: data.buy_box_winner.permalink,
        imageUrl: data.pictures?.[0]?.url,
        isFreeShipping: data.buy_box_winner.shipping?.free_shipping ?? false,
        availability: (data.buy_box_winner.available_quantity ?? 0) > 0 ? 'in_stock' : 'out_of_stock',
      }
    }

    // No buy_box_winner but has basic info
    return {
      externalId: productId,
      title: data.name,
      currentPrice: 0,
      productUrl: `https://www.mercadolivre.com.br/p/${productId}`,
      imageUrl: data.pictures?.[0]?.url,
      isFreeShipping: false,
      availability: 'unknown',
    }
  }

  // Fallback: try as item ID
  const itemRes = await fetch(`${ML_API}/items/${productId}`, { headers })
  if (itemRes.ok) {
    const item = await itemRes.json()
    return {
      externalId: item.id,
      title: item.title,
      currentPrice: item.price,
      originalPrice: item.original_price ?? undefined,
      productUrl: item.permalink,
      imageUrl: item.thumbnail?.replace(/-I\.jpg$/, '-O.jpg'),
      isFreeShipping: item.shipping?.free_shipping ?? false,
      availability: (item.available_quantity ?? 0) > 0 ? 'in_stock' : 'out_of_stock',
    }
  }

  console.error(`[ml-discovery] Could not fetch product ${productId}: catalog=${res.status}, item=${itemRes.status}`)
  return null
}

// ============================================================================
// Batch get product details (parallel, handles both product and item IDs)
// ============================================================================

export async function getProductsBatch(productIds: string[]): Promise<DiscoveredProduct[]> {
  const results = await Promise.allSettled(
    productIds.map((id) => getProductDetails(id))
  )

  return results
    .filter((r): r is PromiseFulfilledResult<DiscoveredProduct | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((p): p is DiscoveredProduct => p !== null && p.currentPrice > 0)
}

// ============================================================================
// Discover products: category highlights → product details
// ============================================================================

export async function discoverProducts(
  query: string,
  limit: number = 20
): Promise<{ results: DiscoveredProduct[]; category: string | null; method: string }> {
  const cat = findCategory(query)

  if (cat) {
    // Known category — get best sellers
    const productIds = await getHighlights(cat.id)

    if (productIds.length === 0) {
      return { results: [], category: cat.name, method: 'highlights_empty' }
    }

    const products = await getProductsBatch(productIds.slice(0, limit))
    return {
      results: products.map((p) => ({ ...p, category: cat.name })),
      category: cat.name,
      method: 'highlights',
    }
  }

  // Unknown category — try all default categories and filter by query
  const allProducts: DiscoveredProduct[] = []

  for (const catId of DEFAULT_SYNC_CATEGORIES.slice(0, 3)) {
    const productIds = await getHighlights(catId)
    if (productIds.length === 0) continue

    const products = await getProductsBatch(productIds.slice(0, 10))
    const matching = products.filter((p) =>
      p.title.toLowerCase().includes(query.toLowerCase())
    )
    allProducts.push(...matching)

    if (allProducts.length >= limit) break
  }

  return {
    results: allProducts.slice(0, limit),
    category: null,
    method: 'cross_category_filter',
  }
}

// ============================================================================
// Get trending topics
// ============================================================================

export async function getTrends(): Promise<{ keyword: string; url: string }[]> {
  const headers = await mlHeaders()
  const res = await fetch(`${ML_API}/trends/MLB`, { headers })

  if (!res.ok) return []

  return res.json()
}

// ============================================================================
// Auto-sync: discover products from all default categories
// ============================================================================

export async function discoverAllCategories(
  limitPerCategory: number = 10
): Promise<{ results: DiscoveredProduct[]; categories: string[] }> {
  const allProducts: DiscoveredProduct[] = []
  const categories: string[] = []

  for (const catId of DEFAULT_SYNC_CATEGORIES) {
    try {
      const catName = Object.values(ML_CATEGORIES).find((c) => c.id === catId)?.name || catId
      const productIds = await getHighlights(catId)

      if (productIds.length > 0) {
        const products = await getProductsBatch(productIds.slice(0, limitPerCategory))
        allProducts.push(...products.map((p) => ({ ...p, category: catName })))
        categories.push(catName)
      }
    } catch (err) {
      console.error(`[ml-discovery] Failed to sync category ${catId}:`, err)
    }
  }

  return { results: allProducts, categories }
}
