// ============================================================================
// UNIFIED COMMERCE ENGINE — Site Adapter
// Converte CommerceResponse para formato amigavel ao site.
// Usado pela pagina do assistente (/assistente) e resultados de busca (/busca).
//
// Responsabilidades:
//   - Criar blocos estruturados para a UI (offer_cards, comparison, verdict, etc.)
//   - Gerar texto de resumo em pt-BR
//   - Sugerir refinamentos de busca
//   - Decidir se deve sugerir alerta de preco
// ============================================================================

import type { CommerceResponse, ScoredOffer, ComparisonResult } from "./types"

// ── Tipos de resposta para o site ───────────────────────────────────────────

export interface SiteResponse {
  /** Blocos estruturados para renderizar na UI */
  blocks: SiteBlock[]
  /** Texto de resumo curto (1-2 frases) */
  summary: string
  /** Sugestoes de refinamento para o usuario */
  refinements: string[]
  /** Se deve mostrar prompt de alerta de preco */
  suggestAlert: boolean
}

export type SiteBlock =
  | { type: "offer_cards"; offers: ScoredOffer[]; title?: string }
  | { type: "comparison_table"; comparison: ComparisonResult }
  | { type: "verdict"; text: string; confidence: number }
  | { type: "alternatives"; offers: ScoredOffer[]; title: string }
  | { type: "external_results"; offers: ScoredOffer[]; title: string }
  | { type: "alert_prompt"; text: string; productSlug: string }

// ── Adaptador principal ─────────────────────────────────────────────────────

/**
 * Adapta a resposta do commerce engine para exibicao no site.
 *
 * Logica:
 * 1. Criar bloco offer_cards com os melhores resultados
 * 2. Criar comparison_table se houver comparacao
 * 3. Criar verdict se intent e decisional
 * 4. Criar alternatives se habilitado e houver dados
 * 5. Criar alert_prompt se suggestAlert e tivermos produto
 * 6. Gerar resumo em pt-BR baseado no tipo de intent
 */
export function adaptForSite(response: CommerceResponse): SiteResponse {
  const blocks: SiteBlock[] = []
  const { intent, offers, comparison } = response

  // ── 1. Bloco principal de ofertas ─────────────────────────────────────

  if (offers.length > 0) {
    const maxCards = resolveMaxCards(intent.mode)
    const mainOffers = offers.slice(0, maxCards)
    const title = buildOffersTitle(intent.type, offers.length)

    blocks.push({
      type: "offer_cards",
      offers: mainOffers,
      title,
    })
  }

  // ── 2. Tabela de comparacao ───────────────────────────────────────────

  if (comparison) {
    blocks.push({
      type: "comparison_table",
      comparison,
    })
  }

  // ── 3. Veredito (para intents decisional/comparativo) ─────────────────

  if (
    response.intent.mode === "decisional" ||
    response.intent.mode === "comparative"
  ) {
    const verdict = buildVerdict(response)
    if (verdict) {
      blocks.push(verdict)
    }
  }

  // ── 4. Alternativas ──────────────────────────────────────────────────

  if (response.suggestExternalSearch && offers.length > 0) {
    // Separar ofertas internas e externas (ex: SerpAPI)
    const externalOffers = offers.filter(
      o => o.sourceSlug === "google-shopping" || o.sourceSlug === "serpapi"
    )
    if (externalOffers.length > 0) {
      blocks.push({
        type: "external_results",
        offers: externalOffers.slice(0, 5),
        title: "Resultados de outros sites",
      })
    }
  }

  // ── 5. Prompt de alerta de preco ──────────────────────────────────────

  if (response.suggestAlert && offers.length > 0) {
    const topOffer = offers[0]
    blocks.push({
      type: "alert_prompt",
      text: `Quer pagar menos por ${topOffer.productName}? Crie um alerta e avisamos quando o preco cair!`,
      productSlug: topOffer.productSlug,
    })
  }

  // ── 6. Resumo ────────────────────────────────────────────────────────

  const summary = buildSummary(response)

  // ── 7. Refinamentos ──────────────────────────────────────────────────

  const refinements = buildRefinements(response)

  return {
    blocks,
    summary,
    refinements,
    suggestAlert: response.suggestAlert,
  }
}

// ── Helpers internos ────────────────────────────────────────────────────────

/**
 * Decide o numero maximo de cards baseado no modo do intent.
 * Exploratorio mostra mais; decisional foca nos melhores.
 */
function resolveMaxCards(mode: string): number {
  switch (mode) {
    case "exploratory":
      return 12
    case "comparative":
      return 6
    case "decisional":
      return 4
    case "urgent":
      return 3
    default:
      return 8
  }
}

/**
 * Gera titulo para o bloco de ofertas baseado no tipo de intent.
 */
