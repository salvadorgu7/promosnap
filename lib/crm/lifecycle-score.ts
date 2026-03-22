/**
 * CRM Lifecycle Score — maps subscribers through their purchase journey
 * and predicts churn risk.
 *
 * Lifecycle: awareness -> consideration -> decision -> purchase -> retention -> advocacy
 *
 * Combines:
 * - Engagement score (from segment-engine.ts classifySubscriber)
 * - CRM segment (from segment-engine.ts)
 * - Behavioral recency/frequency (from crm_events)
 * - Price alert activity
 *
 * Outputs actionable next-best-action for each subscriber.
 */

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { classifySubscriber, type SegmentResult } from './segment-engine'
import { getEventCounts } from './events'

// ============================================
// TYPES
// ============================================

export type LifecycleStage =
  | 'awareness'
  | 'consideration'
  | 'decision'
  | 'purchase'
  | 'retention'
  | 'advocacy'

export type ChurnRisk = 'none' | 'low' | 'medium' | 'high' | 'critical'

export type NextBestActionType =
  | 'send_guide'
  | 'send_comparison'
  | 'send_deal_alert'
  | 'send_price_drop'
  | 'send_review_request'
  | 'send_referral'
  | 'send_winback'
  | 'create_alert_suggestion'
  | 'show_onsite_banner'
  | 'do_nothing'

export interface NextBestAction {
  action: NextBestActionType
  reason: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  channel: 'email' | 'whatsapp' | 'onsite' | 'push'
  timing: 'immediate' | 'next_hour' | 'next_day' | 'next_week'
  template?: string
}

export interface LifecycleResult {
  subscriberId: string
  email: string
  stage: LifecycleStage
  stageLabel: string
  churnRisk: ChurnRisk
  churnRiskScore: number
  daysSinceLastAction: number
  engagementTrend: 'rising' | 'stable' | 'declining'
  nextBestActions: NextBestAction[]
  estimatedLifetimeValue: number
  retentionProbability: number
}

// ============================================
// STAGE LABELS (PT-BR)
// ============================================

const STAGE_LABELS: Record<LifecycleStage, string> = {
  awareness: 'Conhecendo',
  consideration: 'Pesquisando',
  decision: 'Decidindo',
  purchase: 'Comprando',
  retention: 'Fidelizado',
  advocacy: 'Embaixador',
}

export function getLifecycleStageLabel(stage: LifecycleStage): string {
  return STAGE_LABELS[stage]
}

// ============================================
// INTERNAL SIGNAL TYPES
// ============================================

interface SubscriberSignals {
  subscriberId: string
  email: string
  daysSinceCreated: number
  daysSinceLastAction: number
  engagementScore: number
  segment: SegmentResult
  activeAlerts: number
  clickouts30d: number
  clickouts7d: number
  searches: number
  views: number
  comparisons: number
  favorites: number
  referrals: number
  shares: number
  isUnsubscribed: boolean
  engagementTrend: 'rising' | 'stable' | 'declining'
  currentEngagement30d: number
  previousEngagement30d: number
}

// ============================================
// MAIN: COMPUTE LIFECYCLE SCORE
// ============================================

export async function computeLifecycleScore(subscriberId: string): Promise<LifecycleResult> {
  const signals = await gatherSignals(subscriberId)

  const stage = determineStage(signals)
  const churnRiskScore = calculateChurnRiskScore(signals, stage)
  const churnRisk = mapChurnRisk(churnRiskScore)
  const nextBestActions = getNextBestActions(stage, churnRisk, signals)
  const estimatedLifetimeValue = estimateLTV(signals, stage)
  const retentionProbability = Math.max(0, Math.min(1, 1.0 - churnRiskScore / 100))

  return {
    subscriberId: signals.subscriberId,
    email: signals.email,
    stage,
    stageLabel: getLifecycleStageLabel(stage),
    churnRisk,
    churnRiskScore,
    daysSinceLastAction: signals.daysSinceLastAction,
    engagementTrend: signals.engagementTrend,
    nextBestActions,
    estimatedLifetimeValue,
    retentionProbability,
  }
}

// ============================================
// BATCH COMPUTE (for cron jobs)
// ============================================

