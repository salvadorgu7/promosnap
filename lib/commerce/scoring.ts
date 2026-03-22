// ============================================================================
// Scoring Unificado — motor unico de pontuacao comercial
//
// Unifica a logica duplicada em:
//   - lib/ranking/commercial.ts  (CommercialScore com 5 sub-scores + 9 presets)
//   - lib/decision/engine.ts     (scoreProduto com 8 fatores)
//
// REGRA: toda superficie (site, busca, homepage, whatsapp, assistente, etc.)
// usa este modulo como fonte unica de pontuacao.
//
// Reutiliza CommercialSignals como interface de entrada (mais completa).
// Adiciona presets para todos os contextos: whatsapp, distribution, assistant, comparison.
// ============================================================================

import { logger } from '@/lib/logger'
import type { CommercialSignals, CommercialScore } from '@/lib/ranking/commercial'

const log = logger.child({ module: 'commerce.scoring' })

// Re-exportar tipos do modulo original para conveniencia
export type { CommercialSignals, CommercialScore }

// ── Contexto de pontuacao ─────────────────────────────────────────────────

export interface ScoringContext {
  /** Nome do preset de pesos (ex: 'default', 'whatsapp', 'assistant') */
  preset: string
  /** Override manual de pesos individuais (merge com o preset) */
  weightOverrides?: Partial<WeightPreset>
}

// ── Resultado da pontuacao ────────────────────────────────────────────────

export interface ScoredResult {
  /** Score final 0-100 */
  total: number
  /** Breakdown dos 5 sub-scores ponderados */
  breakdown: {
    relevance: number
    dealQuality: number
    demand: number
    trust: number
    commercial: number
  }
  /** Labels dos boosts aplicados (para debug/observabilidade) */
  boosts: string[]
  /** Preset utilizado na pontuacao */
  presetUsed: string
}

// ── Item ranqueado ────────────────────────────────────────────────────────

export interface RankedItem<T> {
  item: T
  score: ScoredResult
  position: number
}

// ── Weight Presets ────────────────────────────────────────────────────────

export interface WeightPreset {
  relevance: number
  dealQuality: number
  demand: number
  trust: number
  commercial: number
}

/**
 * Presets de pesos por contexto.
 * Soma dos pesos sempre = 100 para normalizacao facil.
 *
 * Originais (lib/ranking/commercial.ts):
 *   default, search, deal, trending, discovery, homepage, category, brand, exploratory
 *
 * Novos (Unified Commerce Engine):
 *   whatsapp, distribution, assistant, comparison
 */
