/**
 * PromoSnap — Cluster Production Engine
 *
 * Scores content gaps and generates prioritized page creation queue.
 * Uses catalog signals + cluster definitions to recommend what to create next.
 *
 * Priority labels:
 *   create_now      — High commercial potential + large catalog + low coverage
 *   strengthen_now  — Page exists but needs more content/links
 *   update_now      — Page exists, content is outdated or thin
 *   seasonal_prepare — Seasonal page approaching its peak window
 *   low_priority    — Low commercial potential or too little catalog support
 *   do_not_create_yet — Cluster not mature enough in catalog
 */

import { CLUSTERS, getClusterSatellites, getClusterCoverage, type ClusterDef } from './clusters'
import { BEST_PAGES } from './best-pages'
import { COMPARISONS } from './comparisons'
import { OFFER_PAGES } from './offer-pages'
import { getUpcomingEvents } from './seo-calendar'

export type ContentPriority =
  | 'create_now'
  | 'strengthen_now'
  | 'update_now'
  | 'seasonal_prepare'
  | 'low_priority'
  | 'do_not_create_yet'

export interface ContentOpportunity {
  id: string
  priority: ContentPriority
  /** Score 0-100: higher = more urgent */
  score: number
  /** Page type */
  pageType: 'melhores' | 'comparacao' | 'oferta' | 'vale-a-pena' | 'faixa-preco' | 'hub'
  /** Target URL to create or strengthen */
  targetUrl: string
  /** Suggested title */
  suggestedTitle: string
  /** Why this page was flagged */
  rationale: string
  /** Cluster this page belongs to */
  clusterId: string
  /** Whether this page exists yet */
  exists: boolean
  /** Estimated monthly search volume tier */
  searchVolumeTier: 'very_high' | 'high' | 'medium' | 'low'
  /** Tags for filtering */
  tags: string[]
}

// ─────────────────────────────────────────────────────────
// SCORING SIGNALS
// ─────────────────────────────────────────────────────────

/**
 * Score a content opportunity based on cluster priority, page type, and signals.
 * Returns 0-100.
 */
function scoreOpportunity(opts: {
  cluster: ClusterDef
  pageType: ContentOpportunity['pageType']
  exists: boolean
  isHighIntent: boolean
  isSeasonal: boolean
  seasonalDaysUntil?: number
}): number {
  let score = 0

  // Cluster priority (1=highest, 5=lowest) → score bonus
  score += (6 - opts.cluster.priority) * 12  // priority 1 = +60, priority 5 = +12

  // Page type commercial value
  const pageTypeValue = {
    melhores: 20,
    comparacao: 18,
    oferta: 22,
    'vale-a-pena': 12,
    'faixa-preco': 10,
    hub: 25,
  }
  score += pageTypeValue[opts.pageType] || 10

  // Doesn't exist yet → creation bonus
  if (!opts.exists) score += 15

  // High commercial intent → bonus
  if (opts.isHighIntent) score += 8

  // Seasonal urgency
  if (opts.isSeasonal) {
    if (opts.seasonalDaysUntil !== undefined) {
      if (opts.seasonalDaysUntil < 14) score += 20
      else if (opts.seasonalDaysUntil < 28) score += 15
      else if (opts.seasonalDaysUntil < 56) score += 10
      else score += 5
    } else {
      score += 5
    }
  }

  return Math.min(100, Math.max(0, score))
}

function scoreToPriority(score: number, exists: boolean): ContentPriority {
  if (!exists) {
    if (score >= 75) return 'create_now'
    if (score >= 55) return 'create_now'
    if (score >= 40) return 'low_priority'
    return 'do_not_create_yet'
  } else {
    if (score >= 70) return 'strengthen_now'
    if (score >= 50) return 'update_now'
    return 'low_priority'
  }
}

function searchVolumeTier(pageType: ContentOpportunity['pageType'], clusterPriority: number): ContentOpportunity['searchVolumeTier'] {
  if (clusterPriority === 1) {
    if (pageType === 'melhores' || pageType === 'oferta') return 'very_high'
    if (pageType === 'comparacao') return 'high'
    return 'medium'
  }
  if (clusterPriority === 2) {
    if (pageType === 'melhores' || pageType === 'oferta') return 'high'
    if (pageType === 'comparacao') return 'medium'
    return 'low'
  }
  return 'medium'
}

// ─────────────────────────────────────────────────────────
// OPPORTUNITY SCANNER
// ─────────────────────────────────────────────────────────

