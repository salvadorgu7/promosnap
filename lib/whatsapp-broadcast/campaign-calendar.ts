// ============================================
// WhatsApp Broadcast — Campaign Calendar
// Calendário promocional + campanhas sazonais
// Mega Prompt 03 — Parte 2, 3, 7
// ============================================

import { logger } from "@/lib/logger"
import type { MessageStructure, MessageTonality } from "./types"

const log = logger.child({ module: "wa-broadcast.campaign-calendar" })

// ============================================
// Campaign status lifecycle
// ============================================

export type CampaignPhase =
  | "draft"
  | "scheduled"
  | "warmup"      // aquecimento
  | "active"      // disparo principal
  | "reinforcement" // reforço
  | "winding_down"  // encerrando
  | "ended"
  | "recyclable"  // pode ser reaproveitada

// ============================================
// Promotional Event (data comercial)
// ============================================

export interface PromoEvent {
  id: string
  name: string
  slug: string
  startDate: string  // MM-DD
  endDate: string    // MM-DD
  warmupDays: number
  reinforcementDays: number
  categories: string[]
  marketplaces: string[]
  isRecurring: boolean // repete todo ano
  priority: number     // 1-10
  defaultOfferCount: number
  defaultStructure: MessageStructure
  defaultTonality: MessageTonality
  defaultMinScore: number
  defaultFrequency: number // msgs/day during active
}

// ============================================
// Built-in promotional calendar (2026)
// ============================================

const PROMO_CALENDAR: PromoEvent[] = [
  {
    id: "evt_consumidor",
    name: "Semana do Consumidor",
    slug: "semana-consumidor",
    startDate: "03-10",
    endDate: "03-17",
    warmupDays: 3,
    reinforcementDays: 2,
    categories: [],
    marketplaces: [],
    isRecurring: true,
    priority: 8,
    defaultOfferCount: 5,
    defaultStructure: "radar",
    defaultTonality: "curadoria",
    defaultMinScore: 50,
    defaultFrequency: 3,
  },
  {
    id: "evt_maes",
    name: "Dia das Maes",
    slug: "dia-das-maes",
    startDate: "05-01",
    endDate: "05-12",
    warmupDays: 5,
    reinforcementDays: 1,
    categories: ["beleza", "moda", "casa", "eletrodomesticos"],
    marketplaces: [],
    isRecurring: true,
    priority: 9,
    defaultOfferCount: 5,
    defaultStructure: "hero",
    defaultTonality: "editorial",
    defaultMinScore: 50,
    defaultFrequency: 2,
  },
  {
    id: "evt_namorados",
    name: "Dia dos Namorados",
    slug: "dia-dos-namorados",
    startDate: "06-01",
    endDate: "06-12",
    warmupDays: 5,
    reinforcementDays: 1,
    categories: ["beleza", "moda", "relogios", "eletronicos"],
    marketplaces: [],
    isRecurring: true,
    priority: 7,
    defaultOfferCount: 4,
    defaultStructure: "radar",
    defaultTonality: "curadoria",
    defaultMinScore: 50,
    defaultFrequency: 2,
  },
  {
    id: "evt_pais",
    name: "Dia dos Pais",
    slug: "dia-dos-pais",
    startDate: "08-01",
    endDate: "08-11",
    warmupDays: 5,
    reinforcementDays: 1,
    categories: ["eletronicos", "games", "moda", "ferramentas"],
    marketplaces: [],
    isRecurring: true,
    priority: 7,
    defaultOfferCount: 4,
    defaultStructure: "hero",
    defaultTonality: "direto",
    defaultMinScore: 50,
    defaultFrequency: 2,
  },
  {
    id: "evt_prime_day",
    name: "Prime Day",
    slug: "prime-day",
    startDate: "07-08",
    endDate: "07-10",
    warmupDays: 3,
    reinforcementDays: 1,
    categories: [],
    marketplaces: ["amazon-br"],
    isRecurring: true,
    priority: 9,
    defaultOfferCount: 6,
    defaultStructure: "shortlist",
    defaultTonality: "urgente",
    defaultMinScore: 45,
    defaultFrequency: 4,
  },
  {
    id: "evt_1111",
    name: "11.11",
    slug: "11-11",
    startDate: "11-09",
    endDate: "11-12",
    warmupDays: 3,
    reinforcementDays: 1,
    categories: [],
    marketplaces: ["shopee", "shein"],
    isRecurring: true,
    priority: 8,
    defaultOfferCount: 5,
    defaultStructure: "shortlist",
    defaultTonality: "urgente",
    defaultMinScore: 45,
    defaultFrequency: 3,
  },
  {
    id: "evt_black_friday",
    name: "Black Friday",
    slug: "black-friday",
    startDate: "11-20",
    endDate: "11-30",
    warmupDays: 7,
    reinforcementDays: 3,
    categories: [],
    marketplaces: [],
    isRecurring: true,
    priority: 10,
    defaultOfferCount: 6,
    defaultStructure: "hero",
    defaultTonality: "urgente",
    defaultMinScore: 40,
    defaultFrequency: 5,
  },
  {
    id: "evt_cyber_monday",
    name: "Cyber Monday",
    slug: "cyber-monday",
    startDate: "12-01",
    endDate: "12-02",
    warmupDays: 1,
    reinforcementDays: 1,
    categories: ["eletronicos", "informatica", "games"],
    marketplaces: [],
    isRecurring: true,
    priority: 8,
    defaultOfferCount: 5,
    defaultStructure: "shortlist",
    defaultTonality: "urgente",
    defaultMinScore: 45,
    defaultFrequency: 3,
  },
  {
    id: "evt_1212",
    name: "12.12",
    slug: "12-12",
    startDate: "12-10",
    endDate: "12-13",
    warmupDays: 2,
    reinforcementDays: 1,
    categories: [],
    marketplaces: ["shopee", "shein"],
    isRecurring: true,
    priority: 7,
    defaultOfferCount: 5,
    defaultStructure: "shortlist",
    defaultTonality: "economico",
    defaultMinScore: 45,
    defaultFrequency: 3,
  },
  {
    id: "evt_natal",
    name: "Natal",
    slug: "natal",
    startDate: "12-10",
    endDate: "12-24",
    warmupDays: 5,
    reinforcementDays: 0,
    categories: [],
    marketplaces: [],
    isRecurring: true,
    priority: 9,
    defaultOfferCount: 5,
    defaultStructure: "radar",
    defaultTonality: "editorial",
    defaultMinScore: 50,
    defaultFrequency: 3,
  },
  {
    id: "evt_volta_aulas",
    name: "Volta as Aulas",
    slug: "volta-aulas",
    startDate: "01-15",
    endDate: "02-10",
    warmupDays: 5,
    reinforcementDays: 2,
    categories: ["informatica", "notebooks", "tablets", "papelaria"],
    marketplaces: [],
    isRecurring: true,
    priority: 6,
    defaultOfferCount: 4,
    defaultStructure: "radar",
    defaultTonality: "economico",
    defaultMinScore: 50,
    defaultFrequency: 2,
  },
]

