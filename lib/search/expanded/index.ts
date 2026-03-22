/**
 * Busca Ampliada — Main Pipeline
 *
 * Orquestra o fluxo completo:
 * 1. Busca interna (via search/engine.ts existente)
 * 2. Avaliação de cobertura
 * 3. Decisão de expansão
 * 4. Execução de conectores externos
 * 5. Normalização + resolução de candidatos
 * 6. Quality gates
 * 7. Garantia de integridade afiliada
 * 8. Ranking híbrido
 * 9. Resposta unificada
 *
 * Feature flag: FF_EXPANDED_SEARCH (default: false)
 * Backwards-compatible: if disabled, returns internal-only results.
 */

import { searchProducts, type EnhancedSearchResult } from '@/lib/search/engine'
import { understandQuery } from '@/lib/query'
import { resolveCandidates, type ExternalCandidate } from '@/lib/ai/candidate-resolver'
import { buildAffiliateUrl, hasAffiliateTag } from '@/lib/affiliate'
import { buildClickoutUrl } from '@/lib/clickout/build-url'
import { logger } from '@/lib/logger'

import { evaluateCoverage } from './coverage-evaluator'
import { decideExpansion, executeExpansion, type ConnectorResult } from './expansion-orchestrator'
import { applyQualityGates } from './quality-gates'
import { rankHybrid } from './hybrid-ranker'
import { getCategoryProfile, getCategoryFraming } from './category-personalization'

import type {
  ExpandedSearchParams,
  ExpandedSearchResponse,
  UnifiedResult,
  MarketplaceKey,
  PipelineStage,
  ExpansionTrace,
} from './types'
import type { ProductCard } from '@/types'

const log = logger.child({ module: 'expanded-search' })

// ── Feature Flag ─────────────────────────────────────────────────────────────
// Uses getFlag() which supports percentage-based rollout via envRollout()
// e.g. FF_EXPANDED_SEARCH=50 → enabled 50% of the time

import { getFlag } from '@/lib/config/feature-flags'

function isExpandedSearchEnabled(): boolean {
  return getFlag('expandedSearch')
}

// ── Internal → UnifiedResult Converter ───────────────────────────────────────

function internalToUnified(card: ProductCard): UnifiedResult {
  const discount = card.bestOffer.originalPrice && card.bestOffer.originalPrice > card.bestOffer.price
    ? Math.round((1 - card.bestOffer.price / card.bestOffer.originalPrice) * 100)
    : undefined

  return {
    id: card.id,
    title: card.name,
    price: card.bestOffer.price,
    originalPrice: card.bestOffer.originalPrice,
    discount,
    imageUrl: card.imageUrl,
    href: `/produto/${card.slug}`,
    affiliateUrl: buildClickoutUrl({
      offerId: card.bestOffer.offerId,
      page: 'search',
      block: 'search-results',
    }),
    sourceType: 'internal',
    marketplace: (card.bestOffer.sourceSlug || 'unknown') as MarketplaceKey,
    storeName: card.bestOffer.sourceName,
    brand: card.brand || undefined,
    categoryGuess: card.categorySlug || undefined,
    affiliateStatus: card.bestOffer.affiliateUrl && card.bestOffer.affiliateUrl !== '#'
      ? 'verified' : 'none',
    qualityScore: computeInternalQuality(card),
    relevanceScore: card.bestOffer.offerScore || 50,
    confidenceScore: 1.0, // Internal = max confidence
    isMonetizable: card.bestOffer.affiliateUrl !== '#' && !!card.bestOffer.affiliateUrl,
    isFreeShipping: card.bestOffer.isFreeShipping,
    offerScore: card.bestOffer.offerScore,
    localProductSlug: card.slug,
    fingerprint: `internal:${card.id}`,
  }
}

function computeInternalQuality(card: ProductCard): number {
  let score = 40 // Base score for being in catalog
  if (card.imageUrl) score += 15
  if (card.bestOffer.affiliateUrl && card.bestOffer.affiliateUrl !== '#') score += 15
  if (card.bestOffer.offerScore >= 50) score += 10
  if (card.bestOffer.offerScore >= 70) score += 10
  if (card.bestOffer.isFreeShipping) score += 5
  if (card.brand) score += 5
  return Math.min(100, score)
}

// ── External → UnifiedResult Converter ───────────────────────────────────────

