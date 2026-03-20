/**
 * Growth Command Center — the central orchestrator for PromoSnap's
 * automated growth operations.
 *
 * Ties together: promo calendar, campaign planner, offer intelligence,
 * distribution, CRM, and quality gates into a unified system.
 */

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

// ============================================
// TYPES
// ============================================

export interface GrowthAction {
  id: string
  agentName: string
  actionType: string
  description: string
  priorityScore: number  // 0-100
  impactScore: number    // 0-100
  confidenceScore: number // 0-100
  status: 'suggested' | 'approved' | 'executing' | 'done' | 'failed' | 'skipped'
  metadata: Record<string, unknown>
  createdAt: Date
}

export interface AgentDefinition {
  name: string
  description: string
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly'
  kpis: string[]
  guardrails: string[]
}

// ============================================
// AGENT DEFINITIONS
// ============================================

export const GROWTH_AGENTS: AgentDefinition[] = [
  {
    name: 'opportunity-agent',
    description: 'Detecta oportunidades comerciais: quedas de preço, trending, alto engagement sem clickout',
    frequency: 'daily',
    kpis: ['opportunities_detected', 'opportunities_converted', 'revenue_from_opportunities'],
    guardrails: ['min_offer_score_40', 'min_discount_10', 'has_affiliate', 'has_image'],
  },
  {
    name: 'calendar-agent',
    description: 'Gerencia calendário promocional: prepara, ativa e encerra campanhas sazonais',
    frequency: 'daily',
    kpis: ['campaigns_active', 'campaigns_prepared', 'seasonal_coverage'],
    guardrails: ['min_products_for_campaign_5', 'no_campaign_without_landing'],
  },
  {
    name: 'content-agent',
    description: 'Gera e otimiza conteúdo: artigos, landing pages, FAQs',
    frequency: 'daily',
    kpis: ['pages_created', 'articles_published', 'content_score_avg'],
    guardrails: ['min_readiness_60', 'no_ai_content_without_quality_gate'],
  },
  {
    name: 'crm-agent',
    description: 'Orquestra CRM: segmentação, mensagens, reengagement',
    frequency: 'daily',
    kpis: ['messages_sent', 'ctr', 'reengagements', 'opt_outs'],
    guardrails: ['max_3_emails_day', 'max_2_whatsapp_day', 'dedup_24h', 'quiet_hours'],
  },
  {
    name: 'distribution-agent',
    description: 'Distribui ofertas por canal: homepage, email, WhatsApp, Telegram',
    frequency: 'daily',
    kpis: ['offers_distributed', 'channel_coverage', 'clickout_from_distribution'],
    guardrails: ['min_score_40', 'has_affiliate', 'no_flood', 'channel_specific_limits'],
  },
  {
    name: 'quality-agent',
    description: 'Monitora qualidade: preços suspeitos, imagens quebradas, affiliates inválidos',
    frequency: 'daily',
    kpis: ['issues_detected', 'issues_fixed', 'catalog_health_score'],
    guardrails: ['never_hide_real_issues', 'alert_on_critical'],
  },
  {
    name: 'ranking-agent',
    description: 'Otimiza ranking e merchandising: hero slots, carousels, deal of day',
    frequency: 'daily',
    kpis: ['slots_filled', 'ctr_improvement', 'revenue_per_slot'],
    guardrails: ['manual_override_respected', 'min_decision_value_50'],
  },
  {
    name: 'alert-agent',
    description: 'Dispara alertas de queda e notificações de preço',
    frequency: 'daily',
    kpis: ['alerts_fired', 'alert_ctr', 'alert_revenue'],
    guardrails: ['only_real_drops', 'min_5pct_drop', 'dedup_per_user'],
  },
  {
    name: 'seo-agent',
    description: 'Monitora saúde SEO: páginas fracas, snippets, interlinking',
    frequency: 'weekly',
    kpis: ['pages_improved', 'seo_score_avg', 'regression_detected'],
    guardrails: ['no_mass_changes', 'audit_before_publish'],
  },
  {
    name: 'anomaly-agent',
    description: 'Detecta anomalias: picos/quedas de tráfego, clickout drops, price spikes',
    frequency: 'daily',
    kpis: ['anomalies_detected', 'false_positive_rate', 'time_to_detect'],
    guardrails: ['threshold_based', 'no_false_alerts'],
  },
]