export async function batchComputeLifecycles(limit = 200): Promise<LifecycleResult[]> {
  const subscribers = await prisma.subscriber.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true },
    orderBy: { lastActiveAt: 'desc' },
    take: limit,
  })

  const results: LifecycleResult[] = []

  for (const sub of subscribers) {
    try {
      const result = await computeLifecycleScore(sub.id)
      results.push(result)

      // Persist lifecycle stage as segment metadata
      await prisma.subscriber.update({
        where: { id: sub.id },
        data: {
          engagementScore: Math.round(result.retentionProbability * 100),
          segment: `${result.stage}:${result.churnRisk}`,
        },
      }).catch(() => { /* non-blocking */ })
    } catch (err) {
      logger.warn('[Lifecycle] Failed to compute for subscriber', {
        subscriberId: sub.id,
        err,
      })
    }
  }

  logger.info('[Lifecycle] Batch complete', {
    total: subscribers.length,
    computed: results.length,
  })

  return results
}

// ============================================
// SIGNAL GATHERING
// ============================================

async function gatherSignals(subscriberId: string): Promise<SubscriberSignals> {
  const sub = await prisma.subscriber.findUnique({
    where: { id: subscriberId },
    select: {
      id: true,
      email: true,
      status: true,
      engagementScore: true,
      createdAt: true,
      lastActiveAt: true,
    },
  })

  if (!sub) {
    throw new Error(`Subscriber ${subscriberId} not found`)
  }

  const now = Date.now()
  const daysSinceCreated = (now - sub.createdAt.getTime()) / 86_400_000
  const daysSinceLastAction = sub.lastActiveAt
    ? (now - sub.lastActiveAt.getTime()) / 86_400_000
    : daysSinceCreated

  // Run segment classification (also computes engagement)
  const segment = await classifySubscriber(subscriberId)

  // Count events for current and previous 30-day windows
  const [eventCounts30d, eventCountsPrev30d, activeAlerts, clickouts7d, referralCount] =
    await Promise.all([
      getEventCounts(sub.email, 30),
      getEventCounts(sub.email, 60), // 60d total, we'll subtract 30d
      prisma.priceAlert.count({
        where: { email: sub.email, isActive: true },
      }),
      countClickoutsInDays(sub.email, 7),
      prisma.referral.count({
        where: { email: sub.email },
      }),
    ])

  // Current 30d engagement (sum of all events)
  const currentEngagement30d = Object.values(eventCounts30d).reduce((a, b) => a + b, 0)

  // Previous 30d engagement (60d total - 30d recent)
  const totalEngagement60d = Object.values(eventCountsPrev30d).reduce((a, b) => a + b, 0)
  const previousEngagement30d = totalEngagement60d - currentEngagement30d

  // Determine trend
  let engagementTrend: 'rising' | 'stable' | 'declining' = 'stable'
  if (previousEngagement30d > 0) {
    if (currentEngagement30d > previousEngagement30d * 1.2) {
      engagementTrend = 'rising'
    } else if (currentEngagement30d < previousEngagement30d * 0.7) {
      engagementTrend = 'declining'
    }
  } else if (currentEngagement30d > 5) {
    // No previous activity but current activity — rising
    engagementTrend = 'rising'
  }

  return {
    subscriberId: sub.id,
    email: sub.email,
    daysSinceCreated,
    daysSinceLastAction,
    engagementScore: segment.engagementScore,
    segment,
    activeAlerts,
    clickouts30d: eventCounts30d.clickout || 0,
    clickouts7d,
    searches: eventCounts30d.search || 0,
    views: eventCounts30d.view_product || 0,
    comparisons: eventCounts30d.compare || 0,
    favorites: eventCounts30d.favorite || 0,
    referrals: referralCount,
    shares: 0, // TODO: track shares when implemented
    isUnsubscribed: sub.status === 'UNSUBSCRIBED',
    engagementTrend,
    currentEngagement30d,
    previousEngagement30d,
  }
}

async function countClickoutsInDays(email: string, days: number): Promise<number> {
  const since = new Date(Date.now() - days * 86_400_000)
  return prisma.crmEvent.count({
    where: {
      email,
      eventType: 'clickout',
      createdAt: { gte: since },
    },
  })
}

// ============================================
// STAGE DETERMINATION
// ============================================

