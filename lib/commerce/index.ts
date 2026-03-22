// ============================================================================
// UNIFIED COMMERCE ENGINE — Orchestrator
//
// Nucleo unico que coordena todo o pipeline de comercio:
//   Intent → Memory → Retrieval → Scoring → Comparison → Response → Adapter
//
// REGRA: toda superficie (site, busca, assistente, WhatsApp, distribuicao)
// chama `processCommerceRequest()` como ponto de entrada unico.
//
// Elimina duplicacao em:
//   - lib/search/engine.ts (busca)
//   - lib/ai/shopping-assistant.ts (assistente)
//   - lib/distribution/engine.ts (distribuicao)
//   - lib/whatsapp-broadcast/offer-selector.ts (WhatsApp)
// ============================================================================

import { logger } from "@/lib/logger"
import { classifyIntent } from "@/lib/ai/intent-classifier"
import type {
  CommerceRequest,
  CommerceResponse,
  CommerceIntent,
  CommerceChannel,
  ScoredOffer,
} from "./types"
import { retrieveOffers, type RetrievedOffer } from "./retrieval"
import {
  scoreOffer,
  rankOffers,
  presetFromIntentMode,
  type ScoringContext,
  type CommercialSignals,
} from "./scoring"
import { compareOffers } from "./comparison"
import {
  getOrCreateSession,
  recordInteraction,
  enrichIntentFromMemory,
} from "./memory"
import { adaptForSite, type SiteResponse } from "./site-adapter"
import { adaptForWhatsApp, type WhatsAppResponse } from "./whatsapp-adapter"

const log = logger.child({ module: "commerce.engine" })

// ── Re-exports para conveniencia ─────────────────────────────────────────────

export type { CommerceRequest, CommerceResponse, ScoredOffer, CommerceChannel }
export type { SiteResponse } from "./site-adapter"
export type { WhatsAppResponse } from "./whatsapp-adapter"
export { adaptForSite } from "./site-adapter"
export { adaptForWhatsApp } from "./whatsapp-adapter"
export { compareOffers } from "./comparison"
export { scoreOffer, rankOffers, listPresets, getPresetWeights } from "./scoring"
export { retrieveOffers } from "./retrieval"
export {
  failsQualityGate,
  applyQualityGates,
  resolveQualityGates,
  DEFAULT_QUALITY_GATES,
} from "./quality-gates"
export {
  buildAffiliateUrl,
  buildClickoutUrl,
  hasAffiliateTracking,
  validateAffiliateIntegrity,
} from "./affiliate-manager"
export {
  getOrCreateSession,
  recordInteraction,
  getSessionContext,
  cleanExpiredSessions,
  getActiveSessionCount,
} from "./memory"

// ── Mapeamento canal → preset de scoring ──────────────────────────────────────

const CHANNEL_PRESET: Record<CommerceChannel, string> = {
  site: "default",
  whatsapp: "whatsapp",
  telegram: "distribution",
  email: "distribution",
  api: "default",
}

// ── Mapeamento canal → limite de ofertas ──────────────────────────────────────

const CHANNEL_DEFAULT_LIMIT: Record<CommerceChannel, number> = {
  site: 12,
  whatsapp: 5,
  telegram: 5,
  email: 8,
  api: 10,
}

// ============================================================================
// PIPELINE PRINCIPAL
// ============================================================================

/**
 * Ponto de entrada unico do Commerce Engine.
 *
 * Pipeline:
 *   1. Classificar intent (heuristica, rapido)
 *   2. Enriquecer intent com memoria da sessao (se sessionId)
 *   3. Recuperar ofertas do banco (retrieval layer)
 *   4. Pontuar e rankear ofertas (scoring unificado)
 *   5. Comparar ofertas (se intent comparativo)
 *   6. Compor resposta (CommerceResponse)
 *   7. Gravar na memoria da sessao
 *
 * Cada etapa e medida para observabilidade.
 *
 * @param request - Requisicao do canal (site, WhatsApp, etc.)
 * @returns CommerceResponse com ofertas pontuadas, comparacao, timing, etc.
 */
