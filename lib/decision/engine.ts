import { SOURCE_QUALITY, REVENUE_RATES } from '@/lib/source/routing'
import type {
  DecisionResult,
  DecisionFactor,
  DecisionContext,
  ScoringWeights,
  ProductScoringInput,
  OfferForDecision,
  EditorialBlockDecision,
} from './types'
import { DEFAULT_SCORING_WEIGHTS } from './types'

// ============================================
// COMPOSITE PRODUCT SCORING
// ============================================

export function scoreProduto(
  product: ProductScoringInput,
  context?: DecisionContext,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS,
): DecisionResult<number> {
  const factors: DecisionFactor[] = []

  // 1. Offer score (0-100 normalized to 0-1)
  const offerScoreNorm = Math.min(1, (product.offerScore || 0) / 100)
  factors.push({
    name: 'offerScore',
    value: offerScoreNorm,
    weight: weights.offerScore,
    contribution: offerScoreNorm * weights.offerScore,
  })

  // 2. Revenue opportunity (estimated commission)
  const revenueRate = REVENUE_RATES[product.sourceSlug] ?? 0.03
  const estimatedRevenue = product.currentPrice * revenueRate
  const revenueNorm = Math.min(1, estimatedRevenue / 20) // normalize: R$20 max expected
  factors.push({
    name: 'revenueOpportunity',
    value: revenueNorm,
    weight: weights.revenueOpportunity,
    contribution: revenueNorm * weights.revenueOpportunity,
  })

  // 3. CTR estimate (clickouts / impressions heuristic)
  const clickouts = product.clickouts ?? 0
  const impressions = product.impressions ?? Math.max(1, clickouts * 20) // fallback heuristic
  const ctr = impressions > 0 ? clickouts / impressions : 0
  const ctrNorm = Math.min(1, ctr / 0.1) // 10% CTR = max score
  factors.push({
    name: 'ctrEstimate',
    value: ctrNorm,
    weight: weights.ctrEstimate,
    contribution: ctrNorm * weights.ctrEstimate,
  })

  // 4. Favorites count
  const favNorm = Math.min(1, (product.favoritesCount ?? 0) / 50)
  factors.push({
    name: 'favoritesCount',
    value: favNorm,
    weight: weights.favoritesCount,
    contribution: favNorm * weights.favoritesCount,
  })

  // 5. Alerts count
  const alertsNorm = Math.min(1, (product.alertsCount ?? 0) / 20)
  factors.push({
    name: 'alertsCount',
    value: alertsNorm,
    weight: weights.alertsCount,
    contribution: alertsNorm * weights.alertsCount,
  })

  // 6. Source quality
  const sourceQuality = SOURCE_QUALITY[product.sourceSlug] ?? 0.5
  factors.push({
    name: 'sourceQuality',
    value: sourceQuality,
    weight: weights.sourceQuality,
    contribution: sourceQuality * weights.sourceQuality,
  })

  // 7. Data freshness (how recently updated)
  const now = new Date()
  const updatedAt = product.updatedAt ?? now
  const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60)
  const freshnessNorm = Math.max(0, 1 - hoursSinceUpdate / 168) // 7 days = 0
  factors.push({
    name: 'dataFreshness',
    value: freshnessNorm,
    weight: weights.dataFreshness,
    contribution: freshnessNorm * weights.dataFreshness,
  })

  // 8. Match confidence (based on discount existence, price sanity)
  let matchConfidence = 0.5
  if (product.originalPrice && product.originalPrice > product.currentPrice) matchConfidence += 0.3
  if (product.isFreeShipping) matchConfidence += 0.1
  if (product.popularityScore && product.popularityScore > 5) matchConfidence += 0.1
  matchConfidence = Math.min(1, matchConfidence)
  factors.push({
    name: 'matchConfidence',
    value: matchConfidence,
    weight: weights.matchConfidence,
    contribution: matchConfidence * weights.matchConfidence,
  })

  const totalScore = factors.reduce((sum, f) => sum + f.contribution, 0)

  // Build reason
  const topFactors = [...factors]
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 3)
    .map(f => f.name)
    .join(', ')

  return {
    result: Math.round(totalScore * 100) / 100,
    reason: `Score ${(totalScore * 100).toFixed(1)} — liderado por ${topFactors}`,
    factors,
    totalScore,
  }
}

