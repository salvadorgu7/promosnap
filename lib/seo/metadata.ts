import type { Metadata } from 'next'
import { getBaseUrl, APP_NAME } from '@/lib/seo/url'
const APP_URL = getBaseUrl()
const DEFAULT_DESC = 'Compare precos de Amazon, Mercado Livre, Shopee e Shein. Historico de 90 dias, score de oferta, cupons e alertas de queda de preco. Economize de verdade com dados reais.'

export function buildMetadata(opts: { title?: string; description?: string; path?: string; ogImage?: string; noIndex?: boolean }): Metadata {
  // Don't append APP_NAME here — layout.tsx template already adds "| PromoSnap"
  const title = opts.title || APP_NAME
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

export function productSchema(product: { name: string; description?: string; imageUrl?: string; brand?: string; rating?: number; reviewCount?: number; sku?: string; offers: Array<{ price: number; currency?: string; url: string; seller: string; availability: string }> }) {
  // priceValidUntil: 30 days from now — required for Google rich snippet price display
  const priceValidUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const makeOffer = (o: { price: number; currency?: string; url: string; seller: string; availability: string }) => ({
    '@type': 'Offer',
    price: o.price,
    priceCurrency: o.currency || 'BRL',
    priceValidUntil,
    url: o.url,
    seller: { '@type': 'Organization', name: o.seller },
    availability: `https://schema.org/${o.availability}`,
  })

  return {
    '@context': 'https://schema.org', '@type': 'Product', name: product.name, description: product.description, image: product.imageUrl,
    ...(product.sku ? { sku: product.sku } : {}),
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    ...(product.rating && product.reviewCount ? {
      aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating, reviewCount: product.reviewCount, bestRating: 5 },
    } : {}),
    offers: product.offers.length === 1
      ? makeOffer(product.offers[0])
      : {
          '@type': 'AggregateOffer',
          lowPrice: Math.min(...product.offers.map(o => o.price)),
          highPrice: Math.max(...product.offers.map(o => o.price)),
          priceCurrency: 'BRL',
          offerCount: product.offers.length,
          priceValidUntil,
          offers: product.offers.slice(0, 10).map(makeOffer),
        },
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

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: APP_NAME,
    url: APP_URL,
    logo: `${APP_URL}/logo.png`,
    description: 'Comparador de preços brasileiro com histórico de 90 dias, alertas de queda de preço e cupons de desconto.',
    sameAs: [],
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
  // Shorten product name to fit ~48 chars (+ "| PromoSnap" added by template = ~60 total)
  const shortName = product.name.length > 48 ? product.name.slice(0, 46) + '…' : product.name
  const priceFormatted = bestOffer ? `R$\u00a0${bestOffer.price.toFixed(2).replace('.', ',')}` : null
  const discountText = bestOffer?.discount && bestOffer.discount >= 5 ? ` (${bestOffer.discount}% OFF)` : ''

  // Title: short name + price signal — fits in SERP without truncation
  const title = priceFormatted
    ? `${shortName} – ${priceFormatted}${discountText}`
    : `${shortName} – Menor Preço`

  // Description: rich, commercial, with discount/brand signals
  const brandText = product.brand ? ` ${product.brand}` : ''
  const description = product.description
    ? `${product.description.slice(0, 110)}${priceFormatted ? ` Menor preço: ${priceFormatted}${discountText}.` : ''}`
    : priceFormatted
      ? `${product.name}${brandText} a partir de ${priceFormatted}${discountText}. Compare preços em Amazon, Mercado Livre, Shopee e mais. Histórico de 90 dias.`
      : `Compare preços de ${product.name}${brandText} nas melhores lojas do Brasil. Histórico de preços, cupons e frete grátis.`

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
