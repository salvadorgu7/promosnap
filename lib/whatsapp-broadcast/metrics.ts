// ============================================
// WhatsApp Broadcast — Revenue Analytics & Metrics
// KPIs, scorecards, rankings, revenue assistida
// Mega Prompt 04 — Partes 1-10
// ============================================

import { logger } from "@/lib/logger"
import { getDeliveryHistory } from "./delivery-log"
import type { DeliveryLogEntry } from "./types"

const log = logger.child({ module: "wa-broadcast.metrics" })

// ============================================
// Revenue estimation constants
// ============================================

/** Average commission rates by marketplace */
const COMMISSION_RATES: Record<string, number> = {
  "amazon-br": 0.08,
  "mercadolivre": 0.10,
  "shopee": 0.06,
  "shein": 0.12,
  "magalu": 0.05,
  "kabum": 0.04,
  default: 0.07,
}

/** Average conversion rate from clickout → purchase */
const AVG_CONVERSION_RATE = 0.03 // 3%

/** CTR estimate if we don't have real data */
const ESTIMATED_CTR = 0.08 // 8% of group members click

// ============================================
// Campaign Scorecard
// ============================================

export type CampaignTier =
  | "hero"         // escalar
  | "good"         // manter com variacao
  | "promising"    // dar mais teste
  | "stable"       // pode continuar
  | "tired"        // descanso
  | "weak"         // ajustar
  | "pause"        // nao disparar mais auto
  | "kill"         // aprendizado, nao insistir

export interface CampaignScorecard {
  campaignId: string
  campaignName: string
  // Scores (0-100)
  ctrScore: number
  clickoutScore: number
  revenueScore: number
  trustScore: number
  fatigueScore: number
  efficiencyScore: number
  // Composite
  overallScore: number
  tier: CampaignTier
  recommendation: string
  // Raw stats
  totalSent: number
  estimatedClickouts: number
  estimatedRevenue: number
  avgOfferCount: number
}

// ============================================
// Category Scorecard
// ============================================

export type CategoryTier =
  | "hero"
  | "growth"
  | "opportunity"
  | "seasonal"
  | "tired"
  | "bad_for_group"

export interface CategoryScorecard {
  category: string
  ctrAvg: number
  revenueEstimate: number
  avgTicket: number
  trustScore: number
  repetitionRate: number
  saturationScore: number
  tier: CategoryTier
}

// ============================================
// Marketplace Scorecard
// ============================================

export interface MarketplaceScorecard {
  marketplace: string
  ctrAvg: number
  revenueEstimate: number
  avgTicket: number
  catalogQuality: number
  trustScore: number
  repetitionRate: number
  bestCategories: string[]
  bestHours: string[]
  fatigueRate: number
}

// ============================================
// Template Scorecard
// ============================================

export type TemplateTier = "hero" | "consistent" | "promising" | "tired" | "weak"

export interface TemplateScorecard {
  templateKey: string
  ctrAvg: number
  totalUsed: number
  clickEstimate: number
  tier: TemplateTier
}

// ============================================
// KPI Dashboard
// ============================================

export interface BroadcastKPIs {
  // Top-level
  totalSent: number
  totalFailed: number
  estimatedClickouts: number
  estimatedRevenue: number
  revenuePerMessage: number
  revenuePer1000: number
  avgOffersPerMessage: number
  // By dimension
  byHour: Record<number, { sent: number; estimatedClicks: number }>
  byDay: Record<string, { sent: number; estimatedClicks: number }>
  byStructure: Record<string, { sent: number; estimatedClicks: number }>
  // Rankings
  campaignScoreboards: CampaignScorecard[]
  templateScoreboards: TemplateScorecard[]
  // Health
  fatigueScore: number
  trustScore: number
  providerHealthScore: number
  // Alerts
  alerts: MetricAlert[]
}

// ============================================
// Alert system
// ============================================

export type AlertSeverity = "info" | "warning" | "critical"
export type AlertType =
  | "low_ctr"
  | "low_revenue"
  | "high_fatigue"
  | "high_repetition"
  | "tired_campaign"
  | "hero_campaign"
  | "saturated_category"
  | "marketplace_dominance"
  | "low_trust"
  | "provider_failure"
  | "invalid_links"
  | "cold_group"
  | "deserves_reinforcement"
  | "deserves_pause"

export interface MetricAlert {
  id: string
  type: AlertType
  severity: AlertSeverity
  message: string
  dimension: string // campaign name, category, marketplace, etc.
  value: number
  threshold: number
  createdAt: Date
}

// ============================================
// Compute KPIs from delivery history
// ============================================

