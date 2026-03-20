/**
 * lib/seo/auto-generator.ts
 *
 * SEO Auto-Generator — gera título, meta description, H1, subtítulo, intro, FAQs,
 * labels comerciais e sugestões de links internos com base em dados reais do catálogo.
 *
 * Funciona para: produto, categoria, marca, melhores, menor-preço, comparação,
 * vale-a-pena, faixa-de-preço, ofertas, sazonais.
 *
 * Uso:
 *   import { generatePageSEO } from '@/lib/seo/auto-generator'
 *   const seo = generatePageSEO({ type: 'product', data: { ... } })
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type PageType =
  | 'product'
  | 'category'
  | 'brand'
  | 'melhores'
  | 'menor-preco'
  | 'comparacao'
  | 'vale-a-pena'
  | 'faixa-preco'
  | 'ofertas'
  | 'home'
  | 'busca'

export interface ProductSEOInput {
  type: 'product'
  data: {
    name: string
    brand?: string | null
    category?: string | null
    description?: string | null
    price?: number | null
    originalPrice?: number | null
    discount?: number | null
    isFreeShipping?: boolean
    hasCoupon?: boolean
    sources?: string[]       // e.g. ['Amazon', 'Mercado Livre']
    priceMin90d?: number | null
    isAtHistoricalMin?: boolean
    slug: string
  }
}

export interface CategorySEOInput {
  type: 'category'
  data: {
    name: string
    slug: string
    productCount?: number
    minPrice?: number | null
    maxPrice?: number | null
    topBrands?: string[]
    description?: string | null
  }
}

export interface BrandSEOInput {
  type: 'brand'
  data: {
    name: string
    slug: string
    productCount?: number
    categories?: string[]
    minPrice?: number | null
  }
}

export interface MelhoresSEOInput {
  type: 'melhores'
  data: {
    title: string          // e.g. "Melhores Notebooks"
    slug: string
    category?: string
    productCount?: number
    topProduct?: { name: string; price?: number }
    description?: string
  }
}

export interface MenorPrecoSEOInput {
  type: 'menor-preco'
  data: {
    name: string           // e.g. "Aspirador de Pó" or generic
    slug?: string
    price?: number
    discount?: number
    brand?: string
  }
}

export interface ComparacaoSEOInput {
  type: 'comparacao'
  data: {
    productA: { name: string; price?: number; brand?: string }
    productB: { name: string; price?: number; brand?: string }
    slug: string
    category?: string
  }
}

export interface ValeAPenaSEOInput {
  type: 'vale-a-pena'
  data: {
    productName: string
    slug: string
    price?: number
    discount?: number
    brand?: string
    verdict?: 'yes' | 'no' | 'conditional'
  }
}

export interface FaixaPrecоSEOInput {
  type: 'faixa-preco'
  data: {
    category: string
    minPrice: number
    maxPrice: number
    slug: string
    productCount?: number
  }
}

export interface OfertasSEOInput {
  type: 'ofertas'
  data: {
    keyword: string         // e.g. "notebook", "smartphone"
    slug: string
    productCount?: number
    topDiscount?: number
  }
}

export interface HomeSEOInput {
  type: 'home'
  data?: Record<string, never>
}

export interface BuscaSEOInput {
  type: 'busca'
  data: {
    query?: string
    resultCount?: number
  }
}

export type SEOInput =
  | ProductSEOInput
  | CategorySEOInput
  | BrandSEOInput
  | MelhoresSEOInput
  | MenorPrecoSEOInput
  | ComparacaoSEOInput
  | ValeAPenaSEOInput
  | FaixaPrecоSEOInput
  | OfertasSEOInput
  | HomeSEOInput
  | BuscaSEOInput

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUT
// ─────────────────────────────────────────────────────────────────────────────

export interface GeneratedSEO {
  /** SEO <title> — max ~50 chars (layout template adds "| PromoSnap") */
  title: string
  /** meta description — 130-155 chars, commercial, high CTR */
  metaDescription: string
  /** H1 — the visible page heading */
  h1: string
  /** Optional subtitle / lead-in text under H1 */
  subtitle?: string
  /** Short intro paragraph for page body (1-2 sentences) */
  intro?: string
  /** Commercial badge labels */
  labels?: string[]
  /** FAQ pairs for FAQPage schema and page content */
  faqs?: Array<{ question: string; answer: string }>
  /** Suggested internal links */
  internalLinks?: Array<{ label: string; href: string }>
  /** Schema type candidates for this page */
  schemaTypes?: string[]
  /** Readiness score 0-100 (how ready is this page for indexing) */
  readinessScore?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function formatBRL(price: number): string {
  return `R$\u00a0${price.toFixed(2).replace('.', ',')}`
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str
}

