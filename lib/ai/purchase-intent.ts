/**
 * Purchase Intent Scorer — pontua o quão pronto um utilizador está para comprar.
 *
 * Combina sinais de conversa (o que disse) com sinais comportamentais
 * (o que fez) para produzir um score de intenção de compra de 0-100.
 *
 * Consumido por: CRM lifecycle, personalização do assistente, estratégia
 * de follow-up, targeting de anúncios, cadência de email.
 */

import type { ClassifiedIntent } from './intent-classifier'

// ============================================
// TYPES
// ============================================

export type PurchasePhase =
  | 'browsing'
  | 'researching'
  | 'comparing'
  | 'deciding'
  | 'ready_to_buy'

export type IntentSignalSource = 'conversation' | 'behavior' | 'temporal' | 'contextual'

export interface IntentSignal {
  /** Origem do sinal */
  source: IntentSignalSource
  /** Tipo específico do sinal (ex: 'budget_mentioned', 'clickout') */
  type: string
  /** Peso relativo, 0-1 */
  weight: number
  /** Valor bruto associado ao sinal */
  value: unknown
  /** Descrição legível do sinal */
  description: string
}

export interface PurchaseIntentResult {
  /** Score final normalizado, 0-100 */
  score: number
  /** Fase de compra derivada do score */
  phase: PurchasePhase
  /** Confiança na classificação */
  confidence: 'high' | 'medium' | 'low'
  /** Sinais individuais que contribuíram para o score */
  signals: IntentSignal[]
  /** Ação recomendada para o sistema */
  recommendedAction: string
  /** Melhor próxima oferta/sugestão a apresentar */
  nextBestOffer: string
  /** Multiplicador de urgência (1.0 = normal, até 2.0 = máxima urgência) */
  urgencyMultiplier: number
}