function externalToUnified(
  candidate: ReturnType<typeof applyQualityGates>[0],
  connector: string,
): UnifiedResult {
  const c = candidate.candidate
  const discount = c.originalPrice && c.price && c.originalPrice > c.price
    ? Math.round((1 - c.price / c.originalPrice) * 100)
    : undefined

  // Ensure affiliate URL is set
  let affiliateUrl = c.affiliateUrl
  if (!hasAffiliateTag(affiliateUrl)) {
    affiliateUrl = buildAffiliateUrl(c.externalUrl)
  }

  const marketplace = detectMarketplace(c.sourceDomain)

  return {
    id: `ext:${c.fingerprint}`,
    title: c.normalizedTitle,
    price: c.price || 0,
    originalPrice: c.originalPrice,
    discount,
    imageUrl: c.imageUrl,
    href: affiliateUrl, // External results link directly to affiliate
    affiliateUrl,
    sourceType: 'expanded',
    marketplace,
    storeName: c.merchant || c.sourceDomain,
    brand: c.brand || undefined,
    categoryGuess: c.categoryGuess || undefined,
    affiliateStatus: c.monetization === 'verified' ? 'verified'
      : c.monetization === 'best_effort' ? 'best_effort' : 'none',
    qualityScore: candidate.qualityScore,
    relevanceScore: Math.round(c.matchConfidence * 80),
    confidenceScore: c.matchConfidence,
    isMonetizable: c.monetization !== 'none',
    sourceConnector: connector,
    localProductSlug: c.localProductSlug,
    fingerprint: c.fingerprint,
  }
}

function detectMarketplace(domain: string): MarketplaceKey {
  const mapping: Record<string, MarketplaceKey> = {
    'amazon.com.br': 'amazon-br',
    'mercadolivre.com.br': 'mercadolivre',
    'shopee.com.br': 'shopee',
    'shein.com': 'shein',
    'magazineluiza.com.br': 'magalu',
    'magalu.com': 'magalu',
    'kabum.com.br': 'kabum',
    'casasbahia.com.br': 'casasbahia',
    'americanas.com.br': 'americanas',
    'carrefour.com.br': 'carrefour',
  }
  for (const [d, mp] of Object.entries(mapping)) {
    if (domain.includes(d)) return mp
  }
  return 'unknown'
}

// ── Dedup Internal vs External ───────────────────────────────────────────────

/** Remove expanded results that already exist in internal results */
function deduplicateAgainstInternal(
  expandedResults: UnifiedResult[],
  internalResults: UnifiedResult[],
): UnifiedResult[] {
  // Build fingerprint set from internal titles (simplified for matching)
  const internalFingerprints = new Set(
    internalResults.map(r => r.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40))
  )

  return expandedResults.filter(ext => {
    const extFp = ext.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40)
    // Check for significant overlap (>80% char match)
    for (const intFp of internalFingerprints) {
      if (extFp === intFp) return false
      if (extFp.length > 10 && intFp.length > 10) {
        // Simple substring check for similar products
        if (extFp.includes(intFp.slice(0, 20)) || intFp.includes(extFp.slice(0, 20))) {
          return false
        }
      }
    }
    return true
  })
}

// ── UX Framing Copy Library ──────────────────────────────────────────────────
// Mega-prompt-03, Bloco 4: Framing nunca sugere falha, sempre ajuda inteligente.
// Variações por cenário + tom. O copy curto (mobile) vem primeiro.

type FramingContext = {
  expandedCount: number
  internalCount: number
  hasMonetizable: boolean
}

const FRAMINGS = {
  // Zero internal → expanded is the hero (rescue mode)
  rescue: [
    (c: FramingContext) => `Encontramos ${c.expandedCount} opções em lojas parceiras`,
    () => 'Continuamos a busca e encontramos alternativas relevantes',
    () => 'Separamos opções de lojas confiáveis para você',
  ],
  // Internal present, few expanded → subtle complement
  complement_light: [
    () => 'Ampliamos a busca com mais opções',
    () => 'Além do catálogo, separamos outras alternativas',
    () => 'Mais opções encontradas em lojas parceiras',
  ],
  // Internal present, many expanded → confident expansion
  complement_strong: [
    (c: FramingContext) => `Mais ${c.expandedCount} alternativas em lojas parceiras`,
    (c: FramingContext) => `Ampliamos a busca e encontramos ${c.expandedCount} opções relevantes`,
    () => 'Continuamos procurando para trazer mais opções sem você sair daqui',
  ],
  // Internal weak (few results) → expansion compensates
  weak_internal: [
    () => 'Ampliamos a busca para encontrar opções mais próximas do que você quer',
    () => 'Trouxemos mais opções para completar sua pesquisa',
    () => 'Encontramos alternativas relevantes em mais lojas',
  ],
} as const