const CURRENT_YEAR = new Date().getFullYear()

const STORES = ['Amazon', 'Mercado Livre', 'Shopee', 'Shein']

// ─────────────────────────────────────────────────────────────────────────────
// GENERATORS PER PAGE TYPE
// ─────────────────────────────────────────────────────────────────────────────

function generateProductSEO(d: ProductSEOInput['data']): GeneratedSEO {
  const shortName = truncate(d.name, 46)
  const priceStr = d.price ? formatBRL(d.price) : null
  const discountStr = d.discount && d.discount >= 5 ? `${d.discount}% OFF` : null
  const brandStr = d.brand ? ` ${d.brand}` : ''
  const storeList = d.sources?.length ? d.sources.slice(0, 3).join(', ') : STORES.slice(0, 3).join(', ')
  const histMin = d.isAtHistoricalMin ? ' — mínimo histórico' : ''

  const title = priceStr
    ? `${shortName} – ${priceStr}${discountStr ? ` (${discountStr})` : ''}`
    : `${shortName} – Menor Preço`

  const metaDescription = d.price
    ? `${d.name}${brandStr} por ${priceStr}${discountStr ? ` (${discountStr})` : ''}${histMin}. Compare preços em ${storeList}. Histórico real de 90 dias${d.isFreeShipping ? ', frete grátis' : ''}.`
    : `Compare preços de ${d.name}${brandStr} em ${storeList}. Histórico de preços, cupons, frete grátis e alertas de queda.`

  const h1 = `${d.name}${brandStr}`

  const subtitle = d.price
    ? `Menor preço encontrado: ${priceStr}${discountStr ? ` com ${discountStr}` : ''}`
    : `Compare preços e economize`

  const intro = d.description
    ? truncate(d.description, 200)
    : `Compare preços de ${d.name} nas principais lojas do Brasil. Veja o histórico de ${CURRENT_YEAR} e compre no melhor momento.`

  const labels: string[] = []
  if (discountStr) labels.push(discountStr)
  if (d.isFreeShipping) labels.push('Frete Grátis')
  if (d.hasCoupon) labels.push('Com Cupom')
  if (d.isAtHistoricalMin) labels.push('Mínimo Histórico')

  const faqs: GeneratedSEO['faqs'] = [
    {
      question: `Qual o menor preço de ${d.name}?`,
      answer: d.price
        ? `O menor preço encontrado para ${d.name} é ${priceStr}${d.sources?.[0] ? ` em ${d.sources[0]}` : ''}.${d.priceMin90d ? ` Nos últimos 90 dias, o mínimo foi ${formatBRL(d.priceMin90d)}.` : ''}`
        : `Compare em tempo real em nossa página — monitoramos ${STORES.join(', ')}.`,
    },
    {
      question: `Vale a pena comprar ${d.name} agora?`,
      answer: d.isAtHistoricalMin
        ? `Sim — o preço atual está no mínimo histórico registrado, é uma boa oportunidade de compra.`
        : d.discount && d.discount >= 20
          ? `O desconto atual de ${d.discount}% está acima da média — vale considerar a compra.`
          : `Verifique o gráfico de histórico de preços para decidir o melhor momento.`,
    },
  ]

  const internalLinks: GeneratedSEO['internalLinks'] = []
  if (d.category) {
    internalLinks.push({ label: `Mais ${d.category}`, href: `/categoria/${d.category.toLowerCase().replace(/\s+/g, '-')}` })
  }
  if (d.brand) {
    internalLinks.push({ label: `Outros produtos ${d.brand}`, href: `/marca/${d.brand.toLowerCase().replace(/\s+/g, '-')}` })
  }
  internalLinks.push({ label: 'Menor preço histórico', href: '/menor-preco' })

  const readinessScore = [
    !!d.price,
    !!d.discount,
    !!d.description,
    !!d.brand,
    !!d.category,
    !!d.sources?.length,
  ].filter(Boolean).length * 16 + 4

  return {
    title: truncate(title, 52),
    metaDescription: truncate(metaDescription, 155),
    h1,
    subtitle,
    intro,
    labels,
    faqs,
    internalLinks,
    schemaTypes: ['Product', 'BreadcrumbList', 'FAQPage'],
    readinessScore,
  }
}