// ============================================
// Campaign Template Library (Parte 9)
// ============================================

export interface CampaignTemplate {
  id: string
  name: string
  slug: string
  description: string
  // Selection rules
  categorySlugs: string[]
  marketplaces: string[]
  minScore: number
  maxTicket: number | null
  minTicket: number | null
  minDiscount: number | null
  offerCount: number
  prioritizeTopSellers: boolean
  // Message
  structure: MessageStructure
  tonality: MessageTonality
  // Scheduling
  frequency: number // msgs/day
  preferredHours: string[] // ["08:30", "12:00", "19:00"]
}

const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: "tpl_eletronicos_dia",
    name: "Eletronicos do Dia",
    slug: "eletronicos-do-dia",
    description: "Top eletronicos com desconto real",
    categorySlugs: ["eletronicos", "smartphones", "notebooks", "fones", "tvs"],
    marketplaces: [],
    minScore: 50,
    maxTicket: null,
    minTicket: null,
    minDiscount: 10,
    offerCount: 5,
    prioritizeTopSellers: true,
    structure: "radar",
    tonality: "direto",
    frequency: 1,
    preferredHours: ["12:00"],
  },
  {
    id: "tpl_radar_casa",
    name: "Radar Casa",
    slug: "radar-casa",
    description: "Utilidades e eletrodomesticos com bom preco",
    categorySlugs: ["casa", "eletrodomesticos", "cozinha", "decoracao"],
    marketplaces: [],
    minScore: 45,
    maxTicket: 500,
    minTicket: null,
    minDiscount: null,
    offerCount: 4,
    prioritizeTopSellers: true,
    structure: "shortlist",
    tonality: "curadoria",
    frequency: 1,
    preferredHours: ["08:30"],
  },
  {
    id: "tpl_ate_100",
    name: "Ate R$ 100",
    slug: "ate-100",
    description: "Achados baratos com qualidade",
    categorySlugs: [],
    marketplaces: [],
    minScore: 45,
    maxTicket: 100,
    minTicket: null,
    minDiscount: null,
    offerCount: 6,
    prioritizeTopSellers: true,
    structure: "shortlist",
    tonality: "economico",
    frequency: 1,
    preferredHours: ["19:00"],
  },
  {
    id: "tpl_ate_300",
    name: "Ate R$ 300",
    slug: "ate-300",
    description: "Custo-beneficio medio",
    categorySlugs: [],
    marketplaces: [],
    minScore: 50,
    maxTicket: 300,
    minTicket: 50,
    minDiscount: null,
    offerCount: 5,
    prioritizeTopSellers: true,
    structure: "radar",
    tonality: "curadoria",
    frequency: 1,
    preferredHours: ["12:00"],
  },
  {
    id: "tpl_top_vendidos",
    name: "Top Mais Vendidos",
    slug: "top-vendidos",
    description: "Os mais vendidos com desconto",
    categorySlugs: [],
    marketplaces: [],
    minScore: 60,
    maxTicket: null,
    minTicket: null,
    minDiscount: 10,
    offerCount: 5,
    prioritizeTopSellers: true,
    structure: "hero",
    tonality: "direto",
    frequency: 1,
    preferredHours: ["19:00"],
  },
  {
    id: "tpl_queda_preco",
    name: "Queda Forte de Preco",
    slug: "queda-preco",
    description: "Produtos que cairam significativamente",
    categorySlugs: [],
    marketplaces: [],
    minScore: 50,
    maxTicket: null,
    minTicket: null,
    minDiscount: 25,
    offerCount: 4,
    prioritizeTopSellers: false,
    structure: "hero",
    tonality: "urgente",
    frequency: 1,
    preferredHours: ["12:00"],
  },
  {
    id: "tpl_campanha_ml",
    name: "Achados Mercado Livre",
    slug: "achados-ml",
    description: "Melhores do ML do momento",
    categorySlugs: [],
    marketplaces: ["mercadolivre"],
    minScore: 50,
    maxTicket: null,
    minTicket: null,
    minDiscount: null,
    offerCount: 5,
    prioritizeTopSellers: true,
    structure: "shortlist",
    tonality: "curadoria",
    frequency: 1,
    preferredHours: ["08:30"],
  },
  {
    id: "tpl_campanha_amazon",
    name: "Radar Amazon",
    slug: "radar-amazon",
    description: "Top Amazon com desconto",
    categorySlugs: [],
    marketplaces: ["amazon-br"],
    minScore: 50,
    maxTicket: null,
    minTicket: null,
    minDiscount: null,
    offerCount: 5,
    prioritizeTopSellers: true,
    structure: "radar",
    tonality: "direto",
    frequency: 1,
    preferredHours: ["12:00"],
  },
  {
    id: "tpl_campanha_shopee",
    name: "Top Shopee ate R$ 100",
    slug: "top-shopee-100",
    description: "Achados Shopee baratos",
    categorySlugs: [],
    marketplaces: ["shopee"],
    minScore: 40,
    maxTicket: 100,
    minTicket: null,
    minDiscount: null,
    offerCount: 6,
    prioritizeTopSellers: true,
    structure: "shortlist",
    tonality: "economico",
    frequency: 1,
    preferredHours: ["19:00"],
  },
  {
    id: "tpl_gamer",
    name: "Mais Vendidos Gamer",
    slug: "mais-vendidos-gamer",
    description: "Games, perifericos e consoles",
    categorySlugs: ["games", "consoles", "perifericos", "gamer"],
    marketplaces: [],
    minScore: 50,
    maxTicket: null,
    minTicket: null,
    minDiscount: 10,
    offerCount: 4,
    prioritizeTopSellers: true,
    structure: "comparativo",
    tonality: "direto",
    frequency: 1,
    preferredHours: ["19:00"],
  },
  {
    id: "tpl_premium",
    name: "Radar Premium",
    slug: "radar-premium",
    description: "Itens de alto valor com desconto real",
    categorySlugs: [],
    marketplaces: [],
    minScore: 60,
    maxTicket: null,
    minTicket: 500,
    minDiscount: 15,
    offerCount: 3,
    prioritizeTopSellers: false,
    structure: "hero",
    tonality: "editorial",
    frequency: 1,
    preferredHours: ["19:00"],
  },
  {
    id: "tpl_resumo_semanal",
    name: "Resumo Semanal",
    slug: "resumo-semanal",
    description: "As melhores da semana consolidadas",
    categorySlugs: [],
    marketplaces: [],
    minScore: 60,
    maxTicket: null,
    minTicket: null,
    minDiscount: 10,
    offerCount: 5,
    prioritizeTopSellers: true,
    structure: "resumo",
    tonality: "curadoria",
    frequency: 1,
    preferredHours: ["10:00"],
  },
]

