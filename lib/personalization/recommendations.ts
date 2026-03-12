// ============================================
// RECOMMENDATIONS ENGINE — BLOCO 4 Personalization V3
// ============================================

import type { UserSegment } from './segmentation'

// Complementary category mappings: product keyword -> related category slugs
const COMPLEMENTARY_MAP: Record<string, string[]> = {
  'iphone': ['fones-bluetooth', 'acessorios', 'capas', 'carregador', 'pelicula', 'smartwatch'],
  'smartphone': ['fones-bluetooth', 'acessorios', 'capas', 'carregador', 'pelicula', 'smartwatch'],
  'celular': ['fones-bluetooth', 'acessorios', 'capas', 'carregador', 'pelicula'],
  'notebook': ['mouse', 'hub-usb', 'mochila', 'monitor', 'teclado', 'suporte-notebook', 'ssd'],
  'laptop': ['mouse', 'hub-usb', 'mochila', 'monitor', 'teclado', 'suporte-notebook'],
  'smart-tv': ['soundbar', 'streaming', 'suporte-tv', 'cabo-hdmi', 'home-theater'],
  'televisao': ['soundbar', 'streaming', 'suporte-tv', 'cabo-hdmi'],
  'monitor': ['suporte-monitor', 'hub-usb', 'cabo-hdmi', 'mouse', 'teclado', 'webcam'],
  'headset': ['mouse-gamer', 'teclado-mecanico', 'mousepad', 'cadeira-gamer'],
  'console': ['controle', 'headset', 'games', 'cadeira-gamer', 'monitor'],
  'playstation': ['controle', 'headset', 'games', 'cadeira-gamer', 'ssd'],
  'xbox': ['controle', 'headset', 'games', 'cadeira-gamer', 'gamepass'],
  'cadeira-gamer': ['mesa-gamer', 'mousepad', 'headset', 'iluminacao'],
  'air-fryer': ['utensilios-cozinha', 'panela', 'acessorios-cozinha', 'livro-receitas'],
  'cafeteira': ['capsulas', 'acessorios-cafe', 'caneca', 'filtro'],
  'tablet': ['caneta-stylus', 'capa-tablet', 'teclado-bluetooth', 'pelicula'],
  'camera': ['tripe', 'cartao-memoria', 'lente', 'mochila-camera', 'iluminacao'],
  'impressora': ['tinta', 'papel', 'cartuchos', 'cabo-usb'],
}

export function getComplementaryProducts(product: {
  name: string
  categorySlug: string
  brandSlug: string
}): string[] {
  const nameLower = product.name.toLowerCase()
  const results = new Set<string>()

  // Check product name against complementary mappings
  for (const [keyword, categories] of Object.entries(COMPLEMENTARY_MAP)) {
    if (nameLower.includes(keyword)) {
      for (const cat of categories) {
        // Don't recommend the same category as the product
        if (cat !== product.categorySlug) {
          results.add(cat)
        }
      }
    }
  }

  // If no specific match, fall back to category-based suggestions
  if (results.size === 0) {
    const CATEGORY_FALLBACKS: Record<string, string[]> = {
      'smartphones': ['fones-bluetooth', 'acessorios', 'capas'],
      'notebooks': ['mouse', 'hub-usb', 'monitor'],
      'monitores': ['suporte-monitor', 'cabo-hdmi', 'webcam'],
      'games': ['headset', 'cadeira-gamer', 'controle'],
      'eletrodomesticos': ['utensilios-cozinha', 'casa-cozinha'],
      'perifericos': ['mouse', 'teclado', 'mousepad'],
      'componentes': ['ssd', 'ram', 'gabinete'],
      'audio': ['fones-bluetooth', 'soundbar', 'caixa-de-som'],
    }

    const fallback = CATEGORY_FALLBACKS[product.categorySlug]
    if (fallback) {
      for (const cat of fallback) {
        results.add(cat)
      }
    }
  }

  return Array.from(results)
}