export async function processCommerceRequest(
  request: CommerceRequest
): Promise<CommerceResponse> {
  const startMs = Date.now()
  const { query, channel, sessionId } = request
  const limit = request.channelConfig?.maxItems
    ?? request.limit
    ?? CHANNEL_DEFAULT_LIMIT[channel]

  log.info("commerce.request", { query, channel, limit, sessionId })

  // ── 1. Classificar intent ──────────────────────────────────────────────

  const intentStartMs = Date.now()
  let intent: CommerceIntent

  if (request.intent) {
    // Intent ja classificado pelo caller (ex: assistente com LLM)
    intent = request.intent
  } else {
    // Classificacao por heuristica (rapida, sem rede)
    const classified = classifyIntent(query)
    intent = {
      ...classified,
      priceKeywords: classified.priceKeywords,
      comparisonKeywords: classified.comparisonKeywords,
      confidence: classified.confidence,
    }
  }
  const intentMs = Date.now() - intentStartMs

  // ── 2. Enriquecer com memoria da sessao ────────────────────────────────

  if (sessionId) {
    getOrCreateSession(sessionId, channel)
    intent = enrichIntentFromMemory(intent, sessionId)
  }

  // ── 3. Recuperar ofertas ───────────────────────────────────────────────

  const retrievalStartMs = Date.now()

  const retrieved = await retrieveOffers({
    intent,
    channel,
    limit: limit * 2, // buscar o dobro para ter margem pos-scoring
    categories: intent.categories,
    brands: intent.brands,
    budget: intent.budget,
    requireAffiliate: channel !== "site", // site aceita sem afiliado
    requireImage: channel === "whatsapp" || channel === "telegram",
  })

  const retrievalMs = Date.now() - retrievalStartMs

  // ── 4. Pontuar e rankear ───────────────────────────────────────────────

  const scoringStartMs = Date.now()

  // Resolver preset: canal > intent mode > default
  const presetName =
    CHANNEL_PRESET[channel] !== "default"
      ? CHANNEL_PRESET[channel]
      : presetFromIntentMode(intent.mode)

  const scoringContext: ScoringContext = { preset: presetName }

  const ranked = rankOffers(
    retrieved,
    (offer) => retrievedToSignals(offer),
    scoringContext
  )

  // Mapear para ScoredOffer
  const scoredOffers: ScoredOffer[] = ranked
    .slice(0, limit)
    .map((r, idx) => ({
      offerId: r.item.offerId,
      productId: r.item.productId,
      productName: r.item.productName,
      productSlug: r.item.productSlug,
      currentPrice: r.item.currentPrice,
      originalPrice: r.item.originalPrice,
      discount: r.item.discount,
      sourceSlug: r.item.sourceSlug,
      sourceName: r.item.sourceName,
      imageUrl: r.item.imageUrl,
      affiliateUrl: r.item.affiliateUrl,
      clickoutUrl: r.item.clickoutUrl,
      isFreeShipping: r.item.isFreeShipping,
      rating: r.item.rating,
      reviewsCount: r.item.reviewsCount,
      couponText: r.item.couponText,
      commercialScore: r.score.total,
      scoreBreakdown: r.score.breakdown,
      boosts: r.score.boosts,
      position: idx,
    }))

  const scoringMs = Date.now() - scoringStartMs

  // ── 5. Comparar (se intent comparativo) ────────────────────────────────

  let comparison = undefined
  if (
    intent.comparisonKeywords ||
    intent.type === "compare_models" ||
    intent.mode === "comparative" ||
    request.channelConfig?.includeComparison
  ) {
    comparison = compareOffers(scoredOffers, {
      maxProducts: channel === "whatsapp" ? 3 : 4,
    }) ?? undefined
  }

  // ── 6. Compor resposta ─────────────────────────────────────────────────

  const totalMs = Date.now() - startMs

  // Decidir se deve sugerir alerta de preco
  const suggestAlert =
    scoredOffers.length > 0 &&
    (intent.mode === "decisional" || intent.mode === "comparative") &&
    scoredOffers[0].commercialScore < 80

  // Decidir se deve sugerir busca externa
  const suggestExternalSearch =
    scoredOffers.length < 3 && intent.confidence > 0.5

  // Contar fontes
  const sourceSet = new Set(scoredOffers.map(o => o.sourceSlug))

  const response: CommerceResponse = {
    intent,
    offers: scoredOffers,
    comparison,
    totalFound: retrieved.length,
    internalCount: scoredOffers.length,
    externalCount: 0,
    channel,
    suggestAlert,
    suggestExternalSearch,
    timing: {
      intentMs,
      retrievalMs,
      scoringMs,
      totalMs,
    },
    retrievalSources: [...sourceSet],
  }

  // ── 7. Gravar na memoria ──────────────────────────────────────────────

  if (sessionId) {
    recordInteraction(sessionId, {
      query,
      intent,
      selectedProducts: scoredOffers.slice(0, 3).map(o => o.productSlug),
      budget: intent.budget,
      brands: intent.brands,
      categories: intent.categories,
    })
  }

  log.info("commerce.response", {
    channel,
    query,
    offers: scoredOffers.length,
    total: retrieved.length,
    preset: presetName,
    timing: response.timing,
  })

  return response
}

