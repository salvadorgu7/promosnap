import { describe, it, expect, vi } from 'vitest'

// Mock catalog normalization
vi.mock('@/lib/catalog/normalize', () => ({
  normalizeTitle: (title: string) => title.trim().replace(/\s+/g, ' '),
  extractBrand: (title: string) => {
    const brands = ['Apple', 'Samsung', 'Xiaomi', 'Sony']
    for (const b of brands) {
      if (title.toLowerCase().includes(b.toLowerCase())) return b
    }
    return null
  },
  inferCategory: (title: string) => {
    if (/iphone|galaxy|celular/i.test(title)) return 'celulares'
    if (/notebook|laptop/i.test(title)) return 'notebooks'
    return null
  },
}))

// Mock affiliate
vi.mock('@/lib/affiliate', () => ({
  buildAffiliateUrl: (url: string) => {
    if (url.includes('amazon.com.br')) return url + '?tag=test-20'
    return url
  },
  hasAffiliateTag: (url: string) => url.includes('tag='),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { child: () => ({ info: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}))

// Mock serpapi connector to avoid side-effect import issues
vi.mock('@/lib/ai/connectors/serpapi-shopping', () => ({
  serpApiShoppingConnector: { name: 'Google Shopping', slug: 'google-shopping', isReady: () => false, search: async () => [] },
}))

const { resolveCandidate, resolveCandidates, candidateToAssistantProduct } = await import('../candidate-resolver')

describe('resolveCandidate', () => {
  it('detects Amazon source from URL', () => {
    const result = resolveCandidate({
      rawTitle: 'Apple iPhone 15 128GB',
      externalUrl: 'https://www.amazon.com.br/dp/B0CHX1W1XY',
      price: 4999,
      sourceDomain: 'amazon.com.br',
    })
    expect(result.monetization).toBe('verified')
    expect(result.affiliateUrl).toContain('tag=test-20')
  })

  it('detects Mercado Livre source from URL', () => {
    const result = resolveCandidate({
      rawTitle: 'Samsung Galaxy S24 Ultra',
      externalUrl: 'https://produto.mercadolivre.com.br/MLB-123456',
      price: 5999,
      sourceDomain: 'mercadolivre.com.br',
    })
    expect(result.status).toBe('partially_resolved')
    expect(result.brand).toBe('Samsung')
    expect(result.categoryGuess).toBe('celulares')
  })

  it('detects Shopee source from URL', () => {
    const result = resolveCandidate({
      rawTitle: 'Xiaomi Notebook Pro 14',
      externalUrl: 'https://shopee.com.br/product/123.456',
      price: 3500,
      sourceDomain: 'shopee.com.br',
    })
    expect(result.brand).toBe('Xiaomi')
    expect(result.categoryGuess).toBe('notebooks')
  })

  it('returns best_effort monetization for unknown domains', () => {
    const result = resolveCandidate({
      rawTitle: 'Produto generico de teste completo',
      externalUrl: 'https://example.com/product/123',
      price: 100,
      sourceDomain: 'example.com',
    })
    expect(result.monetization).toBe('none')
  })

  it('rejects low quality candidates with short titles', () => {
    const result = resolveCandidate({
      rawTitle: 'Ab',
      externalUrl: 'https://example.com/x',
      sourceDomain: 'example.com',
    })
    expect(result.status).toBe('rejected_low_quality')
    expect(result.matchConfidence).toBe(0)
  })

  it('generates deterministic fingerprint', () => {
    const a = resolveCandidate({
      rawTitle: 'Apple iPhone 15 128GB',
      externalUrl: 'https://amazon.com.br/dp/123',
      price: 4999,
      sourceDomain: 'amazon.com.br',
    })
    const b = resolveCandidate({
      rawTitle: 'Apple iPhone 15 128GB',
      externalUrl: 'https://amazon.com.br/dp/456',
      price: 5100,
      sourceDomain: 'amazon.com.br',
    })
    expect(a.fingerprint).toBe(b.fingerprint)
  })
})

describe('resolveCandidates', () => {
  it('deduplicates by fingerprint', () => {
    const results = resolveCandidates([
      { rawTitle: 'Apple iPhone 15 128GB', externalUrl: 'https://amazon.com.br/dp/123', price: 4999, sourceDomain: 'amazon.com.br' },
      { rawTitle: 'Apple iPhone 15 128GB', externalUrl: 'https://amazon.com.br/dp/456', price: 5100, sourceDomain: 'amazon.com.br' },
    ])
    expect(results.length).toBe(1)
  })

  it('filters rejected candidates', () => {
    const results = resolveCandidates([
      { rawTitle: 'Apple iPhone 15 128GB', externalUrl: 'https://amazon.com.br/dp/123', price: 4999, sourceDomain: 'amazon.com.br' },
      { rawTitle: 'X', externalUrl: 'https://example.com/x', sourceDomain: 'example.com' },
    ])
    expect(results.length).toBe(1)
  })

  it('sorts resolved first, then by confidence', () => {
    const results = resolveCandidates([
      { rawTitle: 'Produto generico sem marca definida aqui', externalUrl: 'https://example.com/a', price: 100, sourceDomain: 'example.com', imageUrl: 'img.jpg' },
      { rawTitle: 'Apple iPhone 15 128GB', externalUrl: 'https://amazon.com.br/dp/123', price: 4999, sourceDomain: 'amazon.com.br' },
    ])
    expect(results[0].brand).toBe('Apple')
    expect(results[0].matchConfidence).toBeGreaterThan(results[1].matchConfidence)
  })
})

describe('candidateToAssistantProduct', () => {
  it('generates ML search fallback URL for non-monetizable candidates', () => {
    const resolved = resolveCandidate({
      rawTitle: 'Produto generico sem marca definida aqui',
      externalUrl: 'https://example.com/product',
      price: 100,
      sourceDomain: 'example.com',
      imageUrl: 'img.jpg',
    })
    const product = candidateToAssistantProduct(resolved)
    expect(product.affiliateUrl).toContain('lista.mercadolivre.com.br')
    expect(product.monetization).toBe('best_effort')
    expect(product.isFromCatalog).toBe(false)
  })
})
