/**
 * PromoSnap — SEO/Commercial Calendar Engine
 *
 * Operational calendar for content production and reinforcement.
 * Drives the admin dashboard and helps the team decide what to create or strengthen.
 *
 * Three cadences:
 *   - Weekly: quick wins, interlinking, metadata, offer page refreshes
 *   - Monthly: new melhores/comparações pages, cluster health checks
 *   - Seasonal: event-driven pages (Black Friday, Natal, Dia das Mães, etc.)
 */

export type ActionPriority = 'critical' | 'high' | 'medium' | 'low'

export type ActionType =
  | 'create_page'        // Create a new page from scratch
  | 'strengthen_page'    // Existing page needs more content / links
  | 'update_metadata'    // Title/description improvement needed
  | 'add_interlinking'   // Add internal links to/from this page
  | 'refresh_content'    // Update seasonal/price-sensitive content
  | 'cluster_hub'        // Build or reinforce a cluster hub
  | 'seasonal_prepare'   // Prepare seasonal pages before peak

export interface CalendarAction {
  id: string
  type: ActionType
  priority: ActionPriority
  title: string
  description: string
  targetUrl: string
  clusterIds?: string[]
  /** Estimated effort in hours */
  effortHours: number
  /** Estimated organic impact (1-10) */
  impactScore: number
  /** Tags for filtering */
  tags: string[]
}

export interface SeasonalEvent {
  id: string
  name: string
  /** Month (1-12) */
  month: number
  /** Day (1-31) */
  day: number
  /** Weeks before the event to start preparing */
  prepWeeksBefore: number
  clusterIds: string[]
  urls: { href: string; label: string; type: 'create' | 'reinforce' }[]
}

// ─────────────────────────────────────────────────────────
// BRAZILIAN COMMERCE CALENDAR
// ─────────────────────────────────────────────────────────