// ============================================
// DAILY BRIEFING
// ============================================

export async function generateDailyBriefing(): Promise<{
  date: string
  opportunities: number
  activeCampaigns: number
  pendingActions: number
  catalogHealth: number
  topActions: GrowthAction[]
  alerts: string[]
}> {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(today.getTime() - 7 * 86_400_000)

  const [
    activeOffers,
    clickoutsToday,
    clickoutsWeek,
    activeSubs,
    recentAlerts,
    recentJobs,
  ] = await Promise.all([
    prisma.offer.count({ where: { isActive: true } }),
    prisma.clickout.count({ where: { clickedAt: { gte: today } } }),
    prisma.clickout.count({ where: { clickedAt: { gte: weekAgo } } }),
    prisma.subscriber.count({ where: { status: 'ACTIVE' } }),
    prisma.priceAlert.count({ where: { isActive: true } }),
    prisma.jobRun.findMany({
      where: { startedAt: { gte: today } },
      select: { jobName: true, status: true },
    }),
  ])

  const alerts: string[] = []
  const failedJobs = recentJobs.filter(j => j.status === 'FAILED')
  if (failedJobs.length > 0) {
    alerts.push(`${failedJobs.length} jobs falharam hoje: ${failedJobs.map(j => j.jobName).join(', ')}`)
  }
  if (clickoutsToday === 0 && now.getHours() > 12) {
    alerts.push('Zero clickouts hoje — verificar se site está acessível')
  }

  // Generate top actions
  const actions: GrowthAction[] = []

  // Check if seasonal campaign should be prepared
  const { getUpcomingEvents } = await import('@/lib/seo/seo-calendar')
  const upcoming = getUpcomingEvents(4)
  for (const event of upcoming.filter(e => e.shouldPrepare)) {
    actions.push({
      id: `calendar-${event.name}`,
      agentName: 'calendar-agent',
      actionType: 'prepare_campaign',
      description: `Preparar campanha para ${event.name} (${event.daysUntil}d)`,
      priorityScore: Math.min(100, 90 - event.daysUntil),
      impactScore: 80,
      confidenceScore: 90,
      status: 'suggested',
      metadata: { event },
      createdAt: now,
    })
  }

  // Suggest content refresh if needed
  actions.push({
    id: 'content-refresh-daily',
    agentName: 'content-agent',
    actionType: 'refresh_content',
    description: 'Atualizar hubs quentes e landing pages com dados frescos',
    priorityScore: 50,
    impactScore: 40,
    confidenceScore: 80,
    status: 'suggested',
    metadata: {},
    createdAt: now,
  })

  return {
    date: today.toISOString().split('T')[0],
    opportunities: activeOffers,
    activeCampaigns: upcoming.filter(e => e.daysUntil <= 0).length,
    pendingActions: actions.length,
    catalogHealth: Math.round((activeOffers / Math.max(activeOffers, 100)) * 100),
    topActions: actions.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 10),
    alerts,
  }
}

// ============================================
// AGENT SCORECARD
// ============================================

export async function getAgentScorecard(agentName: string, days = 30): Promise<{
  agent: AgentDefinition | undefined
  actionsExecuted: number
  actionsSucceeded: number
  successRate: number
}> {
  const agent = GROWTH_AGENTS.find(a => a.name === agentName)

  // In a real system, this would query from an actions table
  // For now, derive from job runs
  const since = new Date(Date.now() - days * 86_400_000)
  const jobPrefix = agentName.replace('-agent', '')

  const jobs = await prisma.jobRun.findMany({
    where: { jobName: { contains: jobPrefix }, startedAt: { gte: since } },
    select: { status: true },
  })

  const total = jobs.length
  const succeeded = jobs.filter(j => j.status === 'SUCCESS').length

  return {
    agent,
    actionsExecuted: total,
    actionsSucceeded: succeeded,
    successRate: total > 0 ? Math.round((succeeded / total) * 100) : 0,
  }
}
