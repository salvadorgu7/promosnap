/**
 * Tests for Busca Ampliada subsystem.
 *
 * Covers:
 * - Coverage evaluator
 * - Quality gates
 * - Hybrid ranker
 * - Expansion orchestrator decisions
 */

import { describe, it, expect } from 'vitest'
import { evaluateCoverage } from '@/lib/search/expanded/coverage-evaluator'
import { applyQualityGates, assessQuality, isHighPositionWorthy } from '@/lib/search/expanded/quality-gates'
import { rankHybrid } from '@/lib/search/expanded/hybrid-ranker'
import { decideExpansion } from '@/lib/search/expanded/expansion-orchestrator'
import type { ProductCard } from '@/types'
import type { QueryUnderstanding } from '@/lib/query/types'
import type { ResolvedCandidate } from '@/lib/ai/candidate-resolver'
import type { UnifiedResult, CoverageEvaluation } from '@/lib/search/expanded/types'

// ── Factories ────────────────────────────────────────────────────────────────

function makeProductCard(overrides: Partial<ProductCard> = {}): ProductCard {
  return {
    id: 'prod-1',
    name: 'Samsung Galaxy S24 Ultra 256GB',
    slug: 'samsung-galaxy-s24-ultra',
    imageUrl: '/img/samsung.jpg',
    brand: 'Samsung',
    category: 'Celulares',
    categorySlug: 'celulares',
    popularityScore: 80,
    bestOffer: {
      offerId: 'offer-1',
      price: 5999,
      originalPrice: 7499,
      discount: 20,
      sourceName: 'Amazon',
      sourceSlug: 'amazon-br',
      offerScore: 75,
      isFreeShipping: true,
      affiliateUrl: 'https://amazon.com.br/dp/X?tag=promosnap-20',
    },
    ...overrides,
  } as ProductCard
}

function makeUnderstanding(overrides: Partial<QueryUnderstanding> = {}): QueryUnderstanding {
  return {
    raw: 'celular samsung',
    normalized: 'celular samsung',
    intent: 'product',
    confidence: 'high',
    entities: [{ type: 'brand', value: 'Samsung', original: 'samsung', confidence: 'high' }],
    expansions: [],
    suggestions: [],
    fallbackUsed: false,
    processingMs: 5,
    ...overrides,
  }
}

function makeResolvedCandidate(overrides: Partial<ResolvedCandidate> = {}): ResolvedCandidate {
  return {
    normalizedTitle: 'Samsung Galaxy S24 Ultra 256GB Preto',
    brand: 'Samsung',
    categoryGuess: 'celulares',
    externalUrl: 'https://amazon.com.br/dp/XYZ',
    affiliateUrl: 'https://amazon.com.br/dp/XYZ?tag=promosnap-20',
    price: 5499,
    originalPrice: 6999,
    imageUrl: 'https://images-na.ssl-images-amazon.com/XYZ.jpg',
    sourceDomain: 'amazon.com.br',
    merchant: 'Amazon Brasil',
    status: 'partially_resolved',
    matchConfidence: 0.7,
    monetization: 'verified',
    fingerprint: 'amazon-br:samsunggalaxys24ultra256gbpreto',
    ...overrides,
  }
}

function makeUnifiedResult(overrides: Partial<UnifiedResult> = {}): UnifiedResult {
  return {
    id: 'test-1',
    title: 'Test Product',
    price: 1000,
    imageUrl: '/img/test.jpg',
    href: '/produto/test',
    affiliateUrl: '/api/clickout/test',
    sourceType: 'internal',
    marketplace: 'amazon-br',
    storeName: 'Amazon',
    affiliateStatus: 'verified',
    qualityScore: 70,
    relevanceScore: 60,
    confidenceScore: 1.0,
    isMonetizable: true,
    fingerprint: 'internal:test-1',
    ...overrides,
  }
}

// ── Coverage Evaluator Tests ─────────────────────────────────────────────────