function determineStage(signals: SubscriberSignals): LifecycleStage {
  const {
    daysSinceCreated,
    engagementScore,
    clickouts30d,
    searches,
    views,
    comparisons,
    activeAlerts,
    referrals,
    daysSinceLastAction,
  } = signals

  // Advocacy: high engagement + referrals or shares
  if (engagementScore >= 80 && referrals > 0) {
    return 'advocacy'
  }

  // Retention: was in "purchase-like" state, still active after 14+ days
  if (clickouts30d >= 3 && daysSinceCreated >= 14 && daysSinceLastAction < 14) {
    return 'retention'
  }

  // Purchase: frequent clickouts + recent activity (simulated — we don't track actual purchases)
  if (clickouts30d >= 3 && daysSinceLastAction < 7) {
    return 'purchase'
  }

  // Decision: has clickouts, alerts, or comparisons with moderate engagement
  if (
    (clickouts30d > 0 || activeAlerts > 0 || comparisons > 0) &&
    engagementScore >= 30
  ) {
    return 'decision'
  }

  // Consideration: has searches or product views, no clickouts, some engagement
  if ((searches > 0 || views > 0) && clickouts30d === 0 && engagementScore >= 10) {
    return 'consideration'
  }

  // Awareness: new or low engagement
  return 'awareness'
}

// ============================================
// CHURN RISK CALCULATION
// ============================================

function calculateChurnRiskScore(signals: SubscriberSignals, stage: LifecycleStage): number {
  let score = 0

  // Inactivity signals
  if (signals.daysSinceLastAction > 30) {
    score += 40
  } else if (signals.daysSinceLastAction > 14) {
    score += 20
  } else if (signals.daysSinceLastAction > 7) {
    score += 10
  }

  // Declining engagement
  if (signals.engagementTrend === 'declining') {
    score += 20
  }

  // No active alerts
  if (signals.activeAlerts === 0) {
    score += 10
  }

  // No clickouts in 30 days
  if (signals.clickouts30d === 0 && signals.daysSinceCreated > 7) {
    score += 15
  }

  // Was previously engaged, now dormant
  const seg = signals.segment.segment
  if (
    (seg === 'power_user' || seg === 'hot_lead' || seg === 'high_intent') &&
    signals.daysSinceLastAction > 14
  ) {
    score += 25
  }

  // Unsubscribed from email
  if (signals.isUnsubscribed) {
    score += 30
  }

  // Reduce risk for active stages
  if (stage === 'purchase' || stage === 'advocacy') {
    score = Math.max(0, score - 20)
  }

  return Math.min(100, Math.max(0, score))
}

function mapChurnRisk(score: number): ChurnRisk {
  if (score <= 20) return 'none'
  if (score <= 40) return 'low'
  if (score <= 60) return 'medium'
  if (score <= 80) return 'high'
  return 'critical'
}

// ============================================
// NEXT BEST ACTIONS
// ============================================

