import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { child: () => ({ info: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}))

// Mock affiliate
vi.mock('@/lib/affiliate', () => ({
  buildAffiliateUrl: (url: string) => url,
}))

// Mock search engine
const mockSearchProducts = vi.fn()
vi.mock('@/lib/search/engine', () => ({
  searchProducts: (...args: any[]) => mockSearchProducts(...args),
}))

// Mock candidate-resolver
vi.mock('@/lib/ai/candidate-resolver', () => ({
  connectorRegistry: {
    get: () => null,
  },
  resolveCandidates: vi.fn(() => []),
  candidateToAssistantProduct: vi.fn(),
}))

// Mock import pipeline
vi.mock('@/lib/import/pipeline', () => ({
  runImportPipeline: vi.fn(() => ({ created: 0, updated: 0, failed: 0 })),
}))

// Mock comparison
vi.mock('@/lib/comparison/category-specs', () => ({
  getCategoryConfig: vi.fn(),
  rankByUseCase: vi.fn(),
}))

// Store original fetch
const originalFetch = globalThis.fetch

describe('shopping-assistant', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    mockSearchProducts.mockReset()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe('isAIConfigured', () => {
    it('returns false without OPENAI_API_KEY', async () => {
      vi.stubEnv('OPENAI_API_KEY', '')
      const mod = await import('../shopping-assistant')
      expect(mod.isAIConfigured()).toBe(false)
    })

    it('returns true with OPENAI_API_KEY', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'sk-test-123')
      const mod = await import('../shopping-assistant')
      expect(mod.isAIConfigured()).toBe(true)
    })
  })

  describe('processShoppingQuery', () => {
    it('returns error message without API key', async () => {
      vi.stubEnv('OPENAI_API_KEY', '')
      const { processShoppingQuery } = await import('../shopping-assistant')
      const result = await processShoppingQuery('melhor celular')
      expect(result.message).toContain('não está configurado')
      expect(result.dataSources).toEqual([])
    })

    it('returns products from local catalog', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'sk-test-123')
      mockSearchProducts.mockResolvedValue({
        products: [{
          name: 'iPhone 15',
          slug: 'iphone-15',
          imageUrl: 'img.jpg',
          bestOffer: { price: 4999, originalPrice: 5999, discount: 17, sourceName: 'Amazon', affiliateUrl: 'https://amazon.com.br/test' },
        }],
      })

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Encontrei o iPhone 15.' } }],
        }),
      })

      const { processShoppingQuery } = await import('../shopping-assistant')
      const result = await processShoppingQuery('iphone 15')
      expect(result.products).toBeDefined()
      expect(result.products!.length).toBeGreaterThanOrEqual(1)
      expect(result.products![0].isFromCatalog).toBe(true)
      expect(result.dataSources).toContain('catalog')
    })

    it('handles empty results gracefully', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'sk-test-123')
      mockSearchProducts.mockResolvedValue({ products: [] })

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Nenhum resultado encontrado.' } }],
        }),
      })

      const { processShoppingQuery } = await import('../shopping-assistant')
      const result = await processShoppingQuery('produto inexistente xyz')
      expect(result.message).toBeTruthy()
    })

    it('handles OpenAI API error gracefully', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'sk-test-123')
      mockSearchProducts.mockResolvedValue({ products: [] })

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      })

      const { processShoppingQuery } = await import('../shopping-assistant')
      const result = await processShoppingQuery('celular')
      expect(result.message).toBeTruthy()
      expect(result.meta.durationMs).toBeGreaterThanOrEqual(0)
    })

    it('handles fetch timeout', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'sk-test-123')
      mockSearchProducts.mockResolvedValue({ products: [] })

      globalThis.fetch = vi.fn().mockRejectedValue(new Error('AbortError'))

      const { processShoppingQuery } = await import('../shopping-assistant')
      const result = await processShoppingQuery('notebook')
      expect(result.message).toContain('erro')
    })

    it('tracks dataSources correctly with catalog only', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'sk-test-123')
      mockSearchProducts.mockResolvedValue({
        products: [{
          name: 'Test Product',
          slug: 'test',
          imageUrl: 'img.jpg',
          bestOffer: { price: 100, sourceName: 'Amazon', affiliateUrl: '#' },
        }],
      })

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Resultado.' } }],
        }),
      })

      const { processShoppingQuery } = await import('../shopping-assistant')
      const result = await processShoppingQuery('test')
      expect(result.dataSources).toContain('catalog')
      expect(result.meta.toolsUsed).toContain('searchLocalCatalog')
    })

    it('tracks toolsUsed in meta', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'sk-test-123')
      mockSearchProducts.mockResolvedValue({ products: [] })

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Nada encontrado.' } }],
        }),
      })

      const { processShoppingQuery } = await import('../shopping-assistant')
      const result = await processShoppingQuery('test')
      expect(result.meta.toolsUsed).toContain('searchLocalCatalog')
    })

    it('marks catalog products with isFromCatalog true', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'sk-test-123')
      mockSearchProducts.mockResolvedValue({
        products: [{
          name: 'Produto Local',
          slug: 'produto-local',
          bestOffer: { price: 50, sourceName: 'ML', affiliateUrl: 'https://ml.com/test' },
        }],
      })

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Achei.' } }],
        }),
      })

      const { processShoppingQuery } = await import('../shopping-assistant')
      const result = await processShoppingQuery('produto local')
      const catalogProducts = result.products?.filter(p => p.isFromCatalog) || []
      expect(catalogProducts.length).toBeGreaterThan(0)
    })

    it('returns durationMs in meta', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'sk-test-123')
      mockSearchProducts.mockResolvedValue({ products: [] })

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Ok.' } }],
        }),
      })

      const { processShoppingQuery } = await import('../shopping-assistant')
      const result = await processShoppingQuery('test')
      expect(result.meta.durationMs).toBeGreaterThanOrEqual(0)
    })

    it('sets webUsed false when no shopping results', async () => {
      vi.stubEnv('OPENAI_API_KEY', 'sk-test-123')
      mockSearchProducts.mockResolvedValue({ products: [] })

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Ok.' } }],
        }),
      })

      const { processShoppingQuery } = await import('../shopping-assistant')
      const result = await processShoppingQuery('test')
      expect(result.meta.webUsed).toBe(false)
    })
  })
})