// ============================================
// Public API
// ============================================

/**
 * Get the full promotional calendar.
 */
export function getPromoCalendar(): PromoEvent[] {
  return PROMO_CALENDAR
}

/**
 * Get events active right now or in the next N days.
 */
export function getUpcomingEvents(daysAhead: number = 30): PromoEvent[] {
  const now = new Date()
  const year = now.getFullYear()

  return PROMO_CALENDAR.filter(evt => {
    const [startMonth, startDay] = evt.startDate.split("-").map(Number)
    const [endMonth, endDay] = evt.endDate.split("-").map(Number)

    const start = new Date(year, startMonth - 1, startDay - evt.warmupDays)
    const end = new Date(year, endMonth - 1, endDay + evt.reinforcementDays)

    const futureLimit = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

    return (now >= start && now <= end) || (start >= now && start <= futureLimit)
  }).sort((a, b) => a.priority > b.priority ? -1 : 1)
}

/**
 * Get currently active events.
 */
export function getActiveEvents(): PromoEvent[] {
  const now = new Date()
  const year = now.getFullYear()

  return PROMO_CALENDAR.filter(evt => {
    const [startMonth, startDay] = evt.startDate.split("-").map(Number)
    const [endMonth, endDay] = evt.endDate.split("-").map(Number)

    const start = new Date(year, startMonth - 1, startDay - evt.warmupDays)
    const end = new Date(year, endMonth - 1, endDay + evt.reinforcementDays)

    return now >= start && now <= end
  })
}

