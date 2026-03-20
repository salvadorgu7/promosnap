/**
 * Promo Calendar Engine — manages a live 12-month promotional calendar
 * with campaign states, preparation tracking, and automated activation.
 *
 * Extends the existing seo-calendar with campaign management capabilities.
 */

// ============================================
// TYPES
// ============================================

export type CampaignState = 'planned' | 'warming' | 'active' | 'post_event' | 'recyclable' | 'archived'
export type CampaignType = 'seasonal' | 'category_push' | 'store_push' | 'deal_drop' | 'alert_driven' | 'acquisition' | 'reactivation' | 'retention'

export interface PromoCampaign {
  id: string
  name: string
  slug: string
  type: CampaignType
  state: CampaignState
  startDate: string   // ISO date
  endDate: string     // ISO date
  warmupDays: number
  categories: string[]
  stores: string[]
  channels: ('homepage' | 'email' | 'whatsapp' | 'telegram' | 'landing' | 'push')[]
  landingSlug?: string
  metrics: {
    impressions: number
    clickouts: number
    revenue: number
  }
  relevanceScore: number   // 0-100
  monetizationScore: number // 0-100
  readiness: {
    hasLanding: boolean
    hasProducts: boolean
    hasCopy: boolean
    hasDistribution: boolean
    score: number // 0-100
  }
}

// ============================================
// BRAZILIAN COMMERCE CALENDAR 2026
// ============================================

export const PROMO_CALENDAR_2026: Omit<PromoCampaign, 'metrics' | 'readiness'>[] = [
  // Q1
  { id: 'verao-2026', name: 'Saldão de Verão', slug: 'saldao-verao-2026', type: 'seasonal', state: 'planned', startDate: '2026-01-05', endDate: '2026-01-31', warmupDays: 7, categories: ['moda', 'esportes', 'beleza'], stores: [], channels: ['homepage', 'email', 'landing'], relevanceScore: 60, monetizationScore: 50 },
  { id: 'volta-aulas-2026', name: 'Volta às Aulas', slug: 'volta-aulas-2026', type: 'seasonal', state: 'planned', startDate: '2026-01-20', endDate: '2026-02-28', warmupDays: 14, categories: ['notebooks', 'tablets', 'mochilas', 'papelaria'], stores: [], channels: ['homepage', 'email', 'whatsapp', 'landing'], relevanceScore: 75, monetizationScore: 70 },
  { id: 'carnaval-2026', name: 'Carnaval', slug: 'carnaval-2026', type: 'seasonal', state: 'planned', startDate: '2026-02-14', endDate: '2026-02-21', warmupDays: 14, categories: ['audio', 'caixas-de-som', 'fones'], stores: [], channels: ['homepage', 'email', 'landing'], relevanceScore: 50, monetizationScore: 40 },
  { id: 'consumidor-2026', name: 'Semana do Consumidor', slug: 'semana-consumidor-2026', type: 'seasonal', state: 'planned', startDate: '2026-03-10', endDate: '2026-03-20', warmupDays: 14, categories: ['celulares', 'notebooks', 'eletrodomesticos', 'tvs'], stores: ['amazon-br', 'mercadolivre'], channels: ['homepage', 'email', 'whatsapp', 'landing'], relevanceScore: 85, monetizationScore: 80 },

  // Q2
  { id: 'pascoa-2026', name: 'Páscoa', slug: 'pascoa-2026', type: 'seasonal', state: 'planned', startDate: '2026-03-29', endDate: '2026-04-05', warmupDays: 14, categories: ['presentes', 'casa'], stores: [], channels: ['homepage', 'email'], relevanceScore: 40, monetizationScore: 30 },
  { id: 'dia-maes-2026', name: 'Dia das Mães', slug: 'dia-maes-2026', type: 'seasonal', state: 'planned', startDate: '2026-04-27', endDate: '2026-05-11', warmupDays: 21, categories: ['perfumes', 'beleza', 'eletrodomesticos', 'smartwatches'], stores: [], channels: ['homepage', 'email', 'whatsapp', 'landing'], relevanceScore: 90, monetizationScore: 85 },
  { id: 'dia-namorados-2026', name: 'Dia dos Namorados', slug: 'dia-namorados-2026', type: 'seasonal', state: 'planned', startDate: '2026-05-29', endDate: '2026-06-12', warmupDays: 14, categories: ['perfumes', 'smartwatches', 'fones', 'presentes'], stores: [], channels: ['homepage', 'email', 'whatsapp', 'landing'], relevanceScore: 80, monetizationScore: 75 },

  // Q3
  { id: 'prime-day-2026', name: 'Amazon Prime Day', slug: 'prime-day-2026', type: 'store_push', state: 'planned', startDate: '2026-07-13', endDate: '2026-07-15', warmupDays: 21, categories: ['celulares', 'notebooks', 'tvs', 'gaming', 'fones'], stores: ['amazon-br'], channels: ['homepage', 'email', 'whatsapp', 'landing'], relevanceScore: 90, monetizationScore: 95 },
  { id: 'dia-pais-2026', name: 'Dia dos Pais', slug: 'dia-pais-2026', type: 'seasonal', state: 'planned', startDate: '2026-07-28', endDate: '2026-08-09', warmupDays: 21, categories: ['gaming', 'perfumes', 'ferramentas', 'eletronicos'], stores: [], channels: ['homepage', 'email', 'whatsapp', 'landing'], relevanceScore: 85, monetizationScore: 80 },

  // Q4
  { id: 'dia-criancas-2026', name: 'Dia das Crianças', slug: 'dia-criancas-2026', type: 'seasonal', state: 'planned', startDate: '2026-09-28', endDate: '2026-10-12', warmupDays: 21, categories: ['brinquedos', 'gaming', 'tablets'], stores: [], channels: ['homepage', 'email', 'whatsapp', 'landing'], relevanceScore: 80, monetizationScore: 70 },
  { id: '1111-2026', name: '11.11 Singles Day', slug: '1111-2026', type: 'store_push', state: 'planned', startDate: '2026-11-08', endDate: '2026-11-12', warmupDays: 14, categories: ['celulares', 'acessorios', 'moda'], stores: ['shopee', 'shein'], channels: ['homepage', 'email', 'landing'], relevanceScore: 70, monetizationScore: 65 },
  { id: 'black-friday-2026', name: 'Black Friday', slug: 'black-friday-2026', type: 'seasonal', state: 'planned', startDate: '2026-11-16', endDate: '2026-11-29', warmupDays: 30, categories: ['celulares', 'notebooks', 'tvs', 'gaming', 'audio', 'eletrodomesticos', 'smartwatches'], stores: ['amazon-br', 'mercadolivre', 'shopee', 'shein'], channels: ['homepage', 'email', 'whatsapp', 'telegram', 'landing', 'push'], relevanceScore: 100, monetizationScore: 100 },
  { id: 'cyber-monday-2026', name: 'Cyber Monday', slug: 'cyber-monday-2026', type: 'seasonal', state: 'planned', startDate: '2026-11-30', endDate: '2026-12-01', warmupDays: 3, categories: ['notebooks', 'celulares', 'tvs', 'gaming'], stores: ['amazon-br'], channels: ['homepage', 'email', 'landing'], relevanceScore: 75, monetizationScore: 80 },
  { id: '1212-2026', name: '12.12', slug: '1212-2026', type: 'store_push', state: 'planned', startDate: '2026-12-10', endDate: '2026-12-13', warmupDays: 7, categories: ['acessorios', 'moda', 'beleza'], stores: ['shopee', 'shein'], channels: ['homepage', 'email'], relevanceScore: 55, monetizationScore: 50 },
  { id: 'natal-2026', name: 'Natal', slug: 'natal-2026', type: 'seasonal', state: 'planned', startDate: '2026-12-01', endDate: '2026-12-25', warmupDays: 30, categories: ['presentes', 'gaming', 'perfumes', 'eletronicos'], stores: [], channels: ['homepage', 'email', 'whatsapp', 'landing'], relevanceScore: 90, monetizationScore: 85 },
]