export const SEASONAL_EVENTS: SeasonalEvent[] = [
  {
    id: 'verao',
    name: 'Verão / Liquidação de Janeiro',
    month: 1,
    day: 5,
    prepWeeksBefore: 2,
    clusterIds: ['tenis', 'perfumes'],
    urls: [
      { href: '/melhores/melhores-tenis-corrida', label: 'Melhores Tênis Corrida', type: 'reinforce' },
      { href: '/ofertas/tenis', label: 'Ofertas Tênis', type: 'create' },
      { href: '/faixa-preco/tenis-ate-300', label: 'Tênis até R$300', type: 'create' },
    ],
  },
  {
    id: 'carnaval',
    name: 'Carnaval',
    month: 3,
    day: 1,
    prepWeeksBefore: 3,
    clusterIds: ['audio', 'presentes'],
    urls: [
      { href: '/ofertas/festas', label: 'Ofertas para Festas', type: 'reinforce' },
      { href: '/melhores/melhores-caixas-som-bluetooth', label: 'Melhores Caixas de Som', type: 'reinforce' },
    ],
  },
  {
    id: 'pascoa',
    name: 'Páscoa',
    month: 4,
    day: 1,
    prepWeeksBefore: 3,
    clusterIds: ['presentes'],
    urls: [
      { href: '/melhores/melhores-presentes', label: 'Melhores Presentes', type: 'reinforce' },
      { href: '/ofertas/brinquedos', label: 'Ofertas Brinquedos', type: 'create' },
    ],
  },
  {
    id: 'dia-das-maes',
    name: 'Dia das Mães',
    month: 5,
    day: 11,
    prepWeeksBefore: 4,
    clusterIds: ['perfumes', 'eletrodomesticos', 'presentes'],
    urls: [
      { href: '/melhores/melhores-perfumes-femininos', label: 'Melhores Perfumes Femininos', type: 'create' },
      { href: '/melhores/melhores-cafeteiras', label: 'Melhores Cafeteiras', type: 'reinforce' },
      { href: '/melhores/melhores-presentes', label: 'Melhores Presentes para o Dia das Mães', type: 'reinforce' },
      { href: '/ofertas/perfumes', label: 'Ofertas Perfumes Dia das Mães', type: 'create' },
      { href: '/ofertas/cafeteiras', label: 'Ofertas Cafeteiras', type: 'create' },
    ],
  },
  {
    id: 'dia-dos-namorados',
    name: 'Dia dos Namorados',
    month: 6,
    day: 12,
    prepWeeksBefore: 3,
    clusterIds: ['perfumes', 'presentes', 'wearables'],
    urls: [
      { href: '/melhores/melhores-perfumes', label: 'Melhores Perfumes', type: 'reinforce' },
      { href: '/melhores/melhores-smartwatches', label: 'Melhores Smartwatches', type: 'reinforce' },
      { href: '/ofertas/perfumes', label: 'Ofertas Perfumes Dia dos Namorados', type: 'reinforce' },
    ],
  },
  {
    id: 'dia-dos-pais',
    name: 'Dia dos Pais',
    month: 8,
    day: 11,
    prepWeeksBefore: 4,
    clusterIds: ['perfumes', 'gaming', 'presentes', 'wearables'],
    urls: [
      { href: '/melhores/melhores-perfumes-masculinos', label: 'Melhores Perfumes Masculinos', type: 'reinforce' },
      { href: '/melhores/melhores-smartwatches', label: 'Melhores Smartwatches para Presente', type: 'reinforce' },
      { href: '/ofertas/ps5', label: 'Ofertas PS5 Dia dos Pais', type: 'reinforce' },
      { href: '/ofertas/perfumes', label: 'Ofertas Perfumes Masculinos', type: 'reinforce' },
    ],
  },
  {
    id: 'volta-as-aulas',
    name: 'Volta às Aulas',
    month: 1,
    day: 20,
    prepWeeksBefore: 3,
    clusterIds: ['notebooks', 'tablets'],
    urls: [
      { href: '/melhores/melhores-notebooks', label: 'Melhores Notebooks Volta às Aulas', type: 'reinforce' },
      { href: '/melhores/melhores-tablets', label: 'Melhores Tablets Volta às Aulas', type: 'reinforce' },
      { href: '/melhores/melhores-notebooks-trabalho', label: 'Melhores Notebooks para Trabalho', type: 'create' },
      { href: '/faixa-preco/notebooks-ate-2000', label: 'Notebooks até R$2.000', type: 'create' },
    ],
  },
  {
    id: 'dia-das-criancas',
    name: 'Dia das Crianças',
    month: 10,
    day: 12,
    prepWeeksBefore: 6,
    clusterIds: ['presentes', 'gaming'],
    urls: [
      { href: '/melhores/melhores-brinquedos', label: 'Melhores Brinquedos Dia das Crianças', type: 'reinforce' },
      { href: '/melhores/melhores-presentes-criancas', label: 'Melhores Presentes para Crianças', type: 'create' },
      { href: '/melhores/melhores-brinquedos-natal', label: 'Melhores Brinquedos para o Natal', type: 'create' },
      { href: '/ofertas/brinquedos', label: 'Ofertas Brinquedos', type: 'reinforce' },
    ],
  },
  {
    id: 'black-friday',
    name: 'Black Friday',
    month: 11,
    day: 28,
    prepWeeksBefore: 8,
    clusterIds: ['smartphones', 'notebooks', 'smarttv', 'audio', 'gaming', 'eletrodomesticos', 'wearables'],
    urls: [
      { href: '/melhores/melhores-celulares', label: 'Melhores Celulares Black Friday', type: 'reinforce' },
      { href: '/melhores/melhores-notebooks', label: 'Melhores Notebooks Black Friday', type: 'reinforce' },
      { href: '/melhores/melhores-smart-tvs', label: 'Melhores Smart TVs Black Friday', type: 'reinforce' },
      { href: '/melhores/melhores-air-fryers', label: 'Melhores Air Fryers Black Friday', type: 'reinforce' },
      { href: '/ofertas/eletronicos-hoje', label: 'Todas as Ofertas Black Friday', type: 'reinforce' },
    ],
  },
  {
    id: 'natal',
    name: 'Natal',
    month: 12,
    day: 25,
    prepWeeksBefore: 8,
    clusterIds: ['presentes', 'gaming', 'eletrodomesticos', 'perfumes'],
    urls: [
      { href: '/melhores/melhores-presentes', label: 'Melhores Presentes de Natal', type: 'reinforce' },
      { href: '/melhores/melhores-brinquedos-natal', label: 'Melhores Brinquedos para o Natal', type: 'create' },
      { href: '/ofertas/gaming-setup', label: 'Ofertas Setup Gamer Natal', type: 'reinforce' },
      { href: '/ofertas/perfumes', label: 'Ofertas Perfumes Natal', type: 'reinforce' },
    ],
  },
  {
    id: 'prime-day',
    name: 'Amazon Prime Day',
    month: 7,
    day: 15,
    prepWeeksBefore: 3,
    clusterIds: ['smartphones', 'audio', 'notebooks', 'wearables'],
    urls: [
      { href: '/melhores/melhores-fones-bluetooth', label: 'Melhores Fones Bluetooth Prime Day', type: 'reinforce' },
      { href: '/melhores/melhores-celulares', label: 'Melhores Celulares Prime Day', type: 'reinforce' },
    ],
  },
]

