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
  /** Desconto maximo 85% — acima disso quase certamente e erro de dados */
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
    requireAffiliate: true,
    maxPerMarketplace: 2,
  },
  telegram: {
    requireImage: true,
    requireAffiliate: true,
    maxPerMarketplace: 2,
  },
  email: {
    requireImage: true,
    requireAffiliate: true,
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

  // Gate 2: desconto maximo (sanidade)
  if (original != null && original > current) {
    const discount = Math.round(((original - current) / original) * 100)
    if (discount >= config.maxDiscount) {
      return {
        passes: false,
        reason: `Desconto (${discount}%) acima do maximo (${config.maxDiscount}%) — provavel erro de dados`,
      }
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