function generateCategorySEO(d: CategorySEOInput['data']): GeneratedSEO {
  const countStr = d.productCount ? `${d.productCount}+ produtos` : 'produtos'
  const priceRange = d.minPrice && d.maxPrice
    ? ` de ${formatBRL(d.minPrice)} a ${formatBRL(d.maxPrice)}`
    : ''
  const brandsStr = d.topBrands?.length ? d.topBrands.slice(0, 3).join(', ') : ''

  const title = `${d.name} – Melhores Ofertas e Preços`
  const metaDescription = `Compare preços de ${countStr} em ${d.name}${priceRange}. ${brandsStr ? `Marcas: ${brandsStr}. ` : ''}Histórico real, cupons, frete grátis. Atualizado agora.`
  const h1 = `${d.name}`
  const subtitle = `${countStr} com preço comparado${priceRange}`

  const faqs: GeneratedSEO['faqs'] = [
    {
      question: `Qual a melhor oferta de ${d.name}?`,
      answer: `Nossa lista de ${d.name} é ordenada por score de oferta — consideramos desconto real, histórico de preço e frete. ${d.minPrice ? `Os preços começam em ${formatBRL(d.minPrice)}.` : ''}`,
    },
    {
      question: `Onde comprar ${d.name} mais barato?`,
      answer: `Comparamos preços em ${STORES.join(', ')}. ${d.topBrands?.length ? `As marcas mais populares são ${d.topBrands.slice(0, 3).join(', ')}.` : ''}`,
    },
  ]

  return {
    title: truncate(title, 52),
    metaDescription: truncate(metaDescription, 155),
    h1,
    subtitle,
    faqs,
    internalLinks: [
      { label: `Melhores ${d.name}`, href: `/melhores/${d.slug}` },
      { label: 'Todas as categorias', href: '/categorias' },
      { label: 'Menor preço histórico', href: '/menor-preco' },
    ],
    schemaTypes: ['ItemList', 'BreadcrumbList'],
    readinessScore: [!!d.productCount, !!d.minPrice, !!d.topBrands?.length, !!d.description].filter(Boolean).length * 20 + 20,
  }
}

function generateBrandSEO(d: BrandSEOInput['data']): GeneratedSEO {
  const countStr = d.productCount ? `${d.productCount}+ produtos` : 'produtos'
  const catStr = d.categories?.length ? d.categories.slice(0, 3).join(', ') : ''

  const title = `${d.name} – Ofertas e Menor Preço`
  const metaDescription = `Encontre ${countStr} ${d.name} com preços comparados${catStr ? ` em ${catStr}` : ''}. Desconto real, histórico de 90 dias e alerta de queda de preço.`

  const faqs: GeneratedSEO['faqs'] = [
    {
      question: `Onde encontrar os melhores preços de ${d.name}?`,
      answer: `Comparamos todos os preços de ${d.name} em ${STORES.join(', ')} e mostramos o menor preço atualizado com histórico de 90 dias.`,
    },
    {
      question: `Os descontos de ${d.name} são reais?`,
      answer: `Sim — monitoramos o histórico de preços e só marcamos como desconto real se o preço atual estiver abaixo da média histórica.`,
    },
  ]

  return {
    title: truncate(title, 52),
    metaDescription: truncate(metaDescription, 155),
    h1: `${d.name}`,
    subtitle: countStr,
    faqs,
    internalLinks: [
      { label: 'Todas as marcas', href: '/marcas' },
      { label: 'Menor preço histórico', href: '/menor-preco' },
    ],
    schemaTypes: ['ItemList', 'FAQPage', 'BreadcrumbList'],
    readinessScore: [!!d.productCount, !!d.categories?.length].filter(Boolean).length * 25 + 50,
  }
}