function buildOffersTitle(intentType: string, count: number): string {
  switch (intentType) {
    case "cheapest":
      return `${count} ofertas com menor preco`
    case "best_under_budget":
      return `${count} melhores dentro do orcamento`
    case "best_cost_benefit":
      return `${count} melhores custo-beneficio`
    case "best_for_use":
      return `${count} melhores para o que precisa`
    case "compare_models":
      return "Comparacao de modelos"
    case "alternative_to":
      return `${count} alternativas encontradas`
    case "worth_it":
      return "Analise de preco"
    case "has_promo":
      return `${count} promocoes encontradas`
    case "similar_to":
      return `${count} produtos similares`
    case "discovery":
      return `${count} opcoes descobertas`
    case "specific_product":
      return "Melhores ofertas para este produto"
    default:
      return `${count} resultados encontrados`
  }
}

/**
 * Constroi bloco de veredito a partir da resposta.
 * Retorna null se nao houver dados suficientes para um veredito.
 */
function buildVerdict(response: CommerceResponse): SiteBlock | null {
  const { offers, comparison } = response

  if (offers.length === 0) return null

  // Se tem comparacao, usar o veredito dela
  if (comparison?.verdict) {
    return {
      type: "verdict",
      text: comparison.verdict,
      confidence: response.intent.confidence,
    }
  }

  // Gerar veredito basico a partir da melhor oferta
  const best = offers[0]
  let text: string

  if (best.buySignal) {
    text = best.buySignal.headline
  } else if (best.commercialScore >= 80) {
    text = `${best.productName} na ${best.sourceName} e uma excelente opcao com score ${best.commercialScore}/100.`
  } else if (best.commercialScore >= 60) {
    text = `${best.productName} na ${best.sourceName} e uma boa opcao. Considere comparar antes de decidir.`
  } else {
    text = `Encontramos ${best.productName} por R$ ${formatPriceBR(best.currentPrice)} na ${best.sourceName}. Recomendamos criar um alerta para acompanhar o preco.`
  }

  return {
    type: "verdict",
    text,
    confidence: response.intent.confidence,
  }
}

/**
 * Gera resumo em pt-BR da resposta.
 */
function buildSummary(response: CommerceResponse): string {
  const { offers, intent, totalFound, internalCount, externalCount } = response

  if (offers.length === 0) {
    return "Nao encontramos ofertas para essa busca. Tente termos diferentes ou crie um alerta de preco."
  }

  const best = offers[0]
  const priceStr = formatPriceBR(best.currentPrice)

  switch (intent.type) {
    case "cheapest":
      return `O menor preco encontrado e ${priceStr} na ${best.sourceName}.${
        totalFound > offers.length
          ? ` Mostrando ${offers.length} de ${totalFound} resultados.`
          : ""
      }`

    case "best_under_budget":
      return `A melhor opcao no seu orcamento e ${best.productName} por ${priceStr} na ${best.sourceName}.`

    case "best_cost_benefit":
      return `Melhor custo-beneficio: ${best.productName} por ${priceStr}${
        best.discount > 0 ? ` (-${best.discount}%)` : ""
      } na ${best.sourceName}.`

    case "compare_models":
      return `Comparacao pronta com ${offers.length} opcoes.${
        response.comparison
          ? ` Melhor custo-beneficio: ${response.comparison.bestValue}.`
          : ""
      }`

    case "worth_it":
      return `Analisamos ${best.productName}: preco atual ${priceStr} na ${best.sourceName}.`

    case "has_promo":
      return offers.length > 0
        ? `Encontramos ${totalFound} promocoes! A melhor e ${best.productName} por ${priceStr}${
            best.discount > 0 ? ` com ${best.discount}% de desconto` : ""
          }.`
        : "Nenhuma promocao encontrada no momento."

    case "discovery":
      return `Encontramos ${totalFound} opcoes.${
        internalCount > 0 && externalCount > 0
          ? ` ${internalCount} no catalogo e ${externalCount} de fontes externas.`
          : ""
      }`

    default:
      return `Encontramos ${totalFound} resultado${totalFound !== 1 ? "s" : ""}. Melhor opcao: ${best.productName} por ${priceStr}.`
  }
}

/**
 * Gera sugestoes de refinamento para a busca.
 */
function buildRefinements(response: CommerceResponse): string[] {
  const refinements: string[] = []

  // Se a resposta ja tem sugestoes do motor, usar essas
  if (response.refinementSuggestions && response.refinementSuggestions.length > 0) {
    return response.refinementSuggestions.slice(0, 4)
  }

  const { offers, intent } = response

  if (offers.length === 0) {
    refinements.push("Tente termos mais genericos")
    refinements.push("Remova filtros de marca ou categoria")
    return refinements
  }

  // Sugestoes baseadas no intent
  if (intent.type !== "cheapest") {
    refinements.push("Ordenar por menor preco")
  }
  if (intent.type !== "best_cost_benefit") {
    refinements.push("Ver melhor custo-beneficio")
  }
  if (!intent.budget) {
    refinements.push("Definir orcamento maximo")
  }
  if (offers.length >= 5) {
    refinements.push("Comparar os melhores")
  }

  return refinements.slice(0, 4)
}

// ── Formatacao de preco ─────────────────────────────────────────────────────

/**
 * Formata preco em formato brasileiro: R$ 1.299,00
 */
function formatPriceBR(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}