// ============================================
// BEST OFFER DECISION
// ============================================

export function decideBestOffer(
  offers: OfferForDecision[],
  mode: 'cheapest' | 'balanced' | 'revenue' | 'trust-first' = 'balanced',
): DecisionResult<OfferForDecision | null> {
  if (offers.length === 0) {
    return {
      result: null,
      reason: 'Nenhuma oferta disponivel',
      factors: [],
      totalScore: 0,
    }
  }

  const scored = offers.map(offer => {
    const factors: DecisionFactor[] = []

    // Price factor (lower = better, normalized by cheapest)
    const minPrice = Math.min(...offers.map(o => o.currentPrice))
    const maxPrice = Math.max(...offers.map(o => o.currentPrice))
    const priceRange = maxPrice - minPrice || 1
    const priceNorm = 1 - (offer.currentPrice - minPrice) / priceRange
    const priceWeight = mode === 'cheapest' ? 0.60 : mode === 'revenue' ? 0.10 : 0.30
    factors.push({ name: 'price', value: priceNorm, weight: priceWeight, contribution: priceNorm * priceWeight })

    // Offer score factor
    const scoreNorm = Math.min(1, offer.offerScore / 100)
    const scoreWeight = mode === 'balanced' ? 0.25 : 0.15
    factors.push({ name: 'offerScore', value: scoreNorm, weight: scoreWeight, contribution: scoreNorm * scoreWeight })

    // Source quality factor
    const sourceQ = SOURCE_QUALITY[offer.sourceSlug] ?? 0.5
    const sourceWeight = mode === 'trust-first' ? 0.50 : 0.15
    factors.push({ name: 'sourceQuality', value: sourceQ, weight: sourceWeight, contribution: sourceQ * sourceWeight })

    // Revenue potential
    const rate = REVENUE_RATES[offer.sourceSlug] ?? 0.03
    const revNorm = Math.min(1, (offer.currentPrice * rate) / 20)
    const revWeight = mode === 'revenue' ? 0.45 : 0.10
    factors.push({ name: 'revenue', value: revNorm, weight: revWeight, contribution: revNorm * revWeight })

    // Shipping bonus
    const shipValue = offer.isFreeShipping ? 1 : 0
    const shipWeight = 0.10
    factors.push({ name: 'shipping', value: shipValue, weight: shipWeight, contribution: shipValue * shipWeight })

    // Coupon bonus
    const couponValue = offer.couponText ? 1 : 0
    const couponWeight = 0.05
    factors.push({ name: 'coupon', value: couponValue, weight: couponWeight, contribution: couponValue * couponWeight })

    const totalScore = factors.reduce((sum, f) => sum + f.contribution, 0)
    return { offer, factors, totalScore }
  })

  scored.sort((a, b) => b.totalScore - a.totalScore)
  const best = scored[0]

  return {
    result: best.offer,
    reason: `Modo ${mode}: melhor oferta de ${best.offer.sourceName} (R$${best.offer.currentPrice.toFixed(2)}) — score ${(best.totalScore * 100).toFixed(1)}`,
    factors: best.factors,
    totalScore: best.totalScore,
  }
}

// ============================================
// HIGHLIGHT DECISION
// ============================================

export function decideHighlight(
  products: ProductScoringInput[],
  limit = 10,
  context?: DecisionContext,
): DecisionResult<ProductScoringInput[]> {
  if (products.length === 0) {
    return { result: [], reason: 'Nenhum produto para destacar', factors: [], totalScore: 0 }
  }

  const scored = products.map(p => ({
    product: p,
    decision: scoreProduto(p, context),
  }))

  scored.sort((a, b) => b.decision.totalScore - a.decision.totalScore)
  const highlighted = scored.slice(0, limit)
  const result = highlighted.map(h => h.product)

  // Aggregate factors for the top selection
  const avgFactors = aggregateFactors(highlighted.map(h => h.decision.factors))
  const avgScore = highlighted.reduce((s, h) => s + h.decision.totalScore, 0) / highlighted.length

  return {
    result,
    reason: `${highlighted.length} produtos selecionados de ${products.length} — score medio ${(avgScore * 100).toFixed(1)}`,
    factors: avgFactors,
    totalScore: avgScore,
  }
}

