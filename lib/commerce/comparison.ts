// ============================================================================
// UNIFIED COMMERCE ENGINE — Comparison Layer
// Camada de comparacao unificada para intents comparativos.
//
// Responsabilidades:
//   - Comparar ofertas lado a lado em dimensoes relevantes
//   - Gerar veredito textual em pt-BR
//   - Identificar melhor custo-beneficio e mais barato
//   - Funcionar para site (tabela), WhatsApp (texto) e assistente
//
// Entrada: ScoredOffer[]
// Saida: ComparisonResult (dimensoes + veredito + bestValue + cheapest)
// ============================================================================

import { logger } from "@/lib/logger"
import type { ScoredOffer, ComparisonResult, ComparisonDimension } from "./types"

const log = logger.child({ module: "commerce.comparison" })

// ── Opcoes de comparacao ────────────────────────────────────────────────────

export interface ComparisonOptions {
  /** Maximo de produtos na comparacao (default: 4) */
  maxProducts?: number
  /** Incluir dimensao de frete */
  includeShipping?: boolean
  /** Incluir dimensao de avaliacao */
  includeRating?: boolean
  /** Incluir dimensao de score comercial */
  includeScore?: boolean
}

// ── Funcao principal ────────────────────────────────────────────────────────

/**
 * Compara uma lista de ofertas em dimensoes relevantes.
 *
 * Fluxo:
 * 1. Seleciona as top N ofertas (por score)
 * 2. Extrai dimensoes de comparacao (preco, desconto, loja, frete, avaliacao, score)
 * 3. Determina vencedor por dimensao
 * 4. Calcula melhor custo-beneficio e mais barato
 * 5. Gera veredito textual em pt-BR
 *
 * @param offers - Lista de ofertas ja pontuadas pelo scoring unificado
 * @param options - Configuracao da comparacao
 * @returns ComparisonResult com dimensoes, veredito e destaques
 */
export function compareOffers(
  offers: ScoredOffer[],
  options: ComparisonOptions = {}
): ComparisonResult | null {
  const maxProducts = options.maxProducts ?? 4
  const includeShipping = options.includeShipping ?? true
  const includeRating = options.includeRating ?? true
  const includeScore = options.includeScore ?? true

  if (offers.length < 2) {
    log.debug("comparison.insuficiente", { total: offers.length })
    return null
  }

  // Selecionar top N
  const selected = offers.slice(0, maxProducts)

  // ── Extrair dimensoes ─────────────────────────────────────────────────

  const dimensions: ComparisonDimension[] = []

  // Dimensao: Preco
  dimensions.push(buildPriceDimension(selected))

  // Dimensao: Desconto
  const discountDim = buildDiscountDimension(selected)
  if (discountDim) dimensions.push(discountDim)

  // Dimensao: Loja
  dimensions.push(buildStoreDimension(selected))

  // Dimensao: Frete
  if (includeShipping) {
    dimensions.push(buildShippingDimension(selected))
  }

  // Dimensao: Avaliacao
  if (includeRating) {
    const ratingDim = buildRatingDimension(selected)
    if (ratingDim) dimensions.push(ratingDim)
  }

  // Dimensao: Score comercial
  if (includeScore) {
    dimensions.push(buildScoreDimension(selected))
  }

  // ── Calcular destaques ────────────────────────────────────────────────

  const cheapest = selected.reduce(
    (a, b) => (a.currentPrice < b.currentPrice ? a : b)
  )

  const bestValue = selected.reduce(
    (a, b) => (a.commercialScore > b.commercialScore ? a : b)
  )

  // ── Gerar veredito ────────────────────────────────────────────────────

  const verdict = buildVerdict(selected, cheapest, bestValue, dimensions)

  log.debug("comparison.completa", {
    produtos: selected.length,
    dimensoes: dimensions.length,
    cheapest: cheapest.productSlug,
    bestValue: bestValue.productSlug,
  })

  return {
    products: selected,
    dimensions,
    verdict,
    bestValue: bestValue.productSlug,
    cheapest: cheapest.productSlug,
  }
}

// ── Builders de dimensao ──────────────────────────────────────────────────────

function buildPriceDimension(offers: ScoredOffer[]): ComparisonDimension {
  const values: Record<string, string> = {}
  let winnerSlug: string | undefined
  let lowestPrice = Infinity

  for (const o of offers) {
    values[o.productSlug] = formatPriceBR(o.currentPrice)
    if (o.currentPrice < lowestPrice) {
      lowestPrice = o.currentPrice
      winnerSlug = o.productSlug
    }
  }

  return {
    name: "Preco",
    values,
    winner: winnerSlug,
  }
}

function buildDiscountDimension(offers: ScoredOffer[]): ComparisonDimension | null {
  const hasAnyDiscount = offers.some(o => o.discount > 0)
  if (!hasAnyDiscount) return null

  const values: Record<string, string> = {}
  let winnerSlug: string | undefined
  let highestDiscount = 0

  for (const o of offers) {
    values[o.productSlug] = o.discount > 0 ? `-${o.discount}%` : "Sem desconto"
    if (o.discount > highestDiscount) {
      highestDiscount = o.discount
      winnerSlug = o.productSlug
    }
  }

  return {
    name: "Desconto",
    values,
    winner: winnerSlug,
  }
}

