// ============================================
// WhatsApp Broadcast — Template Library
// Copy, aberturas, CTAs, transicoes (Mega Prompt 02)
// ============================================

import type { MessageStructure, MessageTonality, TimeWindow, GroupType } from "./types"

// ============================================
// Aberturas (openings) por contexto
// ============================================

const OPENINGS_NEUTRAL = [
  "Separei as mais interessantes dessa janela.",
  "Essas foram as mais redondas que apareceram agora.",
  "O que vi de mais forte por aqui foi isso.",
  "Para nao te jogar um monte de coisa aleatoria, separei as melhores desta leva.",
  "Se a ideia e economizar com alguma logica, comecaria por estas.",
]

const OPENINGS_DISCOVERY = [
  "Dei uma filtrada no que apareceu e estas foram as que mais chamaram atencao.",
  "Na tua linha de busca, estas aqui fazem mais sentido.",
  "O que apareceu de realmente util nesta rodada foi isso.",
  "Entre as ofertas de agora, estas estao mais interessantes.",
  "Fiz um recorte do que vale o clique neste momento.",
]

const OPENINGS_COMMERCIAL = [
  "Se eu tivesse que abrir poucas agora, iria nessas.",
  "As mais fortes da janela foram estas.",
  "As melhores oportunidades desta rodada estao aqui.",
  "Estas aqui estao mais convincentes agora.",
  "Se for para clicar em poucas, eu iria primeiro nessas.",
]

const OPENINGS_ECONOMY = [
  "Se a prioridade for economizar, comecaria por estas.",
  "Para custo-beneficio, estas ficaram mais interessantes.",
  "As mais honestas para gastar menos estao aqui.",
  "Se a ideia e pagar menos sem pegar tranqueira, eu olharia estas.",
  "Estas estao melhores para quem quer segurar o bolso.",
]

const OPENINGS_URGENCY = [
  "Caiu preco em algumas que valem atencao agora.",
  "Estas ganharam forca nesta janela.",
  "Algumas ficaram realmente mais competitivas agora.",
  "Teve queda boa nessas aqui.",
  "Estas ficaram mais interessantes do que estavam antes.",
]

// ============================================
// Transicoes (transitions)
// ============================================

const TRANSITIONS = [
  "Outras opcoes boas estao logo abaixo.",
  "Se quiser variar mais, essas tambem merecem olhar.",
  "Para abrir o leque, estas tambem ficaram bem colocadas.",
  "Se quiser outras linhas de preco, eu olharia estas aqui tambem.",
  "Alem das principais, essas tambem ficaram interessantes.",
  "Se a ideia e comparar melhor, essas entram no radar.",
  "Para nao ficar preso so nas primeiras, essas tambem valem clique.",
  "Separei mais algumas opcoes equilibradas logo abaixo.",
  "Essas nao sao as principais, mas entram bem como alternativa.",
  "Se quiser esticar a busca, essas aqui ajudam bastante.",
]

// ============================================
// CTAs finais
// ============================================

const CTAS_CLICK = [
  "Se quiser ver tudo no detalhe, abri os links aqui embaixo.",
  "Da para comparar melhor clicando nas opcoes abaixo.",
  "Se alguma fizer sentido, aqui estao os links para abrir direto.",
  "Os links ja estao organizados logo abaixo para facilitar.",
  "Se quiser seguir por essas, deixei tudo pronto aqui.",
]

const CTAS_SITE = [
  "Se quiser continuar olhando sem sair do radar, entra no site e compara por la.",
  "Se quiser abrir mais opcoes nessa linha, tem continuacao no site.",
  "Para comparar melhor e acompanhar preco, vale seguir pelo site.",
  "Se quiser abrir outras alternativas com mais calma, segue pelo site.",
  "Se quiser ficar mais perto das proximas quedas, vale continuar no site.",
]

const CTAS_RECURRENCE = [
  "Se esse tipo de oferta te interessa, eu manteria isso no radar.",
  "Se quiser que eu continue separando esse tipo de coisa, da para seguir nessa linha.",
  "Se curtiu essa leva, vale acompanhar as proximas janelas.",
  "Se quiser continuar vendo so as boas, segue de olho nas proximas.",
  "Esse tipo de oferta costuma render bem quando entra no radar certo.",
]

// ============================================
// Time-window openings
// ============================================

const OPENINGS_MANHA = [
  "Radar da manha",
  "Comecando o dia com as mais interessantes",
  "O que apareceu de mais util ate agora",
  "Bom dia! Estas sao as melhores que encontrei agora cedo",
  "O radar matinal trouxe essas aqui",
]

const OPENINGS_ALMOCO = [
  "Achados do almoco",
  "Se eu fosse abrir poucas agora, iria nessas",
  "Essas estao bem colocadas nesta janela",
  "Pausa para o que vale a pena nessa hora",
  "Olha o que apareceu de bom na hora do almoco",
]

const OPENINGS_NOITE = [
  "Fechando o dia com as mais fortes",
  "Se eu tivesse que escolher poucas hoje, seriam essas",
  "O melhor da rodada ficou assim",
  "Encerramento do dia com as mais certeiras",
  "As que sobraram de melhor para fechar o dia",
]

// ============================================
// Group-type headers
// ============================================