const WEIGHT_PRESETS: Record<string, WeightPreset> = {
  // ── Presets originais (preservados do commercial.ts) ──────────────────
  /** Balanceado — padrao para quando nao ha contexto especifico */
  default:     { relevance: 25, dealQuality: 25, demand: 20, trust: 15, commercial: 15 },
  /** Resultados de busca — relevancia importa mais */
  search:      { relevance: 35, dealQuality: 20, demand: 20, trust: 15, commercial: 10 },
  /** Paginas de ofertas — desconto/preco importa mais */
  deal:        { relevance: 10, dealQuality: 40, demand: 15, trust: 15, commercial: 20 },
  /** Trending/popular — sinais de demanda importam mais */
  trending:    { relevance: 15, dealQuality: 15, demand: 35, trust: 15, commercial: 20 },
  /** Discovery/importacao — potencial comercial importa mais */
  discovery:   { relevance: 10, dealQuality: 20, demand: 20, trust: 15, commercial: 35 },
  /** Homepage — balanceado com enfase em demanda */
  homepage:    { relevance: 15, dealQuality: 25, demand: 25, trust: 15, commercial: 20 },
  /** Navegacao por categoria */
  category:    { relevance: 20, dealQuality: 25, demand: 25, trust: 15, commercial: 15 },
  /** Navegacao por marca */
  brand:       { relevance: 20, dealQuality: 20, demand: 25, trust: 20, commercial: 15 },
  /** Exploratorio — demanda e comercial pesam mais */
  exploratory: { relevance: 10, dealQuality: 20, demand: 30, trust: 15, commercial: 25 },

  // ── Novos presets (Unified Commerce Engine) ───────────────────────────

  /**
   * WhatsApp Broadcast — foco em deal quality e confianca.
   * Links vao direto para compra, entao preco e desconto sao decisivos.
   * Trust alto para nao mandar lixo para o grupo.
   */
  whatsapp:     { relevance: 10, dealQuality: 35, demand: 15, trust: 25, commercial: 15 },

  /**
   * Distribuicao multicanal — balanceado com viés comercial.
   * Precisa de diversidade, entao relevancia sobe um pouco.
   */
  distribution: { relevance: 15, dealQuality: 30, demand: 15, trust: 20, commercial: 20 },

  /**
   * Assistente IA — foco em relevancia e qualidade da oferta.
   * O usuario perguntou algo especifico, entao a resposta precisa ser precisa.
   * Trust importa para credibilidade da recomendacao.
   */
  assistant:    { relevance: 30, dealQuality: 25, demand: 10, trust: 25, commercial: 10 },

  /**
   * Comparacao de produtos — relevancia maxima, deal quality alta.
   * O usuario quer comparar, entao precisamos oferecer opcoes justas e precisas.
   */
  comparison:   { relevance: 30, dealQuality: 30, demand: 10, trust: 20, commercial: 10 },
}

// ── Funcoes de sub-score (fonte unica de verdade) ─────────────────────────

/**
 * Relevancia — qualidade intrinseca do produto/oferta.
 * Avalia imagem, descricao, rating, reviews e loja oficial.
 */
function scoreRelevance(s: CommercialSignals): number {
  let score = 50 // base

  if (s.hasImage) score += 10
  if (s.hasDescription) score += 5
  if (s.rating && s.rating >= 4) score += 15
  if (s.reviewsCount && s.reviewsCount > 10) score += 10
  if (s.isOfficialStore) score += 10

  return Math.min(score, 100)
}

/**
 * Qualidade da oferta — quao bom e o preco/desconto.
 * Compara com preco original, media 30d, minimo historico.
 */
function scoreDealQuality(s: CommercialSignals): number {
  let score = 0

  // Desconto sobre preco original
  if (s.originalPrice && s.currentPrice && s.originalPrice > s.currentPrice) {
    const discountPct = ((s.originalPrice - s.currentPrice) / s.originalPrice) * 100
    score += Math.min(discountPct * 1.5, 50)
  }

  // Desconto sobre media 30 dias
  if (s.priceAvg30d && s.currentPrice && s.priceAvg30d > s.currentPrice) {
    const belowAvg = ((s.priceAvg30d - s.currentPrice) / s.priceAvg30d) * 100
    score += Math.min(belowAvg, 20)
  }

  // Perto do minimo historico?
  if (s.priceMin90d && s.currentPrice && s.currentPrice <= s.priceMin90d * 1.05) {
    score += 15
  }

  // Tendencia de preco
  if (s.priceTrend === 'dropping') score += 10
  if (s.priceTrend === 'rising') score -= 5

  // Bonus de frete e cupom
  if (s.isFreeShipping) score += 10
  if (s.hasCoupon) score += 5

  return Math.min(Math.max(score, 0), 100)
}

/**
 * Demanda — sinais de interesse real dos usuarios.
 * Clickouts, buscas, alertas, favoritos, vendas, trending.
 */