describe('Coverage Evaluator', () => {
  it('returns high coverage for 5+ good internal results', () => {
    const cards = Array.from({ length: 6 }, (_, i) =>
      makeProductCard({ id: `p${i}`, slug: `prod-${i}` })
    )
    const understanding = makeUnderstanding({ intent: 'category' })
    const result = evaluateCoverage(cards, understanding, {})

    expect(result.coverageScore).toBeGreaterThanOrEqual(70)
    expect(result.shouldExpand).toBe(false)
    expect(result.expansionLevel).toBe('none')
  })

  it('returns low coverage for zero results', () => {
    const result = evaluateCoverage([], makeUnderstanding(), {})

    expect(result.coverageScore).toBeLessThan(30)
    expect(result.shouldExpand).toBe(true)
    expect(result.expansionLevel).toBe('aggressive')
    expect(result.reasons).toContain('zero resultados internos')
  })

  it('considers budget adherence', () => {
    const cards = [
      makeProductCard({ id: 'p1', bestOffer: { ...makeProductCard().bestOffer, price: 8000 } }),
      makeProductCard({ id: 'p2', bestOffer: { ...makeProductCard().bestOffer, price: 9000 } }),
    ]
    const result = evaluateCoverage(cards, makeUnderstanding(), { maxPrice: 5000 })

    expect(result.reasons.some(r => r.includes('orçamento'))).toBe(true)
  })

  it('does not expand for specific product with good match', () => {
    const cards = [makeProductCard()]
    const understanding = makeUnderstanding({ intent: 'product' })
    const result = evaluateCoverage(cards, understanding, {})

    expect(result.shouldExpand).toBe(false)
    expect(result.reasons.some(r => r.includes('produto específico'))).toBe(true)
  })

  it('penalizes single-source results', () => {
    const cards = Array.from({ length: 3 }, (_, i) =>
      makeProductCard({ id: `p${i}`, slug: `prod-${i}` })
    )
    const result = evaluateCoverage(cards, makeUnderstanding({ intent: 'category' }), {})

    expect(result.diversityScore).toBeLessThanOrEqual(4) // All from same source
    expect(result.reasons.some(r => r.includes('única loja'))).toBe(true)
  })

  it('penalizes results without affiliate URLs', () => {
    const cards = [
      makeProductCard({
        id: 'p1',
        bestOffer: { ...makeProductCard().bestOffer, affiliateUrl: '#' },
      }),
    ]
    const result = evaluateCoverage(cards, makeUnderstanding(), {})

    expect(result.monetizationScore).toBe(0)
    expect(result.reasons.some(r => r.includes('monetização'))).toBe(true)
  })
})

// ── Quality Gates Tests ──────────────────────────────────────────────────────

describe('Quality Gates', () => {
  it('passes high-quality candidate', () => {
    const candidate = makeResolvedCandidate()
    const assessment = assessQuality(candidate)

    expect(assessment.passesGate).toBe(true)
    expect(assessment.quality).toBe('high')
    expect(assessment.qualityScore).toBeGreaterThanOrEqual(70)
  })

  it('penalizes candidate with very short title', () => {
    const goodCandidate = makeResolvedCandidate()
    const shortCandidate = makeResolvedCandidate({ normalizedTitle: 'abc' })

    const goodScore = assessQuality(goodCandidate).qualityScore
    const shortScore = assessQuality(shortCandidate).qualityScore

    // Short title should score lower than a good title
    expect(shortScore).toBeLessThan(goodScore)
  })

  it('rejects candidate with suspicious price', () => {
    const candidate = makeResolvedCandidate({ price: 1 })
    const assessment = assessQuality(candidate)

    expect(assessment.reasons).toContain('preço suspeito (< R$5)')
  })

  it('penalizes candidate without image', () => {
    const candidate = makeResolvedCandidate({ imageUrl: undefined })
    const assessment = assessQuality(candidate)

    expect(assessment.reasons).toContain('sem imagem')
    expect(assessment.qualityScore).toBeLessThan(
      assessQuality(makeResolvedCandidate()).qualityScore
    )
  })

  it('penalizes suspicious discount (>85%)', () => {
    const candidate = makeResolvedCandidate({
      price: 100,
      originalPrice: 1000, // 90% discount
    })
    const assessment = assessQuality(candidate)

    expect(assessment.reasons).toContain('desconto suspeito (> 85%)')
  })

  it('penalizes unknown source', () => {
    const candidate = makeResolvedCandidate({ sourceDomain: 'unknown-store.xyz' })
    const assessment = assessQuality(candidate)

    expect(assessment.reasons).toContain('fonte não-prioritária')
  })

  it('penalizes no monetization', () => {
    const candidate = makeResolvedCandidate({ monetization: 'none' })
    const assessment = assessQuality(candidate)

    expect(assessment.reasons).toContain('sem monetização')
  })

  it('filters batch and sorts by quality', () => {
    const candidates = [
      makeResolvedCandidate({ normalizedTitle: 'ab', price: 0 }), // Should be filtered
      makeResolvedCandidate({ normalizedTitle: 'Good Product With Full Title' }), // Should pass
      makeResolvedCandidate({ normalizedTitle: 'Another Good Product Here', imageUrl: undefined }), // Lower quality
    ]
    const results = applyQualityGates(candidates)

    expect(results.length).toBeGreaterThanOrEqual(1)
    // First result should have highest quality
    if (results.length >= 2) {
      expect(results[0].qualityScore).toBeGreaterThanOrEqual(results[1].qualityScore)
    }
  })

  it('isHighPositionWorthy requires image + price + monetizable', () => {
    const goodAssessment = assessQuality(makeResolvedCandidate())
    expect(isHighPositionWorthy(goodAssessment)).toBe(true)

    const noImageAssessment = assessQuality(makeResolvedCandidate({ imageUrl: undefined }))
    expect(isHighPositionWorthy(noImageAssessment)).toBe(false)
  })
})