export function getPersonalizedOrder(sections: string[], segment: UserSegment): string[] {
  if (segment === 'general') return sections

  // Define section priority per segment
  const SECTION_PRIORITY: Record<Exclude<UserSegment, 'general'>, string[]> = {
    tech_enthusiast: ['hotDeals', 'lowestPrices', 'bestSellers', 'categories', 'coupons'],
    bargain_hunter: ['lowestPrices', 'coupons', 'hotDeals', 'bestSellers', 'categories'],
    gamer: ['hotDeals', 'bestSellers', 'lowestPrices', 'categories', 'coupons'],
    casa_cozinha: ['lowestPrices', 'bestSellers', 'hotDeals', 'coupons', 'categories'],
    mobile_first: ['hotDeals', 'lowestPrices', 'bestSellers', 'categories', 'coupons'],
    beauty_fashion: ['bestSellers', 'lowestPrices', 'coupons', 'hotDeals', 'categories'],
  }

  const priority = SECTION_PRIORITY[segment]
  if (!priority) return sections

  // Reorder: known sections come first in priority order, then unknown sections keep their order
  const ordered: string[] = []
  const remaining = [...sections]

  for (const section of priority) {
    const idx = remaining.indexOf(section)
    if (idx !== -1) {
      ordered.push(remaining.splice(idx, 1)[0])
    }
  }

  // Append any sections not in the priority list
  return [...ordered, ...remaining]
}

// ============================================
// RETURN INTENT RECOMMENDATIONS — V3
// ============================================

export interface RecommendationRequest {
  categories?: string[]
  brands?: string[]
  excludeIds?: string[]
  limit?: number
}

/**
 * Build API params for price drop recommendations:
 * Items user viewed that dropped in price
 */
export function getPriceDropRecommendationParams(
  viewedProductIds: string[],
  limit = 8
): URLSearchParams | null {
  if (viewedProductIds.length === 0) return null

  const params = new URLSearchParams({
    type: "price_drops",
    limit: String(limit),
  })

  // We pass viewed IDs as a hint — the API will find products
  // in the same categories that have active price drops
  return params
}

/**
 * Build API params for category-based recommendations:
 * New items in user's favorite categories
 */
export function getCategoryRecommendationParams(
  favCategories: string[],
  excludeIds: string[] = [],
  limit = 8
): URLSearchParams | null {
  if (favCategories.length === 0) return null

  const params = new URLSearchParams({
    categories: favCategories.slice(0, 5).join(","),
    type: "new",
    limit: String(limit),
  })

  if (excludeIds.length > 0) {
    params.set("exclude", excludeIds.slice(0, 20).join(","))
  }

  return params
}

/**
 * Build API params for brand-based recommendations:
 * New items from user's favorite brands
 */
export function getBrandRecommendationParams(
  favBrands: string[],
  excludeIds: string[] = [],
  limit = 8
): URLSearchParams | null {
  if (favBrands.length === 0) return null

  const params = new URLSearchParams({
    brands: favBrands.slice(0, 5).join(","),
    limit: String(limit),
  })

  if (excludeIds.length > 0) {
    params.set("exclude", excludeIds.slice(0, 20).join(","))
  }

  return params
}

/**
 * Build combined recommendation params for "Para voce" rail:
 * Top picks based on all signals
 */
export function getTopPicksParams(
  categories: string[],
  brands: string[],
  excludeIds: string[] = [],
  limit = 10
): URLSearchParams | null {
  if (categories.length === 0 && brands.length === 0) return null

  const params = new URLSearchParams({ limit: String(limit) })

  if (categories.length > 0) {
    params.set("categories", categories.slice(0, 5).join(","))
  }
  if (brands.length > 0) {
    params.set("brands", brands.slice(0, 3).join(","))
  }
  if (excludeIds.length > 0) {
    params.set("exclude", excludeIds.slice(0, 20).join(","))
  }

  return params
}