// ============================================================================
// ATALHOS POR CANAL
// ============================================================================

/**
 * Processa request e adapta para exibicao no site.
 * Atalho para: processCommerceRequest() → adaptForSite()
 */
export async function processForSite(
  request: Omit<CommerceRequest, "channel">
): Promise<SiteResponse> {
  const response = await processCommerceRequest({
    ...request,
    channel: "site",
  })
  return adaptForSite(response)
}

/**
 * Processa request e adapta para mensagem WhatsApp.
 * Atalho para: processCommerceRequest() → adaptForWhatsApp()
 */
export async function processForWhatsApp(
  request: Omit<CommerceRequest, "channel">
): Promise<WhatsAppResponse> {
  const response = await processCommerceRequest({
    ...request,
    channel: "whatsapp",
  })
  return adaptForWhatsApp(response)
}

/**
 * Processa request para distribuicao (email, telegram).
 * Retorna CommerceResponse diretamente (caller decide formato).
 */
export async function processForDistribution(
  request: Omit<CommerceRequest, "channel"> & { channel?: CommerceChannel }
): Promise<CommerceResponse> {
  return processCommerceRequest({
    ...request,
    channel: request.channel || "email",
  })
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Converte RetrievedOffer em CommercialSignals para o scoring unificado.
 * Mapeia os campos disponiveis; campos ausentes ficam undefined
 * e os sub-scorers lidam com isso (todos os campos sao opcionais).
 */
function retrievedToSignals(offer: RetrievedOffer): CommercialSignals {
  return {
    currentPrice: offer.currentPrice,
    originalPrice: offer.originalPrice ?? undefined,
    hasImage: offer.hasImage,
    hasDescription: offer.hasDescription,
    hasAffiliate: offer.hasAffiliate,
    rating: offer.rating ?? undefined,
    reviewsCount: offer.reviewsCount ?? undefined,
    isFreeShipping: offer.isFreeShipping,
    hasCoupon: !!offer.couponText,
    originType: offer.originType ?? undefined,
    // Campos que precisam de lookup adicional (nao disponiveis no retrieval basico)
    // Ficam undefined — o scoring lida com isso
    clickouts7d: undefined,
    searchFrequency: undefined,
    alertsCount: undefined,
    favoritesCount: undefined,
    soldQuantity: undefined,
    isTrending: undefined,
    trendPosition: undefined,
    priceAvg30d: undefined,
    priceMin90d: undefined,
    priceTrend: undefined,
    sourceTrust: undefined,
    isOfficialStore: undefined,
    commissionRate: undefined,
    estimatedRevenue: undefined,
  }
}
