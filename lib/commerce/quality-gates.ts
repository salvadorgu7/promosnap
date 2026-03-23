// ============================================================================
// Quality Gates — fonte unica de verdade para filtros de qualidade
//
// Unifica a logica duplicada em:
//   - lib/distribution/engine.ts  (MIN_PRICE=5, MAX_DISCOUNT=85, MIN_RATING=2)
//   - lib/whatsapp-broadcast/offer-selector.ts (mesmos valores)
//   - lib/search (gates implicitos de qualidade expandida)
//
// REGRA: todo canal (site, whatsapp, telegram, email, api) passa por aqui.
// ============================================================================

import { logger } from '@/lib/logger'
import type { QualityGatesConfig, CommerceChannel } from './types'

const log = logger.child({ module: 'commerce.quality-gates' })

// ── Configuracao padrao ───────────────────────────────────────────────────

export const DEFAULT_QUALITY_GATES: QualityGatesConfig = {
  /** Preco minimo R$5 — elimina erros de parse com valores proximos de zero */
  minPrice: 5,
  /** Desconto maximo — acima disso ativa validacao inteligente por confianca */
  maxDiscount: 85,
  /** Nota minima 2.0 — listings sem nota (null) sao mantidos */
  minRating: 2,
  /** Nao exigir imagem por padrao (canais visuais podem sobrescrever) */
  requireImage: false,
  /** Nao exigir URL de afiliado por padrao */
  requireAffiliate: false,
  /** Sem limite por marketplace por padrao (0 = ilimitado) */
  maxPerMarketplace: 0,
}

// ── Overrides por canal ───────────────────────────────────────────────────

/**
 * Presets de quality gates por canal.
 * Canais visuais (whatsapp, telegram) exigem imagem.
 * Canais de distribuicao exigem afiliado.
 */
const CHANNEL_OVERRIDES: Partial<Record<CommerceChannel, Partial<QualityGatesConfig>>> = {
  whatsapp: {
    requireImage: true,
    // requireAffiliate controlado pelo offer-selector (campaign config)
    // maxPerMarketplace controlado pelo offer-selector (escala com limit)
  },
  telegram: {
    requireImage: true,
  },
  email: {
    requireImage: true,
  },
  site: {
    // Site aceita tudo que passar nos gates padrao
  },
  api: {
    // API e flexivel, sem restricoes extras
  },
}

// ── Resolucao de config ───────────────────────────────────────────────────

/**
 * Resolve a configuracao final de quality gates.
 * Prioridade: overrides manuais > preset do canal > padrao.
 */
export function resolveQualityGates(
  channel?: CommerceChannel,
  overrides?: Partial<QualityGatesConfig>,
): QualityGatesConfig {
  const channelDefaults = channel ? CHANNEL_OVERRIDES[channel] : undefined
  return {
    ...DEFAULT_QUALITY_GATES,
    ...channelDefaults,
    ...overrides,
  }
}

// ── Resultado da validacao ────────────────────────────────────────────────

export interface QualityGateResult {
  /** true se a oferta passou em todos os gates */
  passes: boolean
  /** Motivo da rejeicao (undefined se passou) */
  reason?: string
}

// ── Interface minima para validacao ───────────────────────────────────────

/**
 * Campos minimos necessarios para validar quality gates.
 * Compativel com RawOffer, DistributableOffer e SelectedOffer.
 */
export interface QualityGateInput {
  currentPrice: number | string
  originalPrice?: number | string | null
  rating?: number | null
  imageUrl?: string | null
  affiliateUrl?: string | null
  sourceSlug?: string
  // Campos opcionais para validacao inteligente de desconto alto
  reviewsCount?: number | null
  couponText?: string | null
  salesCount?: number | null
}

// ── Confianca de desconto alto ──────────────────────────────────────────

/**
 * Fontes confiaveis (marketplaces grandes com dados consistentes).
 * Descontos altos vindos dessas fontes tem mais chance de ser reais.
 */
const TRUSTED_SOURCES = new Set(['amazon', 'amazon-br', 'mercadolivre', 'shopee', 'shein'])

