/**
 * Assistant Metrics — tracks performance of the AI shopping assistant.
 *
 * Measures: CTR, affiliate coverage, revenue per answer,
 * response quality, and intent understanding accuracy.
 */

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

// ============================================
// TYPES
// ============================================

export interface AssistantInteraction {
  query: string
  intentType: string
  productsShown: number
  productsFromCatalog: number
  productsFromExternal: number
  affiliateCoverage: number  // 0-1 — % of products with valid affiliate
  clickedProductIndex?: number
  clickedSource?: string
  durationMs: number
  timestamp: Date
}

// ============================================
// TRACK INTERACTION
// ============================================

export async function trackAssistantInteraction(interaction: AssistantInteraction): Promise<void> {
  try {
    await prisma.crmEvent.create({
      data: {
        eventType: 'assistant_interaction',
        payload: interaction as any,
      },
    })
  } catch (err) {
    logger.warn('[ASSISTANT-METRICS] Failed to track interaction', { err })
  }
}

// ============================================
// AGGREGATE METRICS
// ============================================

export async function getAssistantMetrics(days = 30): Promise<{
  totalInteractions: number
  avgProductsShown: number
  avgAffiliateCoverage: number
  catalogVsExternalRatio: number
  clickRate: number
  avgDurationMs: number
  topIntentTypes: Array<{ type: string; count: number }>
  revenueEstimate: number
}> {
  const since = new Date(Date.now() - days * 86_400_000)

  const events = await prisma.crmEvent.findMany({
    where: { eventType: 'assistant_interaction', createdAt: { gte: since } },
    select: { payload: true },
  })

  if (events.length === 0) {
    return {
      totalInteractions: 0,
      avgProductsShown: 0,
      avgAffiliateCoverage: 0,
      catalogVsExternalRatio: 0,
      clickRate: 0,
      avgDurationMs: 0,
      topIntentTypes: [],
      revenueEstimate: 0,
    }
  }

  const interactions = events.map(e => e.payload as unknown as AssistantInteraction)

  const totalInteractions = interactions.length
  const avgProductsShown = avg(interactions.map(i => i.productsShown))
  const avgAffiliateCoverage = avg(interactions.map(i => i.affiliateCoverage))

  const totalCatalog = sum(interactions.map(i => i.productsFromCatalog))
  const totalExternal = sum(interactions.map(i => i.productsFromExternal))
  const catalogVsExternalRatio = (totalCatalog + totalExternal) > 0
    ? totalCatalog / (totalCatalog + totalExternal) : 0

  const clicked = interactions.filter(i => i.clickedProductIndex !== undefined)
  const clickRate = totalInteractions > 0 ? clicked.length / totalInteractions : 0

  const avgDurationMs = avg(interactions.map(i => i.durationMs))

  // Intent type breakdown
  const intentCounts = new Map<string, number>()
  for (const i of interactions) {
    intentCounts.set(i.intentType, (intentCounts.get(i.intentType) || 0) + 1)
  }
  const topIntentTypes = [...intentCounts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Revenue estimate: clicked interactions * avg order value * commission rate
  const estimatedAOV = 200 // R$200 average
  const estimatedCommission = 0.035 // 3.5% avg
  const estimatedConversionRate = 0.05 // 5% of clicks convert
  const revenueEstimate = Math.round(
    clicked.length * estimatedConversionRate * estimatedAOV * estimatedCommission
  )

  return {
    totalInteractions,
    avgProductsShown: round2(avgProductsShown),
    avgAffiliateCoverage: round2(avgAffiliateCoverage),
    catalogVsExternalRatio: round2(catalogVsExternalRatio),
    clickRate: round2(clickRate),
    avgDurationMs: Math.round(avgDurationMs),
    topIntentTypes,
    revenueEstimate,
  }
}

// ============================================
// HELPERS
// ============================================

function avg(nums: number[]): number {
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
}

function sum(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