// ============================================
// CALENDAR QUERIES
// ============================================

/** Get campaigns that should be in warming/active state now */
export function getActiveCampaigns(): PromoCampaign[] {
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  return PROMO_CALENDAR_2026
    .filter(c => {
      const warmupStart = new Date(new Date(c.startDate).getTime() - c.warmupDays * 86_400_000)
      return warmupStart.toISOString().split('T')[0] <= today && c.endDate >= today
    })
    .map(c => ({
      ...c,
      metrics: { impressions: 0, clickouts: 0, revenue: 0 },
      readiness: { hasLanding: false, hasProducts: false, hasCopy: false, hasDistribution: false, score: 0 },
    }))
}

/** Get campaigns that need preparation (warmup period starting soon) */
export function getCampaignsToPrep(weeksAhead = 4): PromoCampaign[] {
  const now = new Date()
  const futureDate = new Date(now.getTime() + weeksAhead * 7 * 86_400_000)

  return PROMO_CALENDAR_2026
    .filter(c => {
      const warmupStart = new Date(new Date(c.startDate).getTime() - c.warmupDays * 86_400_000)
      return warmupStart >= now && warmupStart <= futureDate
    })
    .map(c => {
      const warmupStart = new Date(new Date(c.startDate).getTime() - c.warmupDays * 86_400_000)
      const daysUntilWarmup = Math.ceil((warmupStart.getTime() - now.getTime()) / 86_400_000)
      return {
        ...c,
        state: 'planned' as CampaignState,
        metrics: { impressions: 0, clickouts: 0, revenue: 0 },
        readiness: { hasLanding: false, hasProducts: false, hasCopy: false, hasDistribution: false, score: 0 },
      }
    })
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
}

/** Get the full calendar summary for the command center */
export function getCalendarOverview(): {
  active: PromoCampaign[]
  preparing: PromoCampaign[]
  upcoming: typeof PROMO_CALENDAR_2026
  totalCampaigns: number
} {
  return {
    active: getActiveCampaigns(),
    preparing: getCampaignsToPrep(6),
    upcoming: PROMO_CALENDAR_2026,
    totalCampaigns: PROMO_CALENDAR_2026.length,
  }
}