// ── Hybrid Ranker Tests ──────────────────────────────────────────────────────

describe('Hybrid Ranker', () => {
  it('ranks internal above external when coverage is good', () => {
    const internal = [makeUnifiedResult({ id: 'int-1', sourceType: 'internal', qualityScore: 70 })]
    const external = [makeUnifiedResult({ id: 'ext-1', sourceType: 'expanded', qualityScore: 70 })]
    const coverage: CoverageEvaluation = {
      coverageScore: 80, relevanceScore: 60, monetizationScore: 15,
      diversityScore: 10, qualityCount: 1, totalCount: 1,
      shouldExpand: false, expansionLevel: 'none', reasons: [],
    }

    const { blended, policy } = rankHybrid(internal, external, coverage)

    expect(policy).toBe('internal_dominant')
    expect(blended[0].sourceType).toBe('internal')
  })

  it('uses hybrid_balanced when coverage is weak', () => {
    const internal = [makeUnifiedResult({ id: 'int-1', sourceType: 'internal', qualityScore: 40 })]
    const external = [makeUnifiedResult({ id: 'ext-1', sourceType: 'expanded', qualityScore: 80, isMonetizable: true })]
    const coverage: CoverageEvaluation = {
      coverageScore: 35, relevanceScore: 20, monetizationScore: 5,
      diversityScore: 3, qualityCount: 0, totalCount: 1,
      shouldExpand: true, expansionLevel: 'moderate', reasons: [],
    }

    const { blended, policy } = rankHybrid(internal, external, coverage)

    expect(policy).toBe('hybrid_balanced')
    expect(blended.length).toBe(2)
  })

  it('uses external_dominant when zero internal results', () => {
    const external = [
      makeUnifiedResult({ id: 'ext-1', sourceType: 'expanded', qualityScore: 80 }),
      makeUnifiedResult({ id: 'ext-2', sourceType: 'expanded', qualityScore: 60, marketplace: 'shopee' }),
    ]
    const coverage: CoverageEvaluation = {
      coverageScore: 0, relevanceScore: 0, monetizationScore: 0,
      diversityScore: 0, qualityCount: 0, totalCount: 0,
      shouldExpand: true, expansionLevel: 'aggressive', reasons: [],
    }

    const { blended, policy } = rankHybrid([], external, coverage)

    expect(policy).toBe('external_dominant')
    expect(blended.length).toBe(2)
  })

  it('enforces diversity — interleaves different marketplaces in top positions', () => {
    const results = Array.from({ length: 5 }, (_, i) =>
      makeUnifiedResult({
        id: `ext-${i}`,
        sourceType: 'expanded',
        marketplace: 'amazon-br',
        qualityScore: 90 - i,
      })
    )
    results.push(makeUnifiedResult({ id: 'ext-ml', sourceType: 'expanded', marketplace: 'mercadolivre', qualityScore: 50 }))

    const coverage: CoverageEvaluation = {
      coverageScore: 0, relevanceScore: 0, monetizationScore: 0,
      diversityScore: 0, qualityCount: 0, totalCount: 0,
      shouldExpand: true, expansionLevel: 'aggressive', reasons: [],
    }

    const { blended } = rankHybrid([], results, coverage)

    // ML result should appear in top 6 (diversity forces it up)
    const mlIndex = blended.findIndex(r => r.marketplace === 'mercadolivre')
    expect(mlIndex).toBeGreaterThanOrEqual(0)
    expect(mlIndex).toBeLessThan(6)
    expect(blended.length).toBe(6)
  })

  it('puts results with image+price+affiliate in premium positions', () => {
    const premiumResult = makeUnifiedResult({ id: 'int-2', sourceType: 'internal', isMonetizable: true, imageUrl: '/img.jpg', qualityScore: 60 })
    const standardResult = makeUnifiedResult({ id: 'int-1', sourceType: 'internal', isMonetizable: false, imageUrl: undefined, qualityScore: 60 })

    const coverage: CoverageEvaluation = {
      coverageScore: 80, relevanceScore: 60, monetizationScore: 15,
      diversityScore: 10, qualityCount: 1, totalCount: 2,
      shouldExpand: false, expansionLevel: 'none', reasons: [],
    }

    const { blended } = rankHybrid([standardResult, premiumResult], [], coverage)

    // Premium (monetizable + image) should be before standard (no image)
    const premiumIdx = blended.findIndex(r => r.id === 'int-2')
    const standardIdx = blended.findIndex(r => r.id === 'int-1')
    expect(premiumIdx).toBeLessThan(standardIdx)
  })
})