function getExpandedFraming(expandedCount: number, internalCount: number, hasMonetizable = true): string {
  const ctx: FramingContext = { expandedCount, internalCount, hasMonetizable }

  let pool: readonly ((c: FramingContext) => string)[]

  if (internalCount === 0) {
    pool = FRAMINGS.rescue
  } else if (internalCount <= 4) {
    pool = FRAMINGS.weak_internal
  } else if (expandedCount <= 3) {
    pool = FRAMINGS.complement_light
  } else {
    pool = FRAMINGS.complement_strong
  }

  // Deterministic pick based on count (no random — SSR-safe)
  const idx = (expandedCount + internalCount) % pool.length
  return pool[idx](ctx)
}

/**
 * Category-aware framing: uses category-specific copy when available,
 * falls back to the generic framing library.
 */
function getCategoryAwareFraming(
  expandedCount: number,
  internalCount: number,
  categorySlug?: string,
): string {
  // If we have a category match, use the category-specific framing
  if (categorySlug) {
    const mode = internalCount === 0 ? 'rescue' : internalCount <= 4 ? 'weak' : 'complement'
    const categoryFraming = getCategoryFraming(categorySlug, mode)
    // Only use category framing if it's different from generic (= we have a real match)
    const genericFraming = getCategoryFraming(undefined, mode)
    if (categoryFraming !== genericFraming) {
      return categoryFraming
    }
  }
  // Fallback to generic framing library
  return getExpandedFraming(expandedCount, internalCount)
}

// ── Main Pipeline ────────────────────────────────────────────────────────────