/** Scan all clusters and return a prioritized list of content opportunities */
export function scanContentOpportunities(): ContentOpportunity[] {
  const opportunities: ContentOpportunity[] = []
  const upcomingEvents = getUpcomingEvents(8)

  // Build seasonal URL set for quick lookup
  const seasonalUrls = new Map<string, number>() // url → daysUntil
  for (const event of upcomingEvents) {
    for (const url of event.urls) {
      const existing = seasonalUrls.get(url.href)
      if (existing === undefined || event.daysUntil < existing) {
        seasonalUrls.set(url.href, event.daysUntil)
      }
    }
  }

  for (const cluster of Object.values(CLUSTERS)) {
    const coverage = getClusterCoverage(cluster.id)

    // Scan melhores satellites
    for (const sat of cluster.melhores) {
      const slug = sat.href.replace('/melhores/', '')
      const isSeasonal = seasonalUrls.has(sat.href)
      const seasonalDays = seasonalUrls.get(sat.href)
      const score = scoreOpportunity({
        cluster,
        pageType: 'melhores',
        exists: sat.exists,
        isHighIntent: cluster.priority <= 2,
        isSeasonal,
        seasonalDaysUntil: seasonalDays,
      })

      opportunities.push({
        id: `melhores-${cluster.id}-${slug}`,
        priority: scoreToPriority(score, sat.exists),
        score,
        pageType: 'melhores',
        targetUrl: sat.href,
        suggestedTitle: sat.label + (sat.label.includes('2026') ? '' : ' de 2026'),
        rationale: sat.exists
          ? `Página existe mas pode ser reforçada. Cluster ${cluster.name} tem prioridade ${cluster.priority}.`
          : `Página não existe. Cluster ${cluster.name} (priority ${cluster.priority}) com ${coverage.pct}% cobertura.`,
        clusterId: cluster.id,
        exists: sat.exists,
        searchVolumeTier: searchVolumeTier('melhores', cluster.priority),
        tags: [cluster.id, 'melhores', sat.exists ? 'exists' : 'missing'],
      })
    }

    // Scan comparison satellites
    for (const sat of cluster.comparisons) {
      const slug = sat.href.replace('/comparar/', '')
      const isSeasonal = seasonalUrls.has(sat.href)
      const score = scoreOpportunity({
        cluster,
        pageType: 'comparacao',
        exists: sat.exists,
        isHighIntent: true, // comparisons always have commercial intent
        isSeasonal,
        seasonalDaysUntil: seasonalUrls.get(sat.href),
      })

      opportunities.push({
        id: `comparacao-${cluster.id}-${slug}`,
        priority: scoreToPriority(score, sat.exists),
        score,
        pageType: 'comparacao',
        targetUrl: sat.href,
        suggestedTitle: sat.label,
        rationale: sat.exists
          ? `Comparação existe. Verificar links para melhores e ofertas do cluster ${cluster.name}.`
          : `Comparação não existe. Alta intenção comercial para cluster ${cluster.name}.`,
        clusterId: cluster.id,
        exists: sat.exists,
        searchVolumeTier: searchVolumeTier('comparacao', cluster.priority),
        tags: [cluster.id, 'comparacao', sat.exists ? 'exists' : 'missing'],
      })
    }

    // Scan offer satellites
    for (const sat of cluster.offers) {
      const slug = sat.href.replace('/ofertas/', '')
      const isSeasonal = seasonalUrls.has(sat.href)
      const score = scoreOpportunity({
        cluster,
        pageType: 'oferta',
        exists: sat.exists,
        isHighIntent: true,
        isSeasonal,
        seasonalDaysUntil: seasonalUrls.get(sat.href),
      })

      opportunities.push({
        id: `oferta-${cluster.id}-${slug}`,
        priority: scoreToPriority(score, sat.exists),
        score,
        pageType: 'oferta',
        targetUrl: sat.href,
        suggestedTitle: sat.label,
        rationale: sat.exists
          ? `Oferta existe. Alta intenção transacional — verificar produtos e CTAs.`
          : `Oferta não existe. Cluster ${cluster.name} sem landing de conversão.`,
        clusterId: cluster.id,
        exists: sat.exists,
        searchVolumeTier: searchVolumeTier('oferta', cluster.priority),
        tags: [cluster.id, 'oferta', sat.exists ? 'exists' : 'missing'],
      })
    }

    // Scan vale-a-pena satellites
    for (const sat of cluster.valeAPena) {
      const score = scoreOpportunity({
        cluster,
        pageType: 'vale-a-pena',
        exists: sat.exists,
        isHighIntent: false,
        isSeasonal: false,
      })

      opportunities.push({
        id: `vale-${cluster.id}-${sat.href}`,
        priority: scoreToPriority(score, sat.exists),
        score,
        pageType: 'vale-a-pena',
        targetUrl: sat.href,
        suggestedTitle: sat.label,
        rationale: sat.exists
          ? `Vale-a-pena existe. Bom para capturar intenção informacional do cluster ${cluster.name}.`
          : `Vale-a-pena não existe. Captura searchers indecisos antes da conversão.`,
        clusterId: cluster.id,
        exists: sat.exists,
        searchVolumeTier: 'medium',
        tags: [cluster.id, 'vale-a-pena', sat.exists ? 'exists' : 'missing'],
      })
    }
  }

  // Sort by score descending
  return opportunities.sort((a, b) => b.score - a.score)
}