function generateMelhoresSEO(d: MelhoresSEOInput['data']): GeneratedSEO {
  const year = CURRENT_YEAR
  const topStr = d.topProduct?.price
    ? `. Top pick: ${d.topProduct.name} por ${formatBRL(d.topProduct.price)}`
    : ''
  const countStr = d.productCount ? `${d.productCount} modelos` : 'modelos'

  const title = d.title.includes(String(year)) ? d.title : `${d.title} de ${year}`
  const metaDescription = d.description
    ? truncate(d.description, 155)
    : `${countStr} comparados com preço, desconto e custo-benefício real${topStr}. Lista atualizada para ${year}.`

  const faqs: GeneratedSEO['faqs'] = [
    {
      question: `Quais são os melhores ${d.category || 'produtos'} de ${year}?`,
      answer: `Nossa lista é baseada em score de oferta real — consideramos desconto verificado, histórico de preço e avaliações. ${d.topProduct ? `O destaque atual é ${d.topProduct.name}.` : ''}`,
    },
    {
      question: `Como escolher o melhor custo-benefício?`,
      answer: `Compare os preços históricos, verifique se o desconto é real (abaixo da média de 90 dias) e considere frete grátis no cálculo total.`,
    },
  ]

  return {
    title: truncate(title, 52),
    metaDescription,
    h1: title,
    subtitle: `${countStr} com custo-benefício avaliado`,
    faqs,
    internalLinks: [
      ...(d.category ? [{ label: `Ofertas de ${d.category}`, href: `/categoria/${d.category.toLowerCase().replace(/\s+/g, '-')}` }] : []),
      { label: 'Menor preço histórico', href: '/menor-preco' },
      { label: 'Mais vendidos', href: '/mais-vendidos' },
    ],
    schemaTypes: ['ItemList', 'FAQPage', 'BreadcrumbList'],
    readinessScore: [!!d.productCount, !!d.topProduct, !!d.category].filter(Boolean).length * 20 + 40,
  }
}

function generateComparacaoSEO(d: ComparacaoSEOInput['data']): GeneratedSEO {
  const year = CURRENT_YEAR
  const nameA = truncate(d.productA.name, 28)
  const nameB = truncate(d.productB.name, 28)

  const title = `${nameA} vs ${nameB}: Qual Comprar?`
  const priceA = d.productA.price ? formatBRL(d.productA.price) : null
  const priceB = d.productB.price ? formatBRL(d.productB.price) : null
  const priceStr = priceA && priceB ? ` (${priceA} vs ${priceB})` : ''

  const metaDescription = `Comparamos ${d.productA.name} vs ${d.productB.name} em ${year}${priceStr}: preço, descontos reais, custo-benefício e onde comprar mais barato.`

  const faqs: GeneratedSEO['faqs'] = [
    {
      question: `${d.productA.name} ou ${d.productB.name}: qual é melhor?`,
      answer: `Depende do seu uso. Comparamos preço atual, histórico e custo-benefício — veja a análise completa abaixo.`,
    },
    {
      question: `Qual tem o menor preço agora?`,
      answer: priceA && priceB
        ? `${d.productA.price! < d.productB.price! ? d.productA.name : d.productB.name} está mais barato agora (${Math.min(d.productA.price!, d.productB.price!).toFixed(2).replace('.', ',')}).`
        : `Verificamos os preços em tempo real — veja a comparação atualizada acima.`,
    },
    {
      question: `Onde comprar mais barato?`,
      answer: `Comparamos ${STORES.join(', ')}. O preço pode variar — use nosso histórico de 90 dias para escolher o melhor momento de compra.`,
    },
  ]

  return {
    title: truncate(title, 52),
    metaDescription: truncate(metaDescription, 155),
    h1: `${d.productA.name} vs ${d.productB.name}`,
    subtitle: `Comparativo de preço, custo-benefício e onde comprar em ${year}`,
    faqs,
    internalLinks: [
      ...(d.category ? [{ label: `Melhores ${d.category}`, href: `/melhores/${d.category.toLowerCase().replace(/\s+/g, '-')}` }] : []),
      { label: 'Ver mais comparativos', href: '/melhores' },
    ],
    schemaTypes: ['FAQPage', 'BreadcrumbList'],
    readinessScore: [!!d.productA.price, !!d.productB.price, !!d.category].filter(Boolean).length * 20 + 40,
  }
}