function scoreDemand(s: CommercialSignals): number {
  let score = 0

  // Clickouts (sinal de demanda real)
  if (s.clickouts7d) {
    score += Math.min(Math.log10(s.clickouts7d + 1) * 20, 30)
  }

  // Frequencia de busca
  if (s.searchFrequency) {
    score += Math.min(Math.log10(s.searchFrequency + 1) * 15, 25)
  }

  // Alertas (sinal de alta intencao)
  if (s.alertsCount) {
    score += Math.min(s.alertsCount * 5, 15)
  }

  // Favoritos
  if (s.favoritesCount) {
    score += Math.min(s.favoritesCount * 3, 10)
  }

  // Volume de vendas
  if (s.soldQuantity && s.soldQuantity > 0) {
    score += Math.min(Math.log10(s.soldQuantity) * 5, 15)
  }

  // Bonus trending
  if (s.isTrending) {
    score += 15
    if (s.trendPosition && s.trendPosition <= 5) score += 5
  }

  return Math.min(score, 100)
}

/**
 * Confianca — o quao confiavel e a fonte e a oferta.
 * Avalia marketplace, loja oficial, rating e volume de reviews.
 */
function scoreTrust(s: CommercialSignals): number {
  let score = 30 // base trust

  if (s.sourceTrust) {
    score += s.sourceTrust * 0.3
  }

  if (s.isOfficialStore) score += 20
  if (s.hasAffiliate) score += 10
  if (s.rating && s.rating >= 4.5) score += 10
  if (s.reviewsCount && s.reviewsCount > 50) score += 10

  return Math.min(score, 100)
}

/**
 * Comercial — potencial de monetizacao da oferta.
 * Avalia receita estimada, link de afiliado, cupom, frete, demanda.
 */
function scoreCommercial(s: CommercialSignals): number {
  let score = 0

  // Potencial de receita
  if (s.estimatedRevenue) {
    score += Math.min(s.estimatedRevenue * 10, 40)
  } else if (s.currentPrice && s.commissionRate) {
    const estRev = s.currentPrice * s.commissionRate
    score += Math.min(estRev * 0.5, 40)
  } else if (s.currentPrice) {
    // Produtos mais caros tem mais potencial comercial
    score += Math.min(Math.log10(s.currentPrice + 1) * 10, 25)
  }

  // Tem caminho de monetizacao
  if (s.hasAffiliate) score += 20
  if (s.hasCoupon) score += 5
  if (s.isFreeShipping) score += 5

  // Sinais de demanda aumentam valor comercial
  if (s.clickouts7d && s.clickouts7d > 5) score += 15
  if (s.alertsCount && s.alertsCount > 0) score += 10

  return Math.min(score, 100)
}

// ============================================================================
// Funcao principal de pontuacao
// ============================================================================

/**
 * Calcula o score comercial unificado para uma oferta.
 *
 * Fonte unica de verdade — substitui calculateCommercialScore do commercial.ts
 * e scoreProduto do decision engine.
 *
 * @param signals - Sinais disponiveis da oferta (todos opcionais)
 * @param context - Contexto de pontuacao (preset + overrides)
 * @returns ScoredResult com total, breakdown e boosts
 */
