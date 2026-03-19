import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { child: () => ({ info: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}))

// Mock candidate-resolver types
vi.mock('@/lib/ai/candidate-resolver', () => ({
  // Just need the type exports to be available
}))

const originalFetch = globalThis.fetch

describe('serpApiShoppingConnector', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('isReady returns false without SERPAPI_KEY', async () => {
    vi.stubEnv('SERPAPI_KEY', '')
    const { serpApiShoppingConnector } = await import('../serpapi-shopping')
    expect(serpApiShoppingConnector.isReady()).toBe(false)
  })

  it('isReady returns true with SERPAPI_KEY', async () => {
    vi.stubEnv('SERPAPI_KEY', 'test-key-123')
    const { serpApiShoppingConnector } = await import('../serpapi-shopping')
    expect(serpApiShoppingConnector.isReady()).toBe(true)
  })

  it('search returns empty array without API key', async () => {
    vi.stubEnv('SERPAPI_KEY', '')
    const { serpApiShoppingConnector } = await import('../serpapi-shopping')
    const results = await serpApiShoppingConnector.search('iPhone 15')
    expect(results).toEqual([])
  })

  it('maps SerpApi response format to ExternalCandidate', async () => {
    vi.stubEnv('SERPAPI_KEY', 'test-key-123')

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        shopping_results: [
          {
            title: 'Apple iPhone 15 128GB Preto',
            extracted_price: 4299,
            product_link: 'https://www.amazon.com.br/dp/B0CHX1W1XY',
            thumbnail: 'https://img.test/iphone.jpg',
            source: 'Amazon Brasil',
          },
          {
            title: 'Samsung Galaxy S24 256GB',
            price: 'R$ 3.999,00',
            link: 'https://produto.mercadolivre.com.br/MLB-123',
            thumbnail: 'https://img.test/galaxy.jpg',
            source: 'Mercado Livre',
          },
        ],
        search_metadata: { id: 'test-123' },
      }),
    })

    const { serpApiShoppingConnector } = await import('../serpapi-shopping')
    const results = await serpApiShoppingConnector.search('celular', { limit: 5 })

    expect(results.length).toBe(2)
    expect(results[0].rawTitle).toBe('Apple iPhone 15 128GB Preto')
    expect(results[0].price).toBe(4299)
    expect(results[0].externalUrl).toContain('amazon.com.br')
    expect(results[1].rawTitle).toBe('Samsung Galaxy S24 256GB')
  })

  it('handles API error gracefully', async () => {
    vi.stubEnv('SERPAPI_KEY', 'test-key-123')

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
    })

    const { serpApiShoppingConnector } = await import('../serpapi-shopping')
    const results = await serpApiShoppingConnector.search('test')
    expect(results).toEqual([])
  })
})