export interface BehaviorSignals {
  /** Pesquisas nas últimas 24h */
  searchCount: number
  /** Produtos visualizados */
  productViews: number
  /** Cliques em links de afiliado */
  clickouts: number
  /** Alertas de preço criados */
  alertsCreated: number
  /** Produtos favoritados */
  favoritesCount: number
  /** Comparações realizadas */
  comparisons: number
  /** Dias desde a primeira pesquisa */
  daysSinceFirstSearch: number
  /** Visualizações repetidas do mesmo produto (2+) */
  repeatProductViews: number
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ScorePurchaseIntentParams {
  /** Mensagem atual do utilizador */
  query: string
  /** Histórico de conversa */
  conversationHistory: ConversationMessage[]
  /** Intent classificado pelo intent-classifier */
  classifiedIntent: ClassifiedIntent
  /** Sinais comportamentais (opcional — sem eles só usa conversa + contexto) */
  behaviorSignals?: Partial<BehaviorSignals>
}

// ============================================
// KEYWORD MAPS (pt-BR)
// ============================================

/** Palavras-chave que indicam menção explícita de orçamento */
const BUDGET_KEYWORDS = [
  /at[eé]\s*(?:R\$?\s*)?\d/i,
  /meu\s*or[cç]amento/i,
  /tenho\s*(?:R\$?\s*)?\d/i,
  /quero\s*gastar/i,
  /posso\s*pagar/i,
  /no\s*m[aá]ximo/i,
]

/** Menções de modelo/produto específico (marca + número/modelo) */
const SPECIFIC_PRODUCT_PATTERN =
  /(?:iphone|galaxy|xiaomi|redmi|poco|motorola|macbook|airpods|ps5|xbox|switch|pixel)\s*\d/i

/** Perguntas de "vale a pena" / decisão */
const WORTH_IT_KEYWORDS = [
  /vale\s*a?\s*pena/i,
  /compensa/i,
  /recomenda/i,
  /devo\s*comprar/i,
  /[eé]\s*bom/i,
  /qual\s*(?:o\s*)?melhor/i,
]

/** Comparação direta entre produtos */
const COMPARISON_KEYWORDS = [
  /\bvs\b/i,
  /versus/i,
  /comparar/i,
  /compara[cç][aã]o/i,
  /diferen[cç]a\s*entre/i,
  /\bou\b.*\bou\b/i, // "X ou Y ou Z"
]

/** Urgência explícita */
const URGENCY_KEYWORDS = [
  /urgente/i,
  /preciso\s*(?:hoje|agora|j[aá])/i,
  /r[aá]pido/i,
  /pressa/i,
  /n[aã]o\s*posso\s*esperar/i,
  /pra\s*ontem/i,
]

/** Sinais de negociação de preço */
const PRICE_NEGOTIATION_KEYWORDS = [
  /tem\s*mais\s*barato/i,
  /desconto/i,
  /promo[cç][aã]o/i,
  /cupom/i,
  /cashback/i,
  /pre[cç]o\s*(?:menor|melhor)/i,
  /abaixa/i,
  /baixou/i,
]

// ============================================
// MAIN FUNCTION
// ============================================

/**
 * Calcula o score de intenção de compra (0-100) combinando
 * 4 fatores: conversa, comportamento, temporal e contextual.
 */
export function scorePurchaseIntent(params: ScorePurchaseIntentParams): PurchaseIntentResult {
  const { query, conversationHistory, classifiedIntent, behaviorSignals } = params

  const signals: IntentSignal[] = []
  const behavior = normalizeBehavior(behaviorSignals)

  // --- Fator 1: Sinais de Conversa (max 25) ---
  const conversationScore = scoreConversationSignals(query, conversationHistory, signals)

  // --- Fator 2: Sinais Comportamentais (max 25) ---
  const behaviorScore = scoreBehaviorSignals(behavior, signals)

  // --- Fator 3: Sinais Temporais (max 25) ---
  const temporalScore = scoreTemporalSignals(query, conversationHistory, behavior, signals)

  // --- Fator 4: Sinais Contextuais (max 25) ---
  const contextualScore = scoreContextualSignals(classifiedIntent, signals)

  // Score bruto (soma dos 4 fatores, max 100)
  const rawScore = conversationScore + behaviorScore + temporalScore + contextualScore
  const score = clamp(Math.round(rawScore), 0, 100)

  // Derivar fase, confiança e ação
  const phase = determinePhase(score)
  const confidence = determineConfidence(signals, score)
  const urgencyMultiplier = computeUrgencyMultiplier(classifiedIntent, score)

  // Construir recomendações
  const category = classifiedIntent.categories?.[0] ?? 'produtos'
  const product = classifiedIntent.productMentions?.[0] ?? 'este produto'
  const recommendedAction = getRecommendedAction(phase)
  const nextBestOffer = getNextBestOffer(phase, category, product)

  return {
    score,
    phase,
    confidence,
    signals,
    recommendedAction,
    nextBestOffer,
    urgencyMultiplier,
  }
}

// ============================================
// FATOR 1: SINAIS DE CONVERSA (max 25)
// ============================================

function scoreConversationSignals(
  query: string,
  history: ConversationMessage[],
  signals: IntentSignal[]
): number {
  let score = 0
  const q = query.toLowerCase()
  const allUserMessages = [
    query,
    ...history.filter(m => m.role === 'user').map(m => m.content),
  ].join(' ').toLowerCase()

  // Orçamento mencionado explicitamente: +8
  if (BUDGET_KEYWORDS.some(re => re.test(allUserMessages))) {
    score += 8
    signals.push({
      source: 'conversation',
      type: 'budget_mentioned',
      weight: 0.8,
      value: true,
      description: 'Utilizador mencionou orçamento explícito',
    })
  }

  // Modelo/produto específico mencionado: +10
  if (SPECIFIC_PRODUCT_PATTERN.test(allUserMessages)) {
    score += 10
    signals.push({
      source: 'conversation',
      type: 'specific_product_mentioned',
      weight: 1.0,
      value: allUserMessages.match(SPECIFIC_PRODUCT_PATTERN)?.[0],
      description: 'Modelo de produto específico mencionado',
    })
  }

  // Perguntas de "vale a pena": +7
  if (WORTH_IT_KEYWORDS.some(re => re.test(q))) {
    score += 7
    signals.push({
      source: 'conversation',
      type: 'worth_it_question',
      weight: 0.7,
      value: true,
      description: 'Pergunta do tipo "vale a pena?" indica decisão próxima',
    })
  }

  // Comparação ("X vs Y"): +5
  if (COMPARISON_KEYWORDS.some(re => re.test(q))) {
    score += 5
    signals.push({
      source: 'conversation',
      type: 'comparison_query',
      weight: 0.5,
      value: true,
      description: 'Consulta de comparação entre produtos',
    })
  }

  // Urgência: +10
  if (URGENCY_KEYWORDS.some(re => re.test(q))) {
    score += 10
    signals.push({
      source: 'conversation',
      type: 'urgency_keyword',
      weight: 1.0,
      value: true,
      description: 'Palavras de urgência detetadas ("preciso hoje", "urgente")',
    })
  }

  // Follow-up (3+ mensagens do utilizador): +5
  const userMessageCount = history.filter(m => m.role === 'user').length + 1 // +1 para a query atual
  if (userMessageCount >= 3) {
    score += 5
    signals.push({
      source: 'conversation',
      type: 'follow_up_engagement',
      weight: 0.5,
      value: userMessageCount,
      description: `${userMessageCount} mensagens na conversa indicam envolvimento alto`,
    })
  }

  // Negociação de preço: +6
  if (PRICE_NEGOTIATION_KEYWORDS.some(re => re.test(q))) {
    score += 6
    signals.push({
      source: 'conversation',
      type: 'price_negotiation',
      weight: 0.6,
      value: true,
      description: 'Sinais de negociação de preço ("tem mais barato?", "desconto?")',
    })
  }

  return Math.min(score, 25)
}

// ============================================
// FATOR 2: SINAIS COMPORTAMENTAIS (max 25)
// ============================================

function scoreBehaviorSignals(
  behavior: BehaviorSignals,
  signals: IntentSignal[]
): number {
  let score = 0

  // Clickouts: +8 por clique, max 15
  if (behavior.clickouts > 0) {
    const pts = Math.min(behavior.clickouts * 8, 15)
    score += pts
    signals.push({
      source: 'behavior',
      type: 'clickouts',
      weight: pts / 15,
      value: behavior.clickouts,
      description: `${behavior.clickouts} clique(s) em links de afiliado — forte sinal de compra`,
    })
  }

  // Alertas criados: +10 (sinal muito forte)
  if (behavior.alertsCreated > 0) {
    score += 10
    signals.push({
      source: 'behavior',
      type: 'alerts_created',
      weight: 1.0,
      value: behavior.alertsCreated,
      description: `${behavior.alertsCreated} alerta(s) de preço criado(s) — intenção de compra clara`,
    })
  }

  // Visualizações repetidas (mesmo produto 2+): +8
  if (behavior.repeatProductViews >= 2) {
    score += 8
    signals.push({
      source: 'behavior',
      type: 'repeat_product_views',
      weight: 0.8,
      value: behavior.repeatProductViews,
      description: `Produto visto ${behavior.repeatProductViews}x — interesse focado`,
    })
  }

  // Comparações: +5
  if (behavior.comparisons >= 1) {
    score += 5
    signals.push({
      source: 'behavior',
      type: 'comparisons',
      weight: 0.5,
      value: behavior.comparisons,
      description: `${behavior.comparisons} comparação(ões) entre produtos`,
    })
  }

  // Favoritos: +4
  if (behavior.favoritesCount > 0) {
    score += 4
    signals.push({
      source: 'behavior',
      type: 'favorites',
      weight: 0.4,
      value: behavior.favoritesCount,
      description: `${behavior.favoritesCount} produto(s) favoritado(s)`,
    })
  }

  // Muitas buscas em 24h: +5
  if (behavior.searchCount >= 3) {
    score += 5
    signals.push({
      source: 'behavior',
      type: 'high_search_volume',
      weight: 0.5,
      value: behavior.searchCount,
      description: `${behavior.searchCount} pesquisas em 24h — utilizador ativo`,
    })
  }

  return Math.min(score, 25)
}

// ============================================
// FATOR 3: SINAIS TEMPORAIS (max 25)
// ============================================

function scoreTemporalSignals(
  query: string,
  history: ConversationMessage[],
  behavior: BehaviorSignals,
  signals: IntentSignal[]
): number {
  let score = 0

  // Conversa com 3+ mensagens: +5
  const totalMessages = history.length + 1
  if (totalMessages >= 3) {
    score += 5
    signals.push({
      source: 'temporal',
      type: 'conversation_depth',
      weight: 0.5,
      value: totalMessages,
      description: `Conversa com ${totalMessages} mensagens — sessão longa`,
    })
  }

  // Intenção recente (< 3 dias): +8
  if (behavior.daysSinceFirstSearch >= 0 && behavior.daysSinceFirstSearch < 3) {
    score += 8
    signals.push({
      source: 'temporal',
      type: 'fresh_intent',
      weight: 0.8,
      value: behavior.daysSinceFirstSearch,
      description: 'Intenção fresca — primeira pesquisa há menos de 3 dias',
    })
  }
  // Pesquisando (3-7 dias): +5
  else if (behavior.daysSinceFirstSearch >= 3 && behavior.daysSinceFirstSearch <= 7) {
    score += 5
    signals.push({
      source: 'temporal',
      type: 'researching_window',
      weight: 0.5,
      value: behavior.daysSinceFirstSearch,
      description: 'Janela de pesquisa ativa (3-7 dias)',
    })
  }
  // Perdendo interesse (> 14 dias): -5
  else if (behavior.daysSinceFirstSearch > 14) {
    score -= 5
    signals.push({
      source: 'temporal',
      type: 'losing_interest',
      weight: -0.5,
      value: behavior.daysSinceFirstSearch,
      description: `${behavior.daysSinceFirstSearch} dias desde a primeira pesquisa — interesse pode estar a diminuir`,
    })
  }

  // Conversa recente tem produto + preço: +7
  const recentText = [query, ...history.slice(-4).map(m => m.content)].join(' ').toLowerCase()
  const hasProductRef = SPECIFIC_PRODUCT_PATTERN.test(recentText)
  const hasPriceRef = /r\$\s*\d|pre[cç]o|valor|custa/i.test(recentText)
  if (hasProductRef && hasPriceRef) {
    score += 7
    signals.push({
      source: 'temporal',
      type: 'product_and_price_recent',
      weight: 0.7,
      value: true,
      description: 'Conversa recente menciona produto específico + preço',
    })
  }

  return Math.min(Math.max(score, 0), 25)
}

// ============================================
// FATOR 4: SINAIS CONTEXTUAIS (max 25)
// ============================================

function scoreContextualSignals(
  intent: ClassifiedIntent,
  signals: IntentSignal[]
): number {
  let score = 0

  // Tipo de intent: produto específico (+10)
  if (intent.type === 'specific_product') {
    score += 10
    signals.push({
      source: 'contextual',
      type: 'intent_specific_product',
      weight: 1.0,
      value: intent.type,
      description: 'Intent classificado como produto específico',
    })
  }
  // Tipo: "vale a pena" (+8)
  else if (intent.type === 'worth_it') {
    score += 8
    signals.push({
      source: 'contextual',
      type: 'intent_worth_it',
      weight: 0.8,
      value: intent.type,
      description: 'Intent classificado como "vale a pena?"',
    })
  }
  // Tipo: mais barato / melhor no orçamento (+7)
  else if (intent.type === 'cheapest' || intent.type === 'best_under_budget') {
    score += 7
    signals.push({
      source: 'contextual',
      type: 'intent_price_focused',
      weight: 0.7,
      value: intent.type,
      description: `Intent focado em preço (${intent.type})`,
    })
  }

  // Modo decisional ou urgente: +8
  if (intent.mode === 'decisional' || intent.mode === 'urgent') {
    score += 8
    signals.push({
      source: 'contextual',
      type: 'intent_mode_decisive',
      weight: 0.8,
      value: intent.mode,
      description: `Modo do intent: ${intent.mode} — utilizador perto da decisão`,
    })
  }

  // Confiança alta do classifier: +5
  if (intent.confidence > 0.8) {
    score += 5
    signals.push({
      source: 'contextual',
      type: 'high_classifier_confidence',
      weight: 0.5,
      value: intent.confidence,
      description: `Confiança do classifier: ${(intent.confidence * 100).toFixed(0)}%`,
    })
  }

  // Categoria detetada (sabe o que quer): +3
  if (intent.categories && intent.categories.length > 0) {
    score += 3
    signals.push({
      source: 'contextual',
      type: 'category_detected',
      weight: 0.3,
      value: intent.categories,
      description: `Categoria(s) identificada(s): ${intent.categories.join(', ')}`,
    })
  }

  return Math.min(score, 25)
}

// ============================================
// PHASE, CONFIDENCE & RECOMMENDATIONS
// ============================================

/** Determina a fase de compra com base no score */
function determinePhase(score: number): PurchasePhase {
  if (score <= 20) return 'browsing'
  if (score <= 40) return 'researching'
  if (score <= 60) return 'comparing'
  if (score <= 80) return 'deciding'
  return 'ready_to_buy'
}

/** Determina a confiança com base na quantidade e qualidade dos sinais */
function determineConfidence(
  signals: IntentSignal[],
  score: number
): 'high' | 'medium' | 'low' {
  // Contar fontes distintas que contribuíram
  const distinctSources = new Set(signals.map(s => s.source)).size

  // Sinais fortes (weight >= 0.7)
  const strongSignals = signals.filter(s => s.weight >= 0.7).length

  if (distinctSources >= 3 && strongSignals >= 2) return 'high'
  if (distinctSources >= 2 || strongSignals >= 1) return 'medium'
  return 'low'
}

/** Ação recomendada para o sistema com base na fase */
function getRecommendedAction(phase: PurchasePhase): string {
  const actions: Record<PurchasePhase, string> = {
    browsing: 'Show trending and discovery content',
    researching: 'Show guides, comparisons, and educational content',
    comparing: 'Show comparison tables, highlight differentiators',
    deciding: 'Show deal verdict, price alerts, urgency signals',
    ready_to_buy: 'Show best offer, clear CTA, free shipping highlight',
  }
  return actions[phase]
}

/** Próxima melhor oferta/sugestão para apresentar */
function getNextBestOffer(
  phase: PurchasePhase,
  category: string,
  product: string
): string {
  const offers: Record<PurchasePhase, string> = {
    browsing: `Explore tendências em ${category}`,
    researching: `Leia nosso guia de compra para ${category}`,
    comparing: 'Compare os seus favoritos lado a lado',
    deciding: `Crie um alerta de preço para ${product} — ele já baixou antes`,
    ready_to_buy: `Melhor preço agora disponível para ${product}`,
  }
  return offers[phase]
}

// ============================================
// EXPORTED HELPERS
// ============================================

/** Extrai sinais de conversa do texto para uso externo (ex: CRM) */
export function extractConversationSignals(
  query: string,
  history: ConversationMessage[]
): IntentSignal[] {
  const signals: IntentSignal[] = []
  // Reutiliza a lógica interna, descartando o score
  scoreConversationSignals(query, history, signals)
  return signals
}

/**
 * Calcula o multiplicador de urgência (1.0-2.0).
 *
 * Urgência alta + score alto = multiplicador maior.
 * Usado para priorizar notificações e cadência de emails.
 */
export function computeUrgencyMultiplier(
  intent: ClassifiedIntent,
  score: number
): number {
  let multiplier = 1.0

  // Urgência do intent
  if (intent.urgency === 'high') {
    multiplier += 0.4
  } else if (intent.urgency === 'medium') {
    multiplier += 0.15
  }

  // Modo urgent adiciona bónus
  if (intent.mode === 'urgent') {
    multiplier += 0.2
  }

  // Score alto amplifica a urgência
  if (score >= 80) {
    multiplier += 0.2
  } else if (score >= 60) {
    multiplier += 0.1
  }

  return Math.min(multiplier, 2.0)
}

/** Label em português para cada fase */
export function getPurchasePhaseLabel(phase: PurchasePhase): string {
  const labels: Record<PurchasePhase, string> = {
    browsing: 'Explorando',
    researching: 'Pesquisando',
    comparing: 'Comparando',
    deciding: 'Decidindo',
    ready_to_buy: 'Pronto para comprar',
  }
  return labels[phase]
}

/** Emoji representativo de cada fase */
export function getPhaseEmoji(phase: PurchasePhase): string {
  const emojis: Record<PurchasePhase, string> = {
    browsing: '\uD83D\uDC40',      // eyes
    researching: '\uD83D\uDD0D',    // magnifying glass
    comparing: '\u2696\uFE0F',      // scales
    deciding: '\uD83E\uDD14',       // thinking face
    ready_to_buy: '\uD83D\uDE80',   // rocket
  }
  return emojis[phase]
}

// ============================================
// INTERNAL HELPERS
// ============================================

/** Normaliza sinais comportamentais parciais com defaults seguros */
function normalizeBehavior(raw?: Partial<BehaviorSignals>): BehaviorSignals {
  return {
    searchCount: raw?.searchCount ?? 0,
    productViews: raw?.productViews ?? 0,
    clickouts: raw?.clickouts ?? 0,
    alertsCreated: raw?.alertsCreated ?? 0,
    favoritesCount: raw?.favoritesCount ?? 0,
    comparisons: raw?.comparisons ?? 0,
    daysSinceFirstSearch: raw?.daysSinceFirstSearch ?? -1,
    repeatProductViews: raw?.repeatProductViews ?? 0,
  }
}

/** Clamp um valor entre min e max */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