/**
 * Calcula confianca (0-100) de que um desconto alto (>85%) e real.
 *
 * Sinais positivos (somam confianca):
 *   +25 — fonte confiavel (Amazon, ML, Shopee, Shein)
 *   +20 — muitas avaliacoes (>50)
 *   +10 — algumas avaliacoes (>10)
 *   +15 — nota boa (≥4.0)
 *   +10 — nota razoavel (≥3.0)
 *   +15 — vendas altas (>100)
 *   +10 — vendas medias (>10)
 *   +10 — tem cupom (desconto via cupom e intencional)
 *   +10 — preco final > R$20 (menos provavel ser parse error)
 *   +5  — tem imagem (produto real, nao stub)
 *
 * Sinais negativos (reduzem confianca):
 *   -15 — desconto > 95% (quase certamente erro)
 *   -10 — preco final < R$10 (suspeito em descontos altos)
 *
 * Threshold: confianca >= 35 → aceita. Abaixo → rejeita.
 * Na pratica, uma oferta da Amazon com 10+ reviews e preco > R$20 passa facil (25+10+10 = 45).
 * Uma oferta sem reviews, sem fonte conhecida e preco < R$10 seria rejeitada (0-10 = -10).
 */
function computeHighDiscountConfidence(
  offer: QualityGateInput,
  currentPrice: number,
  discount: number,
): number {
  let confidence = 0

  // Fonte confiavel
  if (offer.sourceSlug && TRUSTED_SOURCES.has(offer.sourceSlug)) {
    confidence += 25
  }

  // Avaliacoes
  const reviews = offer.reviewsCount != null ? Number(offer.reviewsCount) : 0
  if (reviews > 50) confidence += 20
  else if (reviews > 10) confidence += 10

  // Rating
  const rating = offer.rating != null ? Number(offer.rating) : 0
  if (rating >= 4.0) confidence += 15
  else if (rating >= 3.0) confidence += 10

  // Vendas
  const sales = offer.salesCount != null ? Number(offer.salesCount) : 0
  if (sales > 100) confidence += 15
  else if (sales > 10) confidence += 10

  // Cupom (desconto intencional)
  if (offer.couponText) confidence += 10

  // Preco final razoavel
  if (currentPrice > 20) confidence += 10

  // Imagem
  if (offer.imageUrl) confidence += 5

  // Penalidades
  if (discount > 95) confidence -= 15
  if (currentPrice < 10) confidence -= 10

  return Math.max(0, Math.min(100, confidence))
}

// ── Validacao de oferta individual ────────────────────────────────────────

/**
 * Verifica se uma oferta passa nos quality gates.
 * Retorna { passes: true } ou { passes: false, reason: '...' }.
 *
 * Nao filtra — apenas classifica. Use applyQualityGates() para filtrar listas.
 */
export function failsQualityGate(
  offer: QualityGateInput,
  config: QualityGatesConfig = DEFAULT_QUALITY_GATES,
): QualityGateResult {
  const current = Number(offer.currentPrice)
  const original = offer.originalPrice != null ? Number(offer.originalPrice) : null

  // Gate 1: preco minimo
  if (isNaN(current) || current < config.minPrice) {
    return {
      passes: false,
      reason: `Preco (R$${current.toFixed(2)}) abaixo do minimo (R$${config.minPrice})`,
    }
  }

  // Gate 2: desconto alto — validacao inteligente em camadas
  // Em vez de corte duro em 85%, usa sinais de confianca para decidir.
  // So rejeita se desconto > maxDiscount E confianca baixa.
  if (original != null && original > current) {
    const discount = Math.round(((original - current) / original) * 100)

    if (discount >= config.maxDiscount) {
      // Camada 1: >98% e quase certamente erro de parse — rejeita sempre
      if (discount >= 98) {
        return {
          passes: false,
          reason: `Desconto (${discount}%) acima de 98% — erro de parse`,
        }
      }

      // Camada 2: 85-97% — calcular confianca baseada em sinais
      const confidence = computeHighDiscountConfidence(offer, current, discount)

      // Camada 3: so rejeita se confianca < 35 (de 100)
      if (confidence < 35) {
        return {
          passes: false,
          reason: `Desconto (${discount}%) com confianca baixa (${confidence}/100) — provavel erro de dados`,
        }
      }

      // Desconto alto mas com sinais de confianca suficientes — aceita
      log.debug('quality-gate.desconto-alto-aceito', {
        discount,
        confidence,
        price: current,
        source: offer.sourceSlug,
      })
    }
  }

  // Gate 3: nota minima (null = sem nota = OK)
  if (
    offer.rating !== null &&
    offer.rating !== undefined &&
    Number(offer.rating) <= config.minRating
  ) {
    return {
      passes: false,
      reason: `Nota (${offer.rating}) abaixo do minimo (${config.minRating})`,
    }
  }

  // Gate 4: imagem obrigatoria
  if (config.requireImage && !offer.imageUrl) {
    return {
      passes: false,
      reason: 'Imagem obrigatoria nao encontrada',
    }
  }

  // Gate 5: afiliado obrigatorio
  if (config.requireAffiliate && !offer.affiliateUrl) {
    return {
      passes: false,
      reason: 'URL de afiliado obrigatoria nao encontrada',
    }
  }

  return { passes: true }
}