// ─────────────────────────────────────────────────────────
// CLUSTER HEALTH REPORT
// ─────────────────────────────────────────────────────────

export interface ClusterHealthReport {
  clusterId: string
  clusterName: string
  priority: number
  coverage: { total: number; existing: number; missing: number; pct: number }
  topOpportunities: ContentOpportunity[]
  healthScore: number  // 0-100
  status: 'healthy' | 'partial' | 'thin' | 'empty'
}

export function getClusterHealthReports(): ClusterHealthReport[] {
  const allOpportunities = scanContentOpportunities()

  return Object.values(CLUSTERS)
    .map((cluster) => {
      const sats = getClusterSatellites(cluster.id)
      const coverage = {
        total: sats.length,
        existing: sats.filter((s) => s.exists).length,
        missing: sats.filter((s) => !s.exists).length,
        pct: sats.length > 0 ? Math.round((sats.filter((s) => s.exists).length / sats.length) * 100) : 0,
      }

      const topOpportunities = allOpportunities
        .filter((o) => o.clusterId === cluster.id && !o.exists)
        .slice(0, 3)

      const healthScore = Math.round(
        coverage.pct * 0.6 +
        (cluster.priority <= 2 && coverage.pct > 50 ? 20 : 0) +
        (cluster.melhores.some((m) => m.exists) ? 20 : 0)
      )

      const status: ClusterHealthReport['status'] =
        coverage.pct >= 70 ? 'healthy'
        : coverage.pct >= 40 ? 'partial'
        : coverage.pct >= 20 ? 'thin'
        : 'empty'

      return {
        clusterId: cluster.id,
        clusterName: cluster.name,
        priority: cluster.priority,
        coverage,
        topOpportunities,
        healthScore,
        status,
      }
    })
    .sort((a, b) => a.priority - b.priority || b.healthScore - a.healthScore)
}

// ─────────────────────────────────────────────────────────
// PAGE DRAFT GENERATOR
// ─────────────────────────────────────────────────────────

export interface PageDraft {
  type: 'melhores' | 'comparacao' | 'oferta' | 'vale-a-pena'
  slug: string
  suggestedTitle: string
  suggestedDescription: string
  suggestedH1: string
  suggestedIntro: string
  suggestedFaqs: { q: string; a: string }[]
  internalLinks: { href: string; label: string }[]
  clusterId: string
  readinessNote: string
}