// ============================================
// EDITORIAL BLOCK DECISION
// ============================================

export function decideEditorialBlock(context: {
  hotDealsCount: number
  lowestPricesCount: number
  bestSellersCount: number
  trendingCount: number
  couponsCount: number
  dealOfDayAvailable: boolean
}): DecisionResult<EditorialBlockDecision[]> {
  const blocks: EditorialBlockDecision[] = []
  const factors: DecisionFactor[] = []

  // Hot deals block
  if (context.hotDealsCount >= 3) {
    blocks.push({ type: 'hot_deals', priority: 1, reason: `${context.hotDealsCount} ofertas quentes disponiveis` })
    factors.push({ name: 'hot_deals', value: Math.min(1, context.hotDealsCount / 10), weight: 0.25, contribution: 0 })
  }

  // Deal of the day
  if (context.dealOfDayAvailable) {
    blocks.push({ type: 'deal_of_day', priority: 2, reason: 'Oferta do dia disponivel' })
    factors.push({ name: 'deal_of_day', value: 1, weight: 0.20, contribution: 0 })
  }

  // Lowest prices
  if (context.lowestPricesCount >= 3) {
    blocks.push({ type: 'lowest_prices', priority: 3, reason: `${context.lowestPricesCount} menores precos encontrados` })
    factors.push({ name: 'lowest_prices', value: Math.min(1, context.lowestPricesCount / 10), weight: 0.15, contribution: 0 })
  }

  // Best sellers
  if (context.bestSellersCount >= 3) {
    blocks.push({ type: 'best_sellers', priority: 4, reason: `${context.bestSellersCount} mais vendidos` })
    factors.push({ name: 'best_sellers', value: Math.min(1, context.bestSellersCount / 10), weight: 0.15, contribution: 0 })
  }

  // Trending
  if (context.trendingCount >= 2) {
    blocks.push({ type: 'trending', priority: 5, reason: `${context.trendingCount} em tendencia` })
    factors.push({ name: 'trending', value: Math.min(1, context.trendingCount / 8), weight: 0.10, contribution: 0 })
  }

  // Coupon picks
  if (context.couponsCount >= 2) {
    blocks.push({ type: 'coupon_picks', priority: 6, reason: `${context.couponsCount} cupons ativos` })
    factors.push({ name: 'coupon_picks', value: Math.min(1, context.couponsCount / 5), weight: 0.10, contribution: 0 })
  }

  // Recompute contributions
  factors.forEach(f => { f.contribution = f.value * f.weight })
  const totalScore = factors.reduce((s, f) => s + f.contribution, 0)

  blocks.sort((a, b) => a.priority - b.priority)

  return {
    result: blocks,
    reason: `${blocks.length} blocos editoriais recomendados`,
    factors,
    totalScore,
  }
}

// ============================================
// HELPERS
// ============================================

function aggregateFactors(allFactors: DecisionFactor[][]): DecisionFactor[] {
  if (allFactors.length === 0) return []

  const nameMap = new Map<string, { totalValue: number; totalContribution: number; weight: number; count: number }>()

  for (const factors of allFactors) {
    for (const f of factors) {
      const existing = nameMap.get(f.name)
      if (existing) {
        existing.totalValue += f.value
        existing.totalContribution += f.contribution
        existing.count++
      } else {
        nameMap.set(f.name, { totalValue: f.value, totalContribution: f.contribution, weight: f.weight, count: 1 })
      }
    }
  }

  return Array.from(nameMap.entries()).map(([name, data]) => ({
    name,
    value: Math.round((data.totalValue / data.count) * 100) / 100,
    weight: data.weight,
    contribution: Math.round((data.totalContribution / data.count) * 100) / 100,
  }))
}