export function scoreOffer(
  signals: CommercialSignals,
  context: ScoringContext = { preset: 'default' },
): ScoredResult {
  const presetName = context.preset in WEIGHT_PRESETS ? context.preset : 'default'
  const baseWeights = WEIGHT_PRESETS[presetName]

  // Merge overrides sobre o preset
  const weights: WeightPreset = context.weightOverrides
    ? { ...baseWeights, ...context.weightOverrides }
    : baseWeights

  // Calcular sub-scores brutos (0-100 cada)
  const raw = {
    relevance: scoreRelevance(signals),
    dealQuality: scoreDealQuality(signals),
    demand: scoreDemand(signals),
    trust: scoreTrust(signals),
    commercial: scoreCommercial(signals),
  }

  // Aplicar pesos e normalizar para 0-100
  let total = Math.round(
    (raw.relevance * weights.relevance / 100) +
    (raw.dealQuality * weights.dealQuality / 100) +
    (raw.demand * weights.demand / 100) +
    (raw.trust * weights.trust / 100) +
    (raw.commercial * weights.commercial / 100)
  )

  // ── Boosts multiplicativos ──────────────────────────────────────────────
  const boosts: string[] = []

  // Boost de origem: produtos reais importados ganham +25%
  if (signals.originType === 'imported') {
    total = Math.round(total * 1.25)
    boosts.push('originType_imported')
  }

  // Boost de afiliado: produtos monetizaveis ranqueiam melhor
  if (signals.hasAffiliate) {
    total = Math.round(total * 1.10)
    boosts.push('has_affiliate')
  }

  // Boost de imagem: produtos com imagem convertem mais
  if (signals.hasImage) {
    total = Math.round(total * 1.05)
    boosts.push('has_image')
  }

  // Labels adicionais para debug
  if (signals.isFreeShipping) boosts.push('free_shipping')
  if (signals.hasCoupon) boosts.push('coupon')
  if (signals.isTrending) boosts.push('trending')
  if (signals.priceTrend === 'dropping') boosts.push('price_dropping')

  // Clampar 0-100
  total = Math.min(Math.max(total, 0), 100)

  return {
    total,
    breakdown: {
      relevance: Math.round(raw.relevance * weights.relevance / 100),
      dealQuality: Math.round(raw.dealQuality * weights.dealQuality / 100),
      demand: Math.round(raw.demand * weights.demand / 100),
      trust: Math.round(raw.trust * weights.trust / 100),
      commercial: Math.round(raw.commercial * weights.commercial / 100),
    },
    boosts,
    presetUsed: presetName,
  }
}

// ============================================================================
// Ranking de lista
// ============================================================================

/**
 * Pontua e ordena uma lista de itens por score comercial.
 *
 * Funcao generica — aceita qualquer tipo T desde que getSignals() consiga
 * extrair CommercialSignals de cada item.
 *
 * @param items - Lista de itens para ranquear
 * @param getSignals - Funcao que extrai sinais de cada item
 * @param context - Contexto de pontuacao (preset + overrides)
 * @returns Lista ordenada do maior para o menor score, com posicao
 */
export function rankOffers<T>(
  items: T[],
  getSignals: (item: T) => CommercialSignals,
  context: ScoringContext = { preset: 'default' },
): RankedItem<T>[] {
  const scored = items.map(item => ({
    item,
    score: scoreOffer(getSignals(item), context),
  }))

  // Ordenar por score decrescente
  scored.sort((a, b) => b.score.total - a.score.total)

  // Adicionar posicao
  return scored.map((entry, index) => ({
    item: entry.item,
    score: entry.score,
    position: index,
  }))
}

// ============================================================================
// Utilitarios de preset
// ============================================================================

/**
 * Retorna o nome do preset disponivel.
 * Se o preset nao existir, retorna 'default'.
 */
export function resolvePreset(name: string): string {
  return name in WEIGHT_PRESETS ? name : 'default'
}

/**
 * Lista todos os presets disponiveis com seus pesos.
 * Util para dashboards de admin e diagnostico.
 */
export function listPresets(): Record<string, WeightPreset> {
  return { ...WEIGHT_PRESETS }
}

/**
 * Retorna os pesos de um preset especifico.
 * Fallback para 'default' se nao encontrar.
 */
export function getPresetWeights(name: string): WeightPreset {
  return WEIGHT_PRESETS[name] || WEIGHT_PRESETS.default
}

/**
 * Mapeia IntentMode (do classificador de intent) para um preset de scoring.
 * Utilitario para quando o canal nao especifica preset — usa o modo do intent.
 */
export function presetFromIntentMode(mode: string): string {
  const map: Record<string, string> = {
    exploratory: 'exploratory',
    comparative: 'comparison',
    decisional: 'deal',
    urgent: 'deal',
  }
  return map[mode] || 'default'
}