/** Generate a content draft for a missing page opportunity */
export function generatePageDraft(opportunity: ContentOpportunity): PageDraft | null {
  const cluster = CLUSTERS[opportunity.clusterId]
  if (!cluster) return null

  const slug = opportunity.targetUrl.split('/').pop() || ''

  if (opportunity.pageType === 'melhores') {
    return {
      type: 'melhores',
      slug,
      suggestedTitle: opportunity.suggestedTitle,
      suggestedDescription: `${opportunity.suggestedTitle.replace(' de 2026', '')} com preços comparados em tempo real. Compare nas melhores lojas do Brasil com histórico real de preços e descontos verificados.`,
      suggestedH1: opportunity.suggestedTitle,
      suggestedIntro: `Encontrar a melhor opção em ${cluster.name.toLowerCase()} exige comparar preços, avaliações e histórico real. Selecionamos os produtos com melhor custo-benefício, analisando ${cluster.keywords.slice(0, 3).join(', ')} e mais para que você faça a melhor escolha.`,
      suggestedFaqs: [
        { q: `Como o PromoSnap escolhe os ${opportunity.suggestedTitle.toLowerCase().replace(' de 2026', '')}?`, a: `Nosso algoritmo analisa score de oferta, histórico de preços, avaliações reais e disponibilidade em múltiplas lojas para garantir que você veja apenas as melhores opções.` },
        { q: `Os preços de ${cluster.name.toLowerCase()} são atualizados em tempo real?`, a: `Sim. Monitoramos preços várias vezes ao dia em Amazon, Mercado Livre, Shopee e mais, garantindo que você sempre veja o valor mais atual.` },
        { q: `Como saber se um desconto é real?`, a: `O PromoSnap mostra o histórico de preços de cada produto. Se o preço atual está abaixo da média dos últimos 30 dias, o desconto é real — não inflado artificialmente.` },
      ],
      internalLinks: [
        ...cluster.comparisons.filter((c) => c.exists).slice(0, 2).map((c) => ({ href: c.href, label: c.label })),
        ...cluster.offers.filter((o) => o.exists).slice(0, 2).map((o) => ({ href: o.href, label: o.label })),
        { href: cluster.hub, label: cluster.hubLabel },
      ],
      clusterId: cluster.id,
      readinessNote: `Adicionar a este arquivo: lib/seo/best-pages.ts. Slug: ${slug}. Cluster: ${cluster.name}.`,
    }
  }

  if (opportunity.pageType === 'oferta') {
    return {
      type: 'oferta',
      slug,
      suggestedTitle: opportunity.suggestedTitle,
      suggestedDescription: `As melhores ${opportunity.suggestedTitle.toLowerCase()} em 2026. Compare preços com histórico real e compre no melhor momento.`,
      suggestedH1: opportunity.suggestedTitle,
      suggestedIntro: `Encontre as melhores ofertas com preço histórico verificado. Compare ${cluster.keywords.slice(0, 2).join(' e ')} nas principais lojas do Brasil.`,
      suggestedFaqs: [
        { q: `Quando ${cluster.name.toLowerCase()} ficam mais baratos?`, a: `Black Friday e sazonalidade do produto são os principais fatores. Use o histórico do PromoSnap para identificar o padrão de preços e comprar no momento ideal.` },
        { q: `Como saber se uma oferta é real?`, a: `Verifique o histórico de preços dos últimos 90 dias na página do produto. Se o preço está no mínimo histórico, é uma oferta real.` },
      ],
      internalLinks: [
        ...cluster.melhores.filter((m) => m.exists).slice(0, 2).map((m) => ({ href: m.href, label: m.label })),
        { href: cluster.hub, label: cluster.hubLabel },
      ],
      clusterId: cluster.id,
      readinessNote: `Adicionar a este arquivo: lib/seo/offer-pages.ts. Slug: ${slug}. Cluster: ${cluster.name}.`,
    }
  }

  return null
}

// ─────────────────────────────────────────────────────────
// BACKLOG GENERATOR
// ─────────────────────────────────────────────────────────

export interface BacklogItem {
  rank: number
  priority: ContentPriority
  score: number
  pageType: ContentOpportunity['pageType']
  targetUrl: string
  suggestedTitle: string
  clusterId: string
  clusterName: string
  searchVolumeTier: ContentOpportunity['searchVolumeTier']
  effortEstimate: 'quick' | 'medium' | 'heavy'
  exists: boolean
}

/** Generate a prioritized backlog for content production */
export function generateProductionBacklog(limit = 20): BacklogItem[] {
  const opportunities = scanContentOpportunities()
    .filter((o) => !o.exists || o.priority === 'strengthen_now')

  return opportunities.slice(0, limit).map((o, i) => {
    const cluster = CLUSTERS[o.clusterId]
    const effortEstimate: BacklogItem['effortEstimate'] =
      o.pageType === 'melhores' ? 'medium'
      : o.pageType === 'comparacao' ? 'medium'
      : o.pageType === 'oferta' ? 'quick'
      : 'quick'

    return {
      rank: i + 1,
      priority: o.priority,
      score: o.score,
      pageType: o.pageType,
      targetUrl: o.targetUrl,
      suggestedTitle: o.suggestedTitle,
      clusterId: o.clusterId,
      clusterName: cluster?.name || o.clusterId,
      searchVolumeTier: o.searchVolumeTier,
      effortEstimate,
      exists: o.exists,
    }
  })
}

/** Quick stats for admin dashboard */
export function getProductionStats(): {
  totalOpportunities: number
  createNow: number
  strengthenNow: number
  seasonal: number
  clustersHealthy: number
  clustersThin: number
} {
  const opps = scanContentOpportunities()
  const health = getClusterHealthReports()

  return {
    totalOpportunities: opps.filter((o) => !o.exists).length,
    createNow: opps.filter((o) => o.priority === 'create_now' && !o.exists).length,
    strengthenNow: opps.filter((o) => o.priority === 'strengthen_now').length,
    seasonal: opps.filter((o) => o.tags.includes('sazonal')).length,
    clustersHealthy: health.filter((h) => h.status === 'healthy').length,
    clustersThin: health.filter((h) => h.status === 'thin' || h.status === 'empty').length,
  }
}