export function getNextBestActions(
  stage: LifecycleStage,
  churnRisk: ChurnRisk,
  signals: SubscriberSignals,
): NextBestAction[] {
  const actions: NextBestAction[] = []

  // Stage-specific actions
  switch (stage) {
    case 'awareness':
      actions.push(
        {
          action: 'send_guide',
          reason: 'Novo assinante precisa de onboarding e guia de categorias',
          priority: 'high',
          channel: 'email',
          timing: 'next_day',
          template: 'welcome_guide',
        },
        {
          action: 'create_alert_suggestion',
          reason: 'Sugerir primeiro alerta de preco para engajar',
          priority: 'medium',
          channel: 'onsite',
          timing: 'next_day',
          template: 'first_alert_suggestion',
        },
        {
          action: 'show_onsite_banner',
          reason: 'Destacar funcionalidades da plataforma',
          priority: 'low',
          channel: 'onsite',
          timing: 'immediate',
          template: 'features_highlight',
        },
      )
      break

    case 'consideration':
      actions.push(
        {
          action: 'send_comparison',
          reason: 'Enviar comparacoes relevantes para os produtos pesquisados',
          priority: 'high',
          channel: 'email',
          timing: 'next_day',
          template: 'product_comparison',
        },
        {
          action: 'send_deal_alert',
          reason: 'Ofertas nas categorias de interesse',
          priority: 'medium',
          channel: 'email',
          timing: 'next_day',
          template: 'interest_deals',
        },
        {
          action: 'create_alert_suggestion',
          reason: 'Sugerir alerta para produtos pesquisados',
          priority: 'medium',
          channel: 'onsite',
          timing: 'immediate',
          template: 'search_to_alert',
        },
      )
      break

    case 'decision':
      actions.push(
        {
          action: 'send_price_drop',
          reason: 'Queda de preco em produtos visualizados',
          priority: 'high',
          channel: 'email',
          timing: 'immediate',
          template: 'price_drop_viewed',
        },
        {
          action: 'send_deal_alert',
          reason: 'Ofertas urgentes para fechar decisao de compra',
          priority: 'high',
          channel: signals.segment.recommendedChannel === 'WHATSAPP' ? 'whatsapp' : 'email',
          timing: 'next_hour',
          template: 'urgent_deal',
        },
        {
          action: 'send_comparison',
          reason: 'Comparacao final para ajudar na decisao',
          priority: 'medium',
          channel: 'email',
          timing: 'next_day',
          template: 'final_comparison',
        },
      )
      break

    case 'purchase':
      actions.push(
        {
          action: 'send_review_request',
          reason: 'Pedir feedback sobre a experiencia de compra',
          priority: 'medium',
          channel: 'email',
          timing: 'next_week',
          template: 'review_request',
        },
        {
          action: 'send_referral',
          reason: 'Convidar para programa de indicacao',
          priority: 'medium',
          channel: 'email',
          timing: 'next_week',
          template: 'referral_invite',
        },
        {
          action: 'show_onsite_banner',
          reason: 'Cross-sell com produtos complementares',
          priority: 'low',
          channel: 'onsite',
          timing: 'immediate',
          template: 'cross_sell',
        },
      )
      break

    case 'retention':
      actions.push(
        {
          action: 'send_deal_alert',
          reason: 'Manter engajamento com ofertas personalizadas',
          priority: 'medium',
          channel: 'email',
          timing: 'next_day',
          template: 'personalized_deals',
        },
        {
          action: 'send_referral',
          reason: 'Incentivar indicacoes como usuario fidelizado',
          priority: 'medium',
          channel: 'email',
          timing: 'next_week',
          template: 'referral_program',
        },
        {
          action: 'create_alert_suggestion',
          reason: 'Sugerir alertas em novas categorias',
          priority: 'low',
          channel: 'onsite',
          timing: 'next_day',
          template: 'new_category_alert',
        },
      )
      break

    case 'advocacy':
      actions.push(
        {
          action: 'send_referral',
          reason: 'Embaixador pronto para indicar — prioridade maxima',
          priority: 'high',
          channel: 'email',
          timing: 'next_day',
          template: 'ambassador_referral',
        },
        {
          action: 'do_nothing',
          reason: 'Satisfeito e engajado — evitar excesso de mensagens',
          priority: 'low',
          channel: 'email',
          timing: 'next_week',
        },
      )
      break
  }

  // Override with winback for high/critical churn risk
  if (churnRisk === 'critical') {
    actions.unshift({
      action: 'send_winback',
      reason: 'Risco critico de churn — reengajamento imediato necessario',
      priority: 'urgent',
      channel: signals.segment.recommendedChannel === 'WHATSAPP' ? 'whatsapp' : 'email',
      timing: 'immediate',
      template: 'critical_winback',
    })
  } else if (churnRisk === 'high') {
    actions.unshift({
      action: 'send_winback',
      reason: 'Risco alto de churn — enviar campanha de reengajamento',
      priority: 'urgent',
      channel: 'email',
      timing: 'next_hour',
      template: 'winback_campaign',
    })
  }

  // Return top 3 sorted by priority
  const priorityOrder: Record<string, number> = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
  }

  return actions
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 3)
}

// ============================================
// LIFETIME VALUE ESTIMATION
// ============================================

function estimateLTV(signals: SubscriberSignals, stage: LifecycleStage): number {
  // Base: engagement score * R$ 2
  let ltv = signals.engagementScore * 2

  // Clickout multiplier (indicates purchase-ready behaviour)
  if (signals.clickouts30d > 0) {
    ltv *= 3
  }

  // Active alerts multiplier (retention signal)
  if (signals.activeAlerts > 0) {
    ltv *= 1.5
  }

  // Late-stage multiplier
  if (stage === 'retention' || stage === 'advocacy') {
    ltv *= 2
  }

  // Cap at R$ 500
  return Math.min(500, Math.round(ltv * 100) / 100)
}
