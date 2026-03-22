// ============================================================================
// UNIFIED COMMERCE ENGINE — WhatsApp Adapter
// Converte CommerceResponse para formato de mensagem WhatsApp.
//
// Regras:
//   - Maximo 3-5 itens por mensagem
//   - Formato visual com emoji: nome, preco, desconto, fonte, link
//   - Estruturas diferentes por tipo de intent
//   - Texto total maximo de 3000 caracteres
//   - Veredito ao final ("Minha recomendacao: ...")
//   - CTA para engajamento ("Quer ver mais opcoes?")
// ============================================================================

import type { CommerceResponse, ScoredOffer, ComparisonResult } from "./types"

// ── Tipos de resposta para WhatsApp ─────────────────────────────────────────

export interface WhatsAppResponse {
  /** Texto formatado da mensagem */
  text: string
  /** Quantidade de ofertas incluidas */
  offerCount: number
  /** Estrutura da mensagem */
  structure: "shortlist" | "hero" | "comparativo" | "single"
}

// ── Constantes ──────────────────────────────────────────────────────────────

/** Limite de caracteres para mensagem WhatsApp */
const MAX_CHARS = 3000

/** Maximo de ofertas na shortlist */
const MAX_SHORTLIST_ITEMS = 5

/** Minimo de ofertas para usar shortlist (abaixo usa single) */
const MIN_SHORTLIST_ITEMS = 2

// ── Adaptador principal ─────────────────────────────────────────────────────

/**
 * Adapta a resposta do commerce engine para formato WhatsApp.
 *
 * Decisao de estrutura:
 *   - 1 oferta → 'single' (hero com mais detalhes)
 *   - 2-5 ofertas → 'shortlist' (lista numerada)
 *   - Intent comparativo → 'comparativo' (lado a lado)
 *   - Intent best_under_budget → 'hero' (recomendacao forte)
 */
export function adaptForWhatsApp(response: CommerceResponse): WhatsAppResponse {
  const { offers, intent, comparison } = response

  // Sem resultados
  if (offers.length === 0) {
    return {
      text: buildEmptyResponse(),
      offerCount: 0,
      structure: "single",
    }
  }

  // Decidir estrutura baseada no intent e quantidade de ofertas
  const structure = decideStructure(response)

  let text: string
  switch (structure) {
    case "single":
      text = buildSingleMessage(offers[0], response)
      break
    case "hero":
      text = buildHeroMessage(offers, response)
      break
    case "comparativo":
      text = buildComparativoMessage(offers, comparison, response)
      break
    case "shortlist":
    default:
      text = buildShortlistMessage(offers, response)
      break
  }

  // Garantir limite de caracteres
  if (text.length > MAX_CHARS) {
    text = text.slice(0, MAX_CHARS - 3) + "..."
  }

  return {
    text,
    offerCount: Math.min(offers.length, MAX_SHORTLIST_ITEMS),
    structure,
  }
}

// ── Decisao de estrutura ────────────────────────────────────────────────────

function decideStructure(response: CommerceResponse): WhatsAppResponse["structure"] {
  const { offers, intent, comparison } = response

  // Intent comparativo com comparacao disponivel
  if (
    (intent.type === "compare_models" || intent.mode === "comparative") &&
    comparison
  ) {
    return "comparativo"
  }

  // Best under budget → hero com recomendacao forte
  if (intent.type === "best_under_budget" && offers.length > 0) {
    return "hero"
  }

  // Apenas 1 oferta → single com mais detalhes
  if (offers.length < MIN_SHORTLIST_ITEMS) {
    return "single"
  }

  // Default: shortlist
  return "shortlist"
}

// ── Builders de mensagem ────────────────────────────────────────────────────

/**
 * Mensagem para resultado unico — mais detalhada.
 */
function buildSingleMessage(offer: ScoredOffer, response: CommerceResponse): string {
  const lines: string[] = []

  lines.push(`*${offer.productName}*`)
  lines.push("")

  // Preco e desconto
  lines.push(`${formatPriceEmoji(offer)}`)
  if (offer.discount > 0 && offer.originalPrice) {
    lines.push(`De ~R$ ${formatNum(offer.originalPrice)}~ por *R$ ${formatNum(offer.currentPrice)}*`)
  } else {
    lines.push(`*R$ ${formatNum(offer.currentPrice)}*`)
  }

  // Marketplace
  lines.push(`\u{1F4E6} ${offer.sourceName}`)

  // Rating
  if (offer.rating) {
    lines.push(`\u{2B50} ${offer.rating.toFixed(1)}${offer.reviewsCount ? ` (${formatReviews(offer.reviewsCount)} avaliacoes)` : ""}`)
  }

  // Frete gratis
  if (offer.isFreeShipping) {
    lines.push(`\u{1F69A} Frete gratis`)
  }

  // Cupom
  if (offer.couponText) {
    lines.push(`\u{1F3F7}\uFE0F Cupom: ${offer.couponText}`)
  }

  // Link
  lines.push("")
  lines.push(`\u{1F449} ${offer.clickoutUrl}`)

  // Veredito
  const verdict = buildVerdictText(response, offer)
  if (verdict) {
    lines.push("")
    lines.push(verdict)
  }

  // CTA
  lines.push("")
  lines.push(buildCTA())

  return lines.join("\n")
}