export async function expandedSearch(params: ExpandedSearchParams): Promise<ExpandedSearchResponse> {
  const totalStart = Date.now()
  const stages: PipelineStage[] = []
  const isEnabled = isExpandedSearchEnabled() || params.forceExpand

  // ── 1. Query Understanding ───────────────────────────────────────────
  const uStart = Date.now()
  const { understanding } = understandQuery(params.query)
  stages.push({ stage: 'query_understanding', durationMs: Date.now() - uStart, itemsIn: 1, itemsOut: 1 })

  // ── 2. Internal Search ───────────────────────────────────────────────
  const iStart = Date.now()
  const internalResult: EnhancedSearchResult = await searchProducts({
    query: params.query,
    page: params.page,
    limit: params.limit || 24,
    category: params.category,
    brand: params.brand,
    source: params.source,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    freeShipping: params.freeShipping,
    sortBy: params.sortBy,
    isAdmin: params.isAdmin,
  })

  const internalCards = internalResult.products
  stages.push({
    stage: 'internal_search',
    durationMs: Date.now() - iStart,
    itemsIn: 1,
    itemsOut: internalCards.length,
  })

  // Convert to unified format
  const internalUnified = internalCards.map(internalToUnified)

  // ── 3. Coverage Evaluation ───────────────────────────────────────────
  const cStart = Date.now()
  const coverage = evaluateCoverage(internalCards, understanding, {
    maxPrice: params.maxPrice,
    minPrice: params.minPrice,
  })
  stages.push({ stage: 'coverage_evaluation', durationMs: Date.now() - cStart, itemsIn: internalCards.length, itemsOut: 1, detail: `score=${coverage.coverageScore}` })

  // ── Early return if expansion not needed or not enabled ──────────────
  if (!isEnabled || (!coverage.shouldExpand && !params.forceExpand)) {
    log.info('expanded-search.no-expansion', {
      query: params.query,
      coverage: coverage.coverageScore,
      internalCount: internalCards.length,
      enabled: isEnabled,
    })

    return {
      internalResults: internalUnified,
      expandedResults: [],
      blendedResults: internalUnified,
      internalTotal: internalResult.totalCount,
      expanded: false,
      coverage,
      understanding,
      searchLogId: internalResult.searchLogId,
      ...(params.isAdmin ? {
        trace: {
          stages,
          totalMs: Date.now() - totalStart,
          coverage,
          decision: { expand: false, connectors: [], limitPerConnector: 0, timeoutMs: 0, reason: isEnabled ? 'coverage_sufficient' : 'feature_disabled' },
          connectorResults: [],
          qualityGates: { before: 0, afterQuality: 0, afterDedup: 0, afterAffiliate: 0 },
        },
      } : {}),
    }
  }

  // ── 4. Expansion Decision ────────────────────────────────────────────
  const dStart = Date.now()
  const decision = decideExpansion(coverage, understanding, {
    maxPrice: params.maxPrice,
    forceExpand: params.forceExpand,
  })
  stages.push({ stage: 'expansion_decision', durationMs: Date.now() - dStart, itemsIn: 1, itemsOut: 1, detail: decision.reason })

  // ── 5. Execute Connectors ────────────────────────────────────────────
  const eStart = Date.now()
  const connectorResults = await executeExpansion(decision, params.query)
  const allCandidates: ExternalCandidate[] = connectorResults.flatMap(r => r.candidates)
  stages.push({
    stage: 'connector_execution',
    durationMs: Date.now() - eStart,
    itemsIn: decision.connectors.length,
    itemsOut: allCandidates.length,
    detail: connectorResults.map(r => `${r.connector}:${r.candidates.length}`).join(','),
  })

  // ── 6. Normalize + Resolve Candidates ────────────────────────────────
  const nStart = Date.now()
  const resolvedCandidates = resolveCandidates(allCandidates)
  stages.push({ stage: 'candidate_resolution', durationMs: Date.now() - nStart, itemsIn: allCandidates.length, itemsOut: resolvedCandidates.length })

  // ── 7. Quality Gates (category-aware thresholds) ────────────────────
  const qStart = Date.now()
  // Derive category from params or from query understanding entities
  const detectedCategory = params.category
    || understanding.entities?.find(e => e.type === 'category')?.value
  const qualityAssessed = applyQualityGates(resolvedCandidates, {
    categorySlug: detectedCategory,
  })
  stages.push({ stage: 'quality_gates', durationMs: Date.now() - qStart, itemsIn: resolvedCandidates.length, itemsOut: qualityAssessed.length })

  // ── 8. Convert to Unified + Dedup ────────────────────────────────────
  // Key by externalUrl (stable across ExternalCandidate → ResolvedCandidate)
  const connectorMap = new Map<string, string>()
  for (const cr of connectorResults) {
    for (const c of cr.candidates) {
      connectorMap.set(c.externalUrl, cr.connector)
    }
  }

  let expandedUnified = qualityAssessed.map(qa => {
    const connector = connectorMap.get(qa.candidate.externalUrl) || 'unknown'
    return externalToUnified(qa, connector)
  })

  // Dedup against internal
  const beforeDedup = expandedUnified.length
  expandedUnified = deduplicateAgainstInternal(expandedUnified, internalUnified)
  stages.push({ stage: 'deduplication', durationMs: 0, itemsIn: beforeDedup, itemsOut: expandedUnified.length })

  // ── 9. Hybrid Ranking ────────────────────────────────────────────────
  const rStart = Date.now()
  const { blended, policy } = rankHybrid(internalUnified, expandedUnified, coverage)
  stages.push({ stage: 'hybrid_ranking', durationMs: Date.now() - rStart, itemsIn: internalUnified.length + expandedUnified.length, itemsOut: blended.length, detail: `policy=${policy}` })

  // ── 10. Build Response ───────────────────────────────────────────────
  const totalMs = Date.now() - totalStart

  log.info('expanded-search.complete', {
    query: params.query,
    coverage: coverage.coverageScore,
    internalCount: internalUnified.length,
    expandedCount: expandedUnified.length,
    blendedCount: blended.length,
    policy,
    totalMs,
  })

  const trace: ExpansionTrace | undefined = params.isAdmin ? {
    stages,
    totalMs,
    coverage,
    decision,
    connectorResults: connectorResults.map(r => ({
      connector: r.connector,
      resultsCount: r.candidates.length,
      durationMs: r.durationMs,
      error: r.error,
    })),
    qualityGates: {
      before: allCandidates.length,
      afterQuality: qualityAssessed.length,
      afterDedup: expandedUnified.length,
      afterAffiliate: expandedUnified.filter(r => r.isMonetizable).length,
    },
  } : undefined

  return {
    internalResults: internalUnified,
    expandedResults: expandedUnified,
    blendedResults: blended,
    internalTotal: internalResult.totalCount,
    expanded: expandedUnified.length > 0,
    coverage,
    understanding,
    searchLogId: internalResult.searchLogId,
    expandedFraming: expandedUnified.length > 0
      ? getCategoryAwareFraming(expandedUnified.length, internalUnified.length, detectedCategory)
      : undefined,
    ...(trace ? { trace } : {}),
  }
}

// Re-export types for consumers
export type { ExpandedSearchParams, ExpandedSearchResponse, UnifiedResult } from './types'