// ── Filtragem de lista ────────────────────────────────────────────────────

/**
 * Aplica quality gates a uma lista de ofertas.
 * Retorna apenas as ofertas que passaram em todos os gates.
 *
 * Se maxPerMarketplace > 0, tambem limita por marketplace.
 *
 * @param offers - Lista de ofertas para filtrar
 * @param config - Configuracao de quality gates (usa DEFAULT se omitido)
 * @returns Ofertas filtradas
 */
export function applyQualityGates<T extends QualityGateInput>(
  offers: T[],
  config: QualityGatesConfig = DEFAULT_QUALITY_GATES,
): T[] {
  const marketplaceCounts: Record<string, number> = {}
  const passed: T[] = []

  for (const offer of offers) {
    const result = failsQualityGate(offer, config)
    if (!result.passes) {
      log.debug('quality-gate.rejeitada', {
        reason: result.reason,
        price: offer.currentPrice,
        source: offer.sourceSlug,
      })
      continue
    }

    // Gate de limite por marketplace
    if (config.maxPerMarketplace > 0 && offer.sourceSlug) {
      const slug = offer.sourceSlug
      marketplaceCounts[slug] = (marketplaceCounts[slug] || 0) + 1
      if (marketplaceCounts[slug] > config.maxPerMarketplace) {
        log.debug('quality-gate.marketplace-limite', {
          source: slug,
          count: marketplaceCounts[slug],
          max: config.maxPerMarketplace,
        })
        continue
      }
    }

    passed.push(offer)
  }

  log.debug('quality-gate.resultado', {
    total: offers.length,
    aprovadas: passed.length,
    rejeitadas: offers.length - passed.length,
  })

  return passed
}

// ── Estatisticas de filtragem ─────────────────────────────────────────────

export interface QualityGateStats {
  total: number
  passed: number
  rejected: number
  rejectionReasons: Record<string, number>
}

/**
 * Aplica quality gates e retorna estatisticas detalhadas das rejeicoes.
 * Util para dashboards de observabilidade e diagnostico.
 */
export function applyQualityGatesWithStats<T extends QualityGateInput>(
  offers: T[],
  config: QualityGatesConfig = DEFAULT_QUALITY_GATES,
): { offers: T[]; stats: QualityGateStats } {
  const passed: T[] = []
  const rejectionReasons: Record<string, number> = {}
  const marketplaceCounts: Record<string, number> = {}

  for (const offer of offers) {
    const result = failsQualityGate(offer, config)
    if (!result.passes) {
      const key = result.reason || 'desconhecido'
      rejectionReasons[key] = (rejectionReasons[key] || 0) + 1
      continue
    }

    // Gate de limite por marketplace
    if (config.maxPerMarketplace > 0 && offer.sourceSlug) {
      const slug = offer.sourceSlug
      marketplaceCounts[slug] = (marketplaceCounts[slug] || 0) + 1
      if (marketplaceCounts[slug] > config.maxPerMarketplace) {
        const key = `Limite por marketplace (${slug})`
        rejectionReasons[key] = (rejectionReasons[key] || 0) + 1
        continue
      }
    }

    passed.push(offer)
  }

  return {
    offers: passed,
    stats: {
      total: offers.length,
      passed: passed.length,
      rejected: offers.length - passed.length,
      rejectionReasons,
    },
  }
}