/**
 * Detect which phase an event is currently in.
 */
export function getEventPhase(event: PromoEvent): CampaignPhase {
  const now = new Date()
  const year = now.getFullYear()

  const [startMonth, startDay] = event.startDate.split("-").map(Number)
  const [endMonth, endDay] = event.endDate.split("-").map(Number)

  const warmupStart = new Date(year, startMonth - 1, startDay - event.warmupDays)
  const mainStart = new Date(year, startMonth - 1, startDay)
  const mainEnd = new Date(year, endMonth - 1, endDay)
  const reinforcementEnd = new Date(year, endMonth - 1, endDay + event.reinforcementDays)

  if (now < warmupStart) return "scheduled"
  if (now >= warmupStart && now < mainStart) return "warmup"
  if (now >= mainStart && now <= mainEnd) return "active"
  if (now > mainEnd && now <= reinforcementEnd) return "reinforcement"
  if (now > reinforcementEnd) return "ended"

  return "draft"
}

/**
 * Get all campaign templates.
 */
export function getCampaignTemplates(): CampaignTemplate[] {
  return CAMPAIGN_TEMPLATES
}

/**
 * Get a specific template by id or slug.
 */
export function getCampaignTemplate(idOrSlug: string): CampaignTemplate | null {
  return CAMPAIGN_TEMPLATES.find(t => t.id === idOrSlug || t.slug === idOrSlug) || null
}

/**
 * Get all calendar and template data for admin.
 */
export function getCalendarData() {
  const now = new Date()
  const activeEvents = getActiveEvents()
  const upcomingEvents = getUpcomingEvents(60)

  return {
    calendar: PROMO_CALENDAR.map(evt => ({
      ...evt,
      phase: getEventPhase(evt),
      isActive: activeEvents.some(a => a.id === evt.id),
    })),
    activeEvents: activeEvents.map(evt => ({
      ...evt,
      phase: getEventPhase(evt),
    })),
    upcomingEvents: upcomingEvents.map(evt => ({
      ...evt,
      phase: getEventPhase(evt),
    })),
    templates: CAMPAIGN_TEMPLATES,
    currentMonth: now.toISOString().slice(0, 7),
  }
}