// ─────────────────────────────────────────────────────────
// WEEKLY ACTION TEMPLATES
// ─────────────────────────────────────────────────────────

export const WEEKLY_ACTIONS: Omit<CalendarAction, 'id'>[] = [
  {
    type: 'add_interlinking',
    priority: 'high',
    title: 'Revisar interlinking dos hubs de cluster',
    description: 'Verificar que os hubs de categoria apontam para melhores + comparações + ofertas do cluster. Adicionar links que estejam faltando.',
    targetUrl: '/admin/seo-clusters',
    clusterIds: ['smartphones', 'notebooks', 'audio'],
    effortHours: 1,
    impactScore: 7,
    tags: ['interlinking', 'cluster', 'semanal'],
  },
  {
    type: 'refresh_content',
    priority: 'medium',
    title: 'Atualizar títulos de páginas de melhores com ano atual',
    description: 'Garantir que as páginas de melhores mostram "de 2026" no título — essencial para CTR em buscas com intent temporal.',
    targetUrl: '/melhores',
    effortHours: 0.5,
    impactScore: 6,
    tags: ['metadata', 'melhores', 'semanal'],
  },
  {
    type: 'strengthen_page',
    priority: 'medium',
    title: 'Reforçar páginas de comparação com links para melhores',
    description: 'Cada página /comparar/ deve ter links para as páginas de melhores do mesmo cluster. Verificar lacunas.',
    targetUrl: '/admin/seo-clusters',
    effortHours: 1,
    impactScore: 6,
    tags: ['interlinking', 'comparações', 'semanal'],
  },
  {
    type: 'update_metadata',
    priority: 'low',
    title: 'Checar pages sem description customizada',
    description: 'Identificar páginas que estão usando a description padrão. Personalizar com termos de busca e lojas relevantes.',
    targetUrl: '/admin/seo-clusters',
    effortHours: 0.5,
    impactScore: 5,
    tags: ['metadata', 'semanal'],
  },
]

// ─────────────────────────────────────────────────────────
// MONTHLY ACTION TEMPLATES
// ─────────────────────────────────────────────────────────

export const MONTHLY_ACTIONS: Omit<CalendarAction, 'id'>[] = [
  {
    type: 'create_page',
    priority: 'high',
    title: 'Criar 2 novas páginas de melhores para clusters com gap',
    description: 'Usar o cluster engine para identificar os 2 clusters com pior cobertura e criar as páginas de melhores que faltam.',
    targetUrl: '/admin/seo-clusters',
    effortHours: 2,
    impactScore: 8,
    tags: ['melhores', 'cluster', 'mensal'],
  },
  {
    type: 'create_page',
    priority: 'high',
    title: 'Criar 1 nova comparação para cluster priority 1 ou 2',
    description: 'Identificar qual cluster de alta prioridade tem menos comparações e criar o comparativo mais buscado para ele.',
    targetUrl: '/admin/seo-clusters',
    effortHours: 1.5,
    impactScore: 7,
    tags: ['comparações', 'cluster', 'mensal'],
  },
  {
    type: 'cluster_hub',
    priority: 'medium',
    title: 'Revisar e reforçar hubs de cluster',
    description: 'Verificar que as páginas de categoria (hubs) têm links para todos os satélites do cluster. Adicionar seções de "Comparações" e "Ofertas" que faltam.',
    targetUrl: '/categorias',
    effortHours: 2,
    impactScore: 8,
    tags: ['hub', 'cluster', 'interlinking', 'mensal'],
  },
  {
    type: 'strengthen_page',
    priority: 'medium',
    title: 'Revisar páginas com tráfego alto e clickout baixo',
    description: 'Identificar páginas de melhores com muitas visitas mas poucos cliques em produtos. Melhorar posicionamento de produtos e CTAs.',
    targetUrl: '/admin/seo-clusters',
    effortHours: 2,
    impactScore: 9,
    tags: ['clickout', 'conversão', 'mensal'],
  },
  {
    type: 'create_page',
    priority: 'low',
    title: 'Criar 1 nova página de faixa de preço',
    description: 'Identificar cluster com gap em faixas de preço e criar a página /faixa-preco/ correspondente.',
    targetUrl: '/admin/seo-clusters',
    effortHours: 1,
    impactScore: 5,
    tags: ['faixa-preco', 'cluster', 'mensal'],
  },
]

// ─────────────────────────────────────────────────────────
// ENGINE FUNCTIONS
// ─────────────────────────────────────────────────────────