/**
 * Mensagem hero — recomendacao forte para best_under_budget.
 */
function buildHeroMessage(offers: ScoredOffer[], response: CommerceResponse): string {
  const lines: string[] = []
  const best = offers[0]
  const budgetText = response.intent.budget
    ? ` ate R$ ${formatNum(response.intent.budget.max || 0)}`
    : ""

  lines.push(`\u{1F3AF} *Minha recomendacao${budgetText}:*`)
  lines.push("")

  // Oferta principal
  lines.push(`\u{1F525} *${best.productName}*`)
  lines.push(`\u{1F4B0} *R$ ${formatNum(best.currentPrice)}*${best.discount > 0 ? ` (-${best.discount}%)` : ""}`)
  lines.push(`\u{1F4E6} ${best.sourceName}`)

  if (best.isFreeShipping) {
    lines.push(`\u{1F69A} Frete gratis`)
  }

  lines.push(`\u{1F449} ${best.clickoutUrl}`)

  // Alternativas (se houver)
  const alts = offers.slice(1, 4)
  if (alts.length > 0) {
    lines.push("")
    lines.push("_Outras opcoes:_")
    for (let i = 0; i < alts.length; i++) {
      const alt = alts[i]
      lines.push(
        `${i + 2}. ${alt.productName} - R$ ${formatNum(alt.currentPrice)} (${alt.sourceName})`
      )
      lines.push(`   \u{1F449} ${alt.clickoutUrl}`)
    }
  }

  // Veredito
  const verdict = buildVerdictText(response, best)
  if (verdict) {
    lines.push("")
    lines.push(verdict)
  }

  // CTA
  lines.push("")
  lines.push(buildCTA())

  return lines.join("\n")
}

/**
 * Mensagem shortlist — lista numerada de 2-5 ofertas.
 */
function buildShortlistMessage(offers: ScoredOffer[], response: CommerceResponse): string {
  const lines: string[] = []
  const items = offers.slice(0, MAX_SHORTLIST_ITEMS)

  // Titulo
  const title = buildListTitle(response)
  lines.push(title)
  lines.push("")

  // Itens numerados
  for (let i = 0; i < items.length; i++) {
    const o = items[i]
    const num = i + 1

    lines.push(`*${num}. ${o.productName}*`)
    lines.push(`   \u{1F4B0} R$ ${formatNum(o.currentPrice)}${o.discount > 0 ? ` (-${o.discount}%)` : ""}`)
    lines.push(`   \u{1F4E6} ${o.sourceName}${o.isFreeShipping ? " \u{1F69A}" : ""}`)
    lines.push(`   \u{1F449} ${o.clickoutUrl}`)

    // Separador entre itens (exceto ultimo)
    if (i < items.length - 1) {
      lines.push("")
    }
  }

  // Veredito
  const verdict = buildVerdictText(response, items[0])
  if (verdict) {
    lines.push("")
    lines.push(verdict)
  }

  // CTA
  lines.push("")
  lines.push(buildCTA())

  return lines.join("\n")
}

/**
 * Mensagem comparativa — lado a lado.
 */