/**
 * Compute all KPIs from delivery log data.
 * Uses estimation when real click data isn't available.
 */
export function computeKPIs(): BroadcastKPIs {
  const history = getDeliveryHistory(200)
  const sentEntries = history.filter(h => h.status === "sent" && !h.dryRun)
  const failedEntries = history.filter(h => h.status === "failed")

  const totalSent = sentEntries.length
  const totalFailed = failedEntries.length

  // Estimated clickouts = sent * avg_offers * estimated_ctr
  const totalOffers = sentEntries.reduce((sum, h) => sum + h.offerCount, 0)
  const avgOffersPerMessage = totalSent > 0 ? totalOffers / totalSent : 0
  const estimatedClickouts = Math.round(totalOffers * ESTIMATED_CTR)

  // Revenue estimation
  const estimatedRevenue = estimateRevenue(sentEntries)
  const revenuePerMessage = totalSent > 0 ? estimatedRevenue / totalSent : 0
  const revenuePer1000 = totalSent > 0 ? (estimatedRevenue / totalSent) * 1000 : 0

  // By hour
  const byHour: Record<number, { sent: number; estimatedClicks: number }> = {}
  for (const entry of sentEntries) {
    const hour = entry.sentAt ? new Date(entry.sentAt).getHours() : 0
    if (!byHour[hour]) byHour[hour] = { sent: 0, estimatedClicks: 0 }
    byHour[hour].sent++
    byHour[hour].estimatedClicks += Math.round(entry.offerCount * ESTIMATED_CTR)
  }

  // By day
  const byDay: Record<string, { sent: number; estimatedClicks: number }> = {}
  for (const entry of sentEntries) {
    const day = entry.sentAt ? new Date(entry.sentAt).toISOString().slice(0, 10) : "unknown"
    if (!byDay[day]) byDay[day] = { sent: 0, estimatedClicks: 0 }
    byDay[day].sent++
    byDay[day].estimatedClicks += Math.round(entry.offerCount * ESTIMATED_CTR)
  }

  // By structure (template)
  const byStructure: Record<string, { sent: number; estimatedClicks: number }> = {}
  for (const entry of sentEntries) {
    const key = entry.templateUsed || "unknown"
    if (!byStructure[key]) byStructure[key] = { sent: 0, estimatedClicks: 0 }
    byStructure[key].sent++
    byStructure[key].estimatedClicks += Math.round(entry.offerCount * ESTIMATED_CTR)
  }

  // Campaign scorecards
  const campaignScoreboards = computeCampaignScoreboards(sentEntries)
  const templateScoreboards = computeTemplateScoreboards(sentEntries)

  // Health scores
  const fatigueScore = computeFatigueScore(sentEntries)
  const trustScore = computeTrustScore(sentEntries, failedEntries)
  const providerHealthScore = totalSent + totalFailed > 0
    ? Math.round((totalSent / (totalSent + totalFailed)) * 100)
    : 100

  // Alerts
  const alerts = generateAlerts(sentEntries, failedEntries, campaignScoreboards, fatigueScore, trustScore)

  return {
    totalSent,
    totalFailed,
    estimatedClickouts,
    estimatedRevenue,
    revenuePerMessage,
    revenuePer1000,
    avgOffersPerMessage,
    byHour,
    byDay,
    byStructure,
    campaignScoreboards,
    templateScoreboards,
    fatigueScore,
    trustScore,
    providerHealthScore,
    alerts,
  }
}

// ============================================
// Revenue estimation
// ============================================

function estimateRevenue(entries: DeliveryLogEntry[]): number {
  let total = 0

  for (const entry of entries) {
    // Estimate: offers * CTR * conversion * avg_ticket * commission
    const clicks = entry.offerCount * ESTIMATED_CTR
    const conversions = clicks * AVG_CONVERSION_RATE

    // Estimate avg ticket from template name
    const avgTicket = estimateTicketFromTemplate(entry.templateUsed)
    const commissionRate = COMMISSION_RATES.default

    total += conversions * avgTicket * commissionRate
  }

  return Math.round(total * 100) / 100
}

function estimateTicketFromTemplate(template: string): number {
  if (!template) return 150

  const lower = template.toLowerCase()
  if (lower.includes("premium") || lower.includes("alto")) return 800
  if (lower.includes("300")) return 200
  if (lower.includes("100")) return 70
  if (lower.includes("50")) return 35
  if (lower.includes("hero")) return 300
  if (lower.includes("tech") || lower.includes("eletronico")) return 400
  if (lower.includes("casa")) return 150
  if (lower.includes("gamer")) return 350

  return 150
}