/** Get events that are upcoming in the next N weeks */
export function getUpcomingEvents(weeksAhead = 8): (SeasonalEvent & { daysUntil: number; shouldPrepare: boolean })[] {
  const now = new Date()
  const currentYear = now.getFullYear()

  return SEASONAL_EVENTS
    .map((event) => {
      // Try current year first, then next year
      let eventDate = new Date(currentYear, event.month - 1, event.day)
      if (eventDate < now) {
        eventDate = new Date(currentYear + 1, event.month - 1, event.day)
      }

      const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      const prepDeadlineDays = event.prepWeeksBefore * 7
      const shouldPrepare = daysUntil <= prepDeadlineDays

      return { ...event, daysUntil, shouldPrepare }
    })
    .filter((e) => e.daysUntil <= weeksAhead * 7)
    .sort((a, b) => a.daysUntil - b.daysUntil)
}

/** Get seasonal event for a specific month */
export function getSeasonalOpportunities(month: number): SeasonalEvent[] {
  return SEASONAL_EVENTS.filter((e) => e.month === month || (e.month - 1 + 12) % 12 === (month - 1))
}

/** Get the current month's focus cluster */
export function getCurrentMonthFocus(): { primaryCluster: string; events: SeasonalEvent[] } {
  const month = new Date().getMonth() + 1 // 1-12

  // Next 2 months of events
  const upcoming = SEASONAL_EVENTS.filter(
    (e) => e.month === month || e.month === ((month % 12) + 1)
  )

  // Cluster with most upcoming events
  const clusterCount: Record<string, number> = {}
  for (const event of upcoming) {
    for (const cId of event.clusterIds) {
      clusterCount[cId] = (clusterCount[cId] || 0) + 1
    }
  }

  const primaryCluster = Object.entries(clusterCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'smartphones'

  return { primaryCluster, events: upcoming }
}

/** Generate weekly action plan for the current week */
export function getWeeklyActions(): CalendarAction[] {
  const upcoming = getUpcomingEvents(4)
  const actions: CalendarAction[] = []

  // Add seasonal prep actions
  for (const event of upcoming.filter((e) => e.shouldPrepare)) {
    for (const url of event.urls.slice(0, 2)) {
      actions.push({
        id: `seasonal-${event.id}-${url.href}`,
        type: url.type === 'create' ? 'create_page' : 'strengthen_page',
        priority: event.daysUntil < 14 ? 'critical' : 'high',
        title: `[${event.name}] ${url.type === 'create' ? 'Criar' : 'Reforçar'}: ${url.label}`,
        description: `${event.name} é em ${event.daysUntil} dias. ${url.type === 'create' ? 'Criar esta página antes do pico de buscas.' : 'Atualizar conteúdo e links desta página.'}`,
        targetUrl: url.href,
        clusterIds: event.clusterIds,
        effortHours: url.type === 'create' ? 1.5 : 0.5,
        impactScore: Math.min(10, 10 - Math.floor(event.daysUntil / 7)),
        tags: ['sazonal', event.id],
      })
    }
  }

  // Add standard weekly actions
  actions.push(
    ...WEEKLY_ACTIONS.map((a, i) => ({ ...a, id: `weekly-${i}` }))
  )

  return actions.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}

/** Get monthly action plan */
export function getMonthlyActions(): CalendarAction[] {
  const { primaryCluster, events } = getCurrentMonthFocus()

  const actions: CalendarAction[] = MONTHLY_ACTIONS.map((a, i) => ({
    ...a,
    id: `monthly-${i}`,
    description: a.description + (primaryCluster ? ` Foco do mês: cluster ${primaryCluster}.` : ''),
  }))

  // Add event-specific monthly prep
  for (const event of events) {
    actions.push({
      id: `monthly-event-${event.id}`,
      type: 'seasonal_prepare',
      priority: 'high',
      title: `Preparar conteúdo para ${event.name}`,
      description: `${event.name} é em ${event.month}/${new Date().getFullYear()}. Prepare as páginas sazonais com antecedência de ${event.prepWeeksBefore} semanas.`,
      targetUrl: '/admin/seo-clusters',
      clusterIds: event.clusterIds,
      effortHours: 3,
      impactScore: 8,
      tags: ['sazonal', event.id, 'mensal'],
    })
  }

  return actions.sort((a, b) => b.impactScore - a.impactScore)
}

/** Get SEO calendar summary for the current period */
export function getCalendarSummary(): {
  weeklyActions: CalendarAction[]
  monthlyActions: CalendarAction[]
  upcomingEvents: ReturnType<typeof getUpcomingEvents>
  currentFocus: ReturnType<typeof getCurrentMonthFocus>
} {
  return {
    weeklyActions: getWeeklyActions(),
    monthlyActions: getMonthlyActions(),
    upcomingEvents: getUpcomingEvents(12),
    currentFocus: getCurrentMonthFocus(),
  }
}