function generateValeAPenaSEO(d: ValeAPenaSEOInput['data']): GeneratedSEO {
  const year = CURRENT_YEAR
  const priceStr = d.price ? formatBRL(d.price) : null
  const discStr = d.discount && d.discount >= 5 ? `${d.discount}% de desconto` : null
  const brandStr = d.brand ? ` ${d.brand}` : ''

  const title = `${truncate(d.productName, 36)}${brandStr} Vale a Pena?`
  const metaDescription = priceStr
    ? `${d.productName}${brandStr} vale a pena${discStr ? ` com ${discStr}` : ''} em ${year}? Analisamos preço atual (${priceStr}), histórico e custo-benefício real.`
    : `${d.productName}${brandStr} vale a pena comprar em ${year}? Analisamos preço, histórico, descontos reais e custo-benefício.`

  const verdictText = d.verdict === 'yes'
    ? `Sim — o preço atual${discStr ? ` com ${discStr}` : ''} está abaixo da média histórica.`
    : d.verdict === 'no'
      ? `Não agora — o preço está acima da média dos últimos 90 dias.`
      : `Depende — veja o análise completa e o gráfico de histórico.`

  const faqs: GeneratedSEO['faqs'] = [
    {
      question: `${d.productName} vale a pena comprar?`,
      answer: verdictText,
    },
    {
      question: `Qual o melhor preço de ${d.productName}?`,
      answer: priceStr ? `O preço atual é ${priceStr}. Monitoramos o histórico e avisamos quando cair.` : `Monitoramos o histórico de preços — ative um alerta para ser notificado na queda.`,
    },
  ]

  return {
    title: truncate(title, 52),
    metaDescription: truncate(metaDescription, 155),
    h1: `${d.productName}${brandStr}: Vale a Pena Comprar em ${year}?`,
    subtitle: priceStr ? `Preço atual: ${priceStr}${discStr ? ` — ${discStr}` : ''}` : undefined,
    faqs,
    schemaTypes: ['FAQPage', 'BreadcrumbList'],
    readinessScore: [!!d.price, !!d.discount, !!d.brand, !!d.verdict].filter(Boolean).length * 20 + 20,
  }
}

function generateFaixaPrecoSEO(d: FaixaPrecоSEOInput['data']): GeneratedSEO {
  const countStr = d.productCount ? `${d.productCount} produtos` : 'produtos'
  const faixaStr = `${formatBRL(d.minPrice)} a ${formatBRL(d.maxPrice)}`

  const title = `${d.category} de ${faixaStr}`
  const metaDescription = `${countStr} em ${d.category} de ${faixaStr}. Melhor custo-benefício, preços comparados em Amazon, Mercado Livre e mais.`

  return {
    title: truncate(title, 52),
    metaDescription: truncate(metaDescription, 155),
    h1: `${d.category} de ${faixaStr}`,
    subtitle: `${countStr} nessa faixa de preço`,
    schemaTypes: ['ItemList', 'BreadcrumbList'],
    internalLinks: [
      { label: `Todos os ${d.category}`, href: `/categoria/${d.slug.split('-de-')[0]}` },
      { label: `Melhores ${d.category}`, href: `/melhores/${d.slug.split('-de-')[0]}` },
    ],
    readinessScore: !!d.productCount ? 80 : 50,
  }
}