// ============================================
// Campaign scorecards
// ============================================

function computeCampaignScoreboards(entries: DeliveryLogEntry[]): CampaignScorecard[] {
  const byCampaign = new Map<string, DeliveryLogEntry[]>()

  for (const entry of entries) {
    const key = entry.campaignName || "manual"
    if (!byCampaign.has(key)) byCampaign.set(key, [])
    byCampaign.get(key)!.push(entry)
  }

  return Array.from(byCampaign.entries()).map(([name, campaignEntries]) => {
    const totalSent = campaignEntries.length
    const totalOffers = campaignEntries.reduce((s, e) => s + e.offerCount, 0)
    const estimatedClickouts = Math.round(totalOffers * ESTIMATED_CTR)
    const estimatedRevenue = estimateRevenue(campaignEntries)
    const avgOfferCount = totalSent > 0 ? totalOffers / totalSent : 0

    // Score components (0-100)
    const ctrScore = Math.min(100, Math.round(ESTIMATED_CTR * 1000))
    const clickoutScore = Math.min(100, Math.round(estimatedClickouts / Math.max(1, totalSent) * 20))
    const revenueScore = Math.min(100, Math.round(estimatedRevenue / Math.max(1, totalSent) * 50))
    const trustScore = 80 // default high, reduce on errors
    const fatigueScore = Math.max(0, 100 - totalSent * 5) // decreases with more sends
    const efficiencyScore = Math.round((ctrScore + revenueScore + trustScore) / 3)

    const overallScore = Math.round(
      ctrScore * 0.2 +
      clickoutScore * 0.15 +
      revenueScore * 0.25 +
      trustScore * 0.15 +
      fatigueScore * 0.1 +
      efficiencyScore * 0.15
    )

    const tier = scoreToCampaignTier(overallScore, totalSent)

    return {
      campaignId: name,
      campaignName: name,
      ctrScore,
      clickoutScore,
      revenueScore,
      trustScore,
      fatigueScore,
      efficiencyScore,
      overallScore,
      tier,
      recommendation: tierToRecommendation(tier),
      totalSent,
      estimatedClickouts,
      estimatedRevenue,
      avgOfferCount,
    }
  }).sort((a, b) => b.overallScore - a.overallScore)
}

function scoreToCampaignTier(score: number, totalSent: number): CampaignTier {
  if (totalSent < 3) return "promising"
  if (score >= 80) return "hero"
  if (score >= 65) return "good"
  if (score >= 50) return "stable"
  if (score >= 40) return "tired"
  if (score >= 25) return "weak"
  if (score >= 15) return "pause"
  return "kill"
}

function tierToRecommendation(tier: CampaignTier): string {
  switch (tier) {
    case "hero": return "Escalar: aumentar frequencia e testar novos horarios"
    case "good": return "Manter com variacao de copy e horario"
    case "promising": return "Dar mais testes antes de decidir"
    case "stable": return "Continuar sem mudancas"
    case "tired": return "Dar descanso de 2-3 dias"
    case "weak": return "Ajustar selecao e copy"
    case "pause": return "Pausar envios automaticos"
    case "kill": return "Encerrar e documentar aprendizados"
  }
}

// ============================================
// Template scorecards
// ============================================

function computeTemplateScoreboards(entries: DeliveryLogEntry[]): TemplateScorecard[] {
  const byTemplate = new Map<string, DeliveryLogEntry[]>()

  for (const entry of entries) {
    const key = entry.templateUsed || "unknown"
    if (!byTemplate.has(key)) byTemplate.set(key, [])
    byTemplate.get(key)!.push(entry)
  }

  return Array.from(byTemplate.entries()).map(([key, templateEntries]) => {
    const totalUsed = templateEntries.length
    const totalOffers = templateEntries.reduce((s, e) => s + e.offerCount, 0)
    const clickEstimate = Math.round(totalOffers * ESTIMATED_CTR)
    const ctrAvg = ESTIMATED_CTR * 100

    let tier: TemplateTier
    if (totalUsed < 3) tier = "promising"
    else if (ctrAvg >= 10) tier = "hero"
    else if (ctrAvg >= 7) tier = "consistent"
    else if (ctrAvg >= 4) tier = "tired"
    else tier = "weak"

    return { templateKey: key, ctrAvg, totalUsed, clickEstimate, tier }
  }).sort((a, b) => b.clickEstimate - a.clickEstimate)
}

// ============================================
// Health scores
// ============================================