// ── Expansion Orchestrator Tests ─────────────────────────────────────────────

describe('Expansion Orchestrator', () => {
  it('does not expand when coverage is sufficient', () => {
    const coverage: CoverageEvaluation = {
      coverageScore: 80, relevanceScore: 60, monetizationScore: 15,
      diversityScore: 10, qualityCount: 5, totalCount: 6,
      shouldExpand: false, expansionLevel: 'none', reasons: [],
    }

    const decision = decideExpansion(coverage, makeUnderstanding(), {})

    expect(decision.expand).toBe(false)
    expect(decision.connectors).toHaveLength(0)
  })

  it('expands when coverage is low', () => {
    const coverage: CoverageEvaluation = {
      coverageScore: 20, relevanceScore: 10, monetizationScore: 0,
      diversityScore: 0, qualityCount: 0, totalCount: 0,
      shouldExpand: true, expansionLevel: 'aggressive', reasons: [],
    }

    const decision = decideExpansion(coverage, makeUnderstanding(), {})

    expect(decision.expand).toBe(true)
    // Note: connectors.length may be 0 in test env (no env vars configured)
    // but the decision itself should be to expand
    expect(decision.timeoutMs).toBeGreaterThan(0)
  })

  it('respects force expand', () => {
    const coverage: CoverageEvaluation = {
      coverageScore: 90, relevanceScore: 60, monetizationScore: 15,
      diversityScore: 10, qualityCount: 5, totalCount: 6,
      shouldExpand: false, expansionLevel: 'none', reasons: [],
    }

    const decision = decideExpansion(coverage, makeUnderstanding(), { forceExpand: true })

    expect(decision.expand).toBe(true)
    expect(decision.reason).toContain('force_expand')
  })

  it('extracts budget from query understanding', () => {
    const understanding = makeUnderstanding({
      raw: 'celular samsung até 3000',
    })
    const coverage: CoverageEvaluation = {
      coverageScore: 20, relevanceScore: 10, monetizationScore: 0,
      diversityScore: 0, qualityCount: 0, totalCount: 0,
      shouldExpand: true, expansionLevel: 'aggressive', reasons: [],
    }

    const decision = decideExpansion(coverage, understanding, {})

    expect(decision.maxPrice).toBe(3000)
  })

  it('limits connectors for light expansion', () => {
    const coverage: CoverageEvaluation = {
      coverageScore: 55, relevanceScore: 40, monetizationScore: 5,
      diversityScore: 5, qualityCount: 2, totalCount: 3,
      shouldExpand: true, expansionLevel: 'light', reasons: [],
    }

    const decision = decideExpansion(coverage, makeUnderstanding(), {})

    expect(decision.expand).toBe(true)
    expect(decision.limitPerConnector).toBeLessThanOrEqual(4)
    expect(decision.timeoutMs).toBeLessThanOrEqual(5000)
  })
})