function buildComparativoMessage(
  offers: ScoredOffer[],
  comparison: ComparisonResult | undefined,
  response: CommerceResponse
): string {
  const lines: string[] = []
  const items = offers.slice(0, 3) // Max 3 para comparacao no WhatsApp

  lines.push(`\u{1F50D} *Comparacao:*`)
  lines.push("")

  // Itens lado a lado
  for (let i = 0; i < items.length; i++) {
    const o = items[i]
    const letter = String.fromCharCode(65 + i) // A, B, C

    lines.push(`*${letter}) ${o.productName}*`)
    lines.push(`   \u{1F4B0} R$ ${formatNum(o.currentPrice)}${o.discount > 0 ? ` (-${o.discount}%)` : ""}`)
    lines.push(`   \u{1F4E6} ${o.sourceName}`)

    if (o.rating) {
      lines.push(`   \u{2B50} ${o.rating.toFixed(1)}`)
    }
    if (o.isFreeShipping) {
      lines.push(`   \u{1F69A} Frete gratis`)
    }

    lines.push(`   \u{1F449} ${o.clickoutUrl}`)

    if (i < items.length - 1) {
      lines.push("")
    }
  }

  // Veredito da comparacao
  if (comparison?.verdict) {
    lines.push("")
    lines.push(`\u{1F3C6} *Veredito:* ${comparison.verdict}`)
  } else if (items.length >= 2) {
    // Gerar veredito simples
    const cheapest = items.reduce((a, b) => (a.currentPrice < b.currentPrice ? a : b))
    const bestScored = items.reduce((a, b) => (a.commercialScore > b.commercialScore ? a : b))

    lines.push("")
    if (cheapest.offerId === bestScored.offerId) {
      lines.push(`\u{1F3C6} *Veredito:* ${cheapest.productName} ganha em preco e qualidade!`)
    } else {
      lines.push(`\u{1F3C6} *Veredito:* Mais barato: ${cheapest.productName}. Melhor custo-beneficio: ${bestScored.productName}.`)
    }
  }

  // CTA
  lines.push("")
  lines.push(buildCTA())

  return lines.join("\n")
}

// ── Helpers internos ────────────────────────────────────────────────────────

/**
 * Formata preco com emoji contextual.
 */
function formatPriceEmoji(offer: ScoredOffer): string {
  if (offer.discount >= 30) return "\u{1F525} *Ofertaco!*"
  if (offer.discount >= 15) return "\u{1F4B0} *Bom preco!*"
  if (offer.isFreeShipping) return "\u{1F381} *Com frete gratis!*"
  return "\u{1F4B0} *Preco atual:*"
}

/**
 * Formata numero como preco brasileiro (sem simbolo R$).
 */
function formatNum(value: number): string {
  return value.toFixed(2).replace(".", ",")
}

/**
 * Formata contagem de reviews de forma compacta.
 */
function formatReviews(count: number): string {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
  return String(count)
}

/**
 * Gera titulo para lista baseado no intent.
 */
function buildListTitle(response: CommerceResponse): string {
  const count = Math.min(response.offers.length, MAX_SHORTLIST_ITEMS)

  switch (response.intent.type) {
    case "cheapest":
      return `\u{1F4B0} *${count} ofertas com menor preco:*`
    case "best_cost_benefit":
      return `\u{1F3AF} *${count} melhores custo-beneficio:*`
    case "has_promo":
      return `\u{1F525} *${count} promocoes encontradas:*`
    case "discovery":
      return `\u{1F50D} *${count} opcoes para voce:*`
    case "best_for_use":
      return `\u{1F3AF} *${count} melhores para o que precisa:*`
    case "alternative_to":
      return `\u{1F504} *${count} alternativas:*`
    case "similar_to":
      return `\u{1F504} *${count} produtos similares:*`
    default:
      return `\u{1F525} *${count} melhores ofertas:*`
  }
}

/**
 * Gera texto de veredito para a mensagem.
 */
function buildVerdictText(response: CommerceResponse, bestOffer: ScoredOffer): string | null {
  // Se a resposta do motor ja traz texto pre-composto
  if (response.responseText) {
    // Usar apenas a parte de recomendacao, truncada
    const truncated = response.responseText.length > 200
      ? response.responseText.slice(0, 200) + "..."
      : response.responseText
    return `\u{1F4AC} _${truncated}_`
  }

  // Se tem buy signal
  if (bestOffer.buySignal) {
    return `\u{1F4AC} _Minha recomendacao: ${bestOffer.buySignal.headline}_`
  }

  // Gerar veredito basico
  if (bestOffer.commercialScore >= 80) {
    return `\u{1F4AC} _Minha recomendacao: ${bestOffer.productName} na ${bestOffer.sourceName} e uma excelente escolha!_`
  }

  if (bestOffer.commercialScore >= 60) {
    return `\u{1F4AC} _Minha recomendacao: boa opcao, mas vale acompanhar o preco._`
  }

  return null
}

/**
 * Gera CTA padrao para engajamento.
 */
function buildCTA(): string {
  return "_Quer ver mais opcoes? Me manda o que procura!_ \u{1F4AC}"
}

/**
 * Mensagem quando nao ha resultados.
 */
function buildEmptyResponse(): string {
  return [
    "\u{1F614} Nao encontrei ofertas para essa busca.",
    "",
    "Tente de outro jeito:",
    "\u{2022} Use termos mais genericos",
    "\u{2022} Mude a faixa de preco",
    "\u{2022} Experimente outra categoria",
    "",
    "_Me manda o que procura que eu busco pra voce!_ \u{1F4AC}",
  ].join("\n")
}