const GROUP_HEADERS: Record<GroupType, string[]> = {
  geral: [
    "Melhores ofertas agora",
    "Radar de ofertas",
    "Achados do momento",
  ],
  tech: [
    "Tech em destaque",
    "Eletronicos do momento",
    "Gadgets com preco bom",
  ],
  casa: [
    "Casa & utilidades",
    "Para o dia a dia",
    "Achados para casa",
  ],
  "ticket-baixo": [
    "Ate R$ 100",
    "Bom e barato",
    "Economizando bem",
  ],
  premium: [
    "Destaques premium",
    "Investimento inteligente",
    "Compra de peso com desconto",
  ],
}

// ============================================
// Random picker with daily rotation
// ============================================

let lastOpeningIdx = -1
let lastTransitionIdx = -1
let lastCtaIdx = -1

function pickRandom<T>(arr: T[], lastIdx: number): [T, number] {
  if (arr.length <= 1) return [arr[0], 0]
  let idx: number
  do {
    idx = Math.floor(Math.random() * arr.length)
  } while (idx === lastIdx && arr.length > 1)
  return [arr[idx], idx]
}

// ============================================
// Public API
// ============================================

/**
 * Get an opening line by tonality context.
 */
export function getOpening(tonality: MessageTonality): string {
  let pool: string[]
  switch (tonality) {
    case "curadoria": pool = OPENINGS_DISCOVERY; break
    case "direto": pool = OPENINGS_COMMERCIAL; break
    case "editorial": pool = OPENINGS_NEUTRAL; break
    case "economico": pool = OPENINGS_ECONOMY; break
    case "urgente": pool = OPENINGS_URGENCY; break
    default: pool = OPENINGS_NEUTRAL
  }
  const [opening, idx] = pickRandom(pool, lastOpeningIdx)
  lastOpeningIdx = idx
  return opening
}

/**
 * Get opening for a specific time window.
 */
export function getTimeWindowOpening(window: TimeWindow): string {
  let pool: string[]
  switch (window) {
    case "manha": pool = OPENINGS_MANHA; break
    case "almoco": pool = OPENINGS_ALMOCO; break
    case "noite": pool = OPENINGS_NOITE; break
    default: pool = OPENINGS_NEUTRAL
  }
  const [opening] = pickRandom(pool, -1)
  return opening
}

/**
 * Get a transition line between main and secondary offers.
 */
export function getTransition(): string {
  const [transition, idx] = pickRandom(TRANSITIONS, lastTransitionIdx)
  lastTransitionIdx = idx
  return transition
}

/**
 * Get a CTA by intent.
 */
export function getCta(intent: "click" | "site" | "recurrence"): string {
  let pool: string[]
  switch (intent) {
    case "click": pool = CTAS_CLICK; break
    case "site": pool = CTAS_SITE; break
    case "recurrence": pool = CTAS_RECURRENCE; break
    default: pool = CTAS_CLICK
  }
  const [cta, idx] = pickRandom(pool, lastCtaIdx)
  lastCtaIdx = idx
  return cta
}

/**
 * Get group header by type.
 */
export function getGroupHeader(groupType: GroupType): string {
  const pool = GROUP_HEADERS[groupType] || GROUP_HEADERS.geral
  const [header] = pickRandom(pool, -1)
  return header
}

/**
 * Get the ideal offer count for a time window.
 */
export function getIdealOfferCount(window: TimeWindow): { min: number; max: number } {
  switch (window) {
    case "manha": return { min: 3, max: 5 }
    case "almoco": return { min: 3, max: 4 }
    case "noite": return { min: 2, max: 4 }
    default: return { min: 3, max: 5 }
  }
}

/**
 * Get recommended tonality for a time window.
 */
export function getRecommendedTonality(window: TimeWindow): MessageTonality {
  switch (window) {
    case "manha": return "editorial"
    case "almoco": return "direto"
    case "noite": return "curadoria"
    default: return "curadoria"
  }
}

/**
 * Get recommended structure for a time window.
 */
export function getRecommendedStructure(window: TimeWindow): MessageStructure {
  switch (window) {
    case "manha": return "radar"
    case "almoco": return "shortlist"
    case "noite": return "hero"
    default: return "shortlist"
  }
}

/**
 * Detect current time window based on hour (BRT = UTC-3).
 */
export function detectTimeWindow(hour?: number): TimeWindow {
  const h = hour ?? new Date().getUTCHours() - 3
  const normalizedHour = h < 0 ? h + 24 : h
  if (normalizedHour >= 6 && normalizedHour < 11) return "manha"
  if (normalizedHour >= 11 && normalizedHour < 15) return "almoco"
  return "noite"
}

/**
 * All template data for admin UI listing.
 */
export function getAllTemplateData() {
  return {
    openings: {
      neutral: OPENINGS_NEUTRAL,
      discovery: OPENINGS_DISCOVERY,
      commercial: OPENINGS_COMMERCIAL,
      economy: OPENINGS_ECONOMY,
      urgency: OPENINGS_URGENCY,
    },
    timeWindowOpenings: {
      manha: OPENINGS_MANHA,
      almoco: OPENINGS_ALMOCO,
      noite: OPENINGS_NOITE,
    },
    transitions: TRANSITIONS,
    ctas: {
      click: CTAS_CLICK,
      site: CTAS_SITE,
      recurrence: CTAS_RECURRENCE,
    },
    groupHeaders: GROUP_HEADERS,
  }
}
