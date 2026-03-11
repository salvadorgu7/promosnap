import type { Metadata } from 'next'

const APP_NAME = 'PromoSnap'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://promosnap.com.br'
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
