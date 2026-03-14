import type { Metadata } from 'next'
import { getBaseUrl, APP_NAME } from '@/lib/seo/url'
const APP_URL = getBaseUrl()
const DEFAULT_DESC = 'Compare preços, encontre as melhores ofertas e economize de verdade. Histórico real de preços, cupons e alertas de queda.'

export function buildMetadata(opts: { title?: string; description?: string; path?: string; ogImage?: string; noIndex?: boolean }): Metadata {
  const title = opts.title ? `${opts.title} | ${APP_NAME}` : APP_NAME
  const description = opts.description || DEFAULT_DESC
  const url = opts.path ? `${APP_URL}${opts.path}` : APP_URL
  return {
    title, description,
    metadataBase: new URL(APP_URL),
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: APP_NAME, locale: 'pt_BR', type: 'website', images: opts.ogImage ? [{ url: opts.ogImage }] : [] },
    twitter: { card: 'summary_large_image', title, description },
    robots: opts.noIndex ? { index: false, follow: false } : { index: true, follow: true },
  }
}

export function productSchema(product: { name: string; description?: string; imageUrl?: string; brand?: string; offers: Array<{ price: number; currency?: string; url: string; seller: string; availability: string }> }) {
  return {
    '@context': 'https://schema.org', '@type': 'Product', name: product.name, description: product.description, image: product.imageUrl,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    offers: product.offers.length === 1
      ? { '@type': 'Offer', price: product.offers[0].price, priceCurrency: product.offers[0].currency || 'BRL', url: product.offers[0].url, seller: { '@type': 'Organization', name: product.offers[0].seller }, availability: `https://schema.org/${product.offers[0].availability}` }
      : { '@type': 'AggregateOffer', lowPrice: Math.min(...product.offers.map(o => o.price)), highPrice: Math.max(...product.offers.map(o => o.price)), priceCurrency: 'BRL', offerCount: product.offers.length },
  }
}

export function breadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: `${APP_URL}${item.url}` })),
  }
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org', '@type': 'WebSite', name: APP_NAME, url: APP_URL,
    potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${APP_URL}/busca?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
  }
}

// ============================================
// SEO META GENERATORS
// ============================================

interface ProductMetaInput {
  name: string
  brand?: string | null
  description?: string | null
  slug: string
  imageUrl?: string | null
}

interface OfferMetaInput {
  price: number
  originalPrice?: number | null
  discount?: number | null
}

/** Generate SEO metadata for a product page with price, discount, and brand info */
export function generateProductMeta(product: ProductMetaInput, bestOffer?: OfferMetaInput | null) {
  const priceText = bestOffer ? ` por R$ ${bestOffer.price.toFixed(2).replace('.', ',')}` : ''
  const discountText = bestOffer?.discount && bestOffer.discount > 0 ? ` (-${bestOffer.discount}%)` : ''
  const brandText = product.brand ? ` ${product.brand}` : ''

  const title = `${product.name}${brandText}${priceText} - Melhor Preco`
  const description = product.description
    ? product.description.slice(0, 140) + (bestOffer ? `. A partir de R$ ${bestOffer.price.toFixed(2).replace('.', ',')}${discountText}.` : '')
    : `Compare precos de ${product.name}${brandText} nas melhores lojas${priceText}${discountText}. Historico de precos e frete gratis.`

  return buildMetadata({
    title,
    description,
    path: `/produto/${product.slug}`,
    ogImage: product.imageUrl || undefined,
  })
}

interface CategoryMetaInput {
  name: string
  slug: string
  description?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
}

interface CategoryStatsInput {
  productCount: number
  minPrice?: number | null
  maxPrice?: number | null
}

/** Generate SEO metadata for a category page with product count and price range */
export function generateCategoryMeta(category: CategoryMetaInput, stats?: CategoryStatsInput | null) {
  const countText = stats?.productCount ? `${stats.productCount} produtos` : 'produtos'
  const priceRange = stats?.minPrice && stats?.maxPrice
    ? ` de R$ ${stats.minPrice.toFixed(2).replace('.', ',')} a R$ ${stats.maxPrice.toFixed(2).replace('.', ',')}`
    : ''

  const title = category.seoTitle || `${category.name} - Melhores Ofertas`
  const description = category.seoDescription
    || `Compare precos de ${category.name}: ${countText}${priceRange}. Historico de precos, cupons e frete gratis.`

  return buildMetadata({
    title,
    description,
    path: `/categoria/${category.slug}`,
  })
}

/** Generate SEO metadata for search results pages */
export function generateSearchMeta(query: string, resultsCount?: number) {
  if (!query) {
    return buildMetadata({
      title: 'Buscar Ofertas',
      description: 'Busque e compare precos de milhares de produtos nas melhores lojas do Brasil.',
      path: '/busca',
    })
  }

  const countText = resultsCount !== undefined ? `${resultsCount} resultado${resultsCount !== 1 ? 's' : ''}` : 'resultados'
  return buildMetadata({
    title: `${query} - Busca`,
    description: `${countText} para "${query}". Compare precos nas melhores lojas do Brasil e encontre o menor preco.`,
    path: `/busca?q=${encodeURIComponent(query)}`,
  })
}