function generateOfertasSEO(d: OfertasSEOInput['data']): GeneratedSEO {
  const countStr = d.productCount ? `${d.productCount} ofertas` : 'ofertas'
  const discStr = d.topDiscount ? ` — até ${d.topDiscount}% de desconto` : ''

  const title = `Ofertas de ${truncate(d.keyword, 36)}${discStr}`
  const metaDescription = `${countStr} de ${d.keyword}${discStr}. Descontos reais verificados, histórico de preços e frete grátis. Atualizado agora.`

  return {
    title: truncate(title, 52),
    metaDescription: truncate(metaDescription, 155),
    h1: `Ofertas de ${d.keyword}`,
    subtitle: countStr,
    schemaTypes: ['ItemList', 'BreadcrumbList'],
    internalLinks: [
      { label: `${d.keyword} mais vendidos`, href: `/busca?q=${encodeURIComponent(d.keyword)}&sort=sales` },
      { label: `Menor preço em ${d.keyword}`, href: `/busca?q=${encodeURIComponent(d.keyword)}&sort=price_asc` },
    ],
    readinessScore: !!d.productCount ? 75 : 50,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export function generatePageSEO(input: SEOInput): GeneratedSEO {
  switch (input.type) {
    case 'product':       return generateProductSEO(input.data)
    case 'category':      return generateCategorySEO(input.data)
    case 'brand':         return generateBrandSEO(input.data)
    case 'melhores':      return generateMelhoresSEO(input.data)
    case 'comparacao':    return generateComparacaoSEO(input.data)
    case 'vale-a-pena':   return generateValeAPenaSEO(input.data)
    case 'faixa-preco':   return generateFaixaPrecoSEO(input.data)
    case 'ofertas':       return generateOfertasSEO(input.data)
    case 'home':
      return {
        title: 'PromoSnap — Ofertas reais, preço de verdade',
        metaDescription: 'Compare preços na Amazon, Mercado Livre, Shopee e Shein. Histórico de 90 dias, alertas de queda e cupons. Economize com dados reais.',
        h1: 'Melhores Ofertas Agora',
        subtitle: 'Preços comparados em tempo real',
        schemaTypes: ['WebSite', 'Organization'],
        readinessScore: 100,
      }
    case 'busca':
      return {
        title: input.data.query ? `${input.data.query} – Busca de Ofertas` : 'Buscar Ofertas',
        metaDescription: input.data.query
          ? `Resultados para "${input.data.query}": compare preços em Amazon, Mercado Livre e mais.`
          : 'Busque e compare preços de milhares de produtos nas melhores lojas.',
        h1: input.data.query ? `Resultados para "${input.data.query}"` : 'Buscar Ofertas',
        schemaTypes: ['WebSite'],
        readinessScore: 30, // Search pages not meant for indexing
      }
    default:
      return {
        title: 'PromoSnap',
        metaDescription: 'Ofertas reais, preço de verdade.',
        h1: 'PromoSnap',
        readinessScore: 0,
      }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BATCH GENERATOR — for admin dashboard or content pipelines
// ─────────────────────────────────────────────────────────────────────────────

export interface BatchSEOResult {
  input: SEOInput
  output: GeneratedSEO
  /** Pages with readinessScore < threshold need improvement before indexing */
  needsImprovement: boolean
}

export function batchGenerateSEO(
  inputs: SEOInput[],
  readinessThreshold = 60
): BatchSEOResult[] {
  return inputs.map((input) => {
    const output = generatePageSEO(input)
    return {
      input,
      output,
      needsImprovement: (output.readinessScore ?? 0) < readinessThreshold,
    }
  })
}