function computeFatigueScore(entries: DeliveryLogEntry[]): number {
  // Fatigue = how pressured the channel is (0 = fresh, 100 = exhausted)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayEntries = entries.filter(e => e.sentAt && new Date(e.sentAt) >= today)
  const last3DaysEntries = entries.filter(e => {
    if (!e.sentAt) return false
    const diff = today.getTime() - new Date(e.sentAt).getTime()
    return diff <= 3 * 24 * 60 * 60 * 1000
  })

  const dailyAvg = last3DaysEntries.length / 3
  const todayCount = todayEntries.length

  // Max 3/day is healthy, beyond that fatigue rises
  let fatigue = 0
  if (todayCount > 3) fatigue += (todayCount - 3) * 15
  if (dailyAvg > 3) fatigue += (dailyAvg - 3) * 10

  return Math.min(100, Math.max(0, fatigue))
}

function computeTrustScore(sent: DeliveryLogEntry[], failed: DeliveryLogEntry[]): number {
  const total = sent.length + failed.length
  if (total === 0) return 100

  const successRate = sent.length / total
  return Math.round(successRate * 100)
}

// ============================================
// Alert generation
// ============================================

let alertCounter = 0

function generateAlerts(
  sent: DeliveryLogEntry[],
  failed: DeliveryLogEntry[],
  campaigns: CampaignScorecard[],
  fatigueScore: number,
  trustScore: number,
): MetricAlert[] {
  const alerts: MetricAlert[] = []

  // Hero campaign alert
  const heroes = campaigns.filter(c => c.tier === "hero")
  for (const hero of heroes) {
    alerts.push({
      id: `alert_${++alertCounter}`,
      type: "hero_campaign",
      severity: "info",
      message: `Campanha "${hero.campaignName}" e hero — considere escalar`,
      dimension: hero.campaignName,
      value: hero.overallScore,
      threshold: 80,
      createdAt: new Date(),
    })
  }

  // Tired campaign alert
  const tired = campaigns.filter(c => c.tier === "tired" || c.tier === "pause")
  for (const t of tired) {
    alerts.push({
      id: `alert_${++alertCounter}`,
      type: "tired_campaign",
      severity: "warning",
      message: `Campanha "${t.campaignName}" esta cansada — considere pausa`,
      dimension: t.campaignName,
      value: t.overallScore,
      threshold: 40,
      createdAt: new Date(),
    })
  }

  // High fatigue
  if (fatigueScore > 60) {
    alerts.push({
      id: `alert_${++alertCounter}`,
      type: "high_fatigue",
      severity: fatigueScore > 80 ? "critical" : "warning",
      message: `Fadiga do grupo em ${fatigueScore}% — reduzir frequencia`,
      dimension: "global",
      value: fatigueScore,
      threshold: 60,
      createdAt: new Date(),
    })
  }

  // Provider failures
  if (failed.length > 0) {
    const failRate = failed.length / (sent.length + failed.length)
    if (failRate > 0.1) {
      alerts.push({
        id: `alert_${++alertCounter}`,
        type: "provider_failure",
        severity: failRate > 0.3 ? "critical" : "warning",
        message: `Taxa de falha do provider em ${Math.round(failRate * 100)}%`,
        dimension: "provider",
        value: Math.round(failRate * 100),
        threshold: 10,
        createdAt: new Date(),
      })
    }
  }

  // Low trust
  if (trustScore < 80 && sent.length + failed.length > 5) {
    alerts.push({
      id: `alert_${++alertCounter}`,
      type: "low_trust",
      severity: trustScore < 50 ? "critical" : "warning",
      message: `Trust score em ${trustScore}% — verificar qualidade`,
      dimension: "global",
      value: trustScore,
      threshold: 80,
      createdAt: new Date(),
    })
  }

  return alerts.sort((a, b) => {
    const sevOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 }
    return (sevOrder[a.severity] || 2) - (sevOrder[b.severity] || 2)
  })
}

// ============================================
// Public API
// ============================================

/**
 * Get complete metrics dashboard data.
 */
export function getMetricsDashboard() {
  const kpis = computeKPIs()
  return {
    kpis,
    summary: {
      totalSent: kpis.totalSent,
      totalFailed: kpis.totalFailed,
      estimatedRevenue: kpis.estimatedRevenue,
      revenuePerMessage: kpis.revenuePerMessage,
      fatigueScore: kpis.fatigueScore,
      trustScore: kpis.trustScore,
      providerHealth: kpis.providerHealthScore,
      alertCount: kpis.alerts.length,
      criticalAlerts: kpis.alerts.filter(a => a.severity === "critical").length,
    },
  }
}