function buildStoreDimension(offers: ScoredOffer[]): ComparisonDimension {
  const values: Record<string, string> = {}
  for (const o of offers) {
    values[o.productSlug] = o.sourceName
  }
  // Sem vencedor — dimensao informativa
  return { name: "Loja", values }
}

function buildShippingDimension(offers: ScoredOffer[]): ComparisonDimension {
  const values: Record<string, string> = {}
  const freeShippingSlugs: string[] = []

  for (const o of offers) {
    if (o.isFreeShipping) {
      values[o.productSlug] = "Frete gratis"
      freeShippingSlugs.push(o.productSlug)
    } else {
      values[o.productSlug] = "Pago"
    }
  }

  return {
    name: "Frete",
    values,
    // Se so 1 tem frete gratis, ele vence
    winner: freeShippingSlugs.length === 1 ? freeShippingSlugs[0] : undefined,
  }
}

function buildRatingDimension(offers: ScoredOffer[]): ComparisonDimension | null {
  const hasAnyRating = offers.some(o => o.rating !== null && o.rating !== undefined)
  if (!hasAnyRating) return null

  const values: Record<string, string> = {}
  let winnerSlug: string | undefined
  let highestRating = 0

  for (const o of offers) {
    if (o.rating !== null && o.rating !== undefined) {
      values[o.productSlug] = `${o.rating.toFixed(1)}${o.reviewsCount ? ` (${formatReviewCount(o.reviewsCount)})` : ""}`
      if (o.rating > highestRating) {
        highestRating = o.rating
        winnerSlug = o.productSlug
      }
    } else {
      values[o.productSlug] = "Sem avaliacao"
    }
  }

  return {
    name: "Avaliacao",
    values,
    winner: winnerSlug,
  }
}

function buildScoreDimension(offers: ScoredOffer[]): ComparisonDimension {
  const values: Record<string, string> = {}
  let winnerSlug: string | undefined
  let highestScore = 0

  for (const o of offers) {
    values[o.productSlug] = `${o.commercialScore}/100`
    if (o.commercialScore > highestScore) {
      highestScore = o.commercialScore
      winnerSlug = o.productSlug
    }
  }

  return {
    name: "Score PromoSnap",
    values,
    winner: winnerSlug,
  }
}

// ── Veredito ──────────────────────────────────────────────────────────────────

function buildVerdict(
  offers: ScoredOffer[],
  cheapest: ScoredOffer,
  bestValue: ScoredOffer,
  dimensions: ComparisonDimension[]
): string {
  // Contar vitorias por produto
  const wins: Record<string, number> = {}
  for (const dim of dimensions) {
    if (dim.winner) {
      wins[dim.winner] = (wins[dim.winner] || 0) + 1
    }
  }

  // Produto com mais vitorias
  const overallWinner = Object.entries(wins).sort((a, b) => b[1] - a[1])[0]

  // Mesmo produto e o mais barato e o melhor custo-beneficio?
  if (cheapest.productSlug === bestValue.productSlug) {
    return `${cheapest.productName} na ${cheapest.sourceName} e a melhor opcao: menor preco (${formatPriceBR(cheapest.currentPrice)}) e melhor custo-beneficio (score ${cheapest.commercialScore}/100).`
  }

  // Diferenca de preco significativa?
  const priceDiff = Math.abs(cheapest.currentPrice - bestValue.currentPrice)
  const priceDiffPct = (priceDiff / bestValue.currentPrice) * 100

  if (priceDiffPct < 5) {
    // Precos muito proximos — melhor custo-beneficio vence
    return `Precos muito proximos! ${bestValue.productName} leva vantagem no custo-beneficio (score ${bestValue.commercialScore}/100) por apenas ${formatPriceBR(priceDiff)} a mais.`
  }

  // Destaque separado: mais barato vs melhor qualidade
  const parts: string[] = []
  parts.push(`Mais barato: ${cheapest.productName} por ${formatPriceBR(cheapest.currentPrice)} na ${cheapest.sourceName}.`)
  parts.push(`Melhor custo-beneficio: ${bestValue.productName} por ${formatPriceBR(bestValue.currentPrice)} na ${bestValue.sourceName} (score ${bestValue.commercialScore}/100).`)

  // Recomendacao final
  if (bestValue.commercialScore >= 75) {
    parts.push(`Recomendacao: ${bestValue.productName} — a diferenca de preco compensa pela qualidade.`)
  } else {
    parts.push(`Recomendacao: vale avaliar se a diferenca de ${formatPriceBR(priceDiff)} compensa para voce.`)
  }

  return parts.join(" ")
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatPriceBR(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function formatReviewCount(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return String(count)
}
