// ============================================================================
// Opportunity Engine — identifies actionable catalog improvements
// ============================================================================

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import type { Opportunity, OpportunitySummary, OpportunityPriority } from './types'

/**
 * Get top opportunities ordered by priority.
 */
export async function getTopOpportunities(limit = 10): Promise<Opportunity[]> {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const opportunities: Opportunity[] = []

  try {
    // 1. Products without category (critical)
    const noCat = await prisma.product.count({
      where: { status: 'ACTIVE', categoryId: null },
    })
    if (noCat > 0) {
      opportunities.push({
        id: 'no-category',
        type: 'no_category',
        priority: 'critical',
        title: `${noCat} produtos sem categoria`,
        description: 'Produtos sem categoria nao aparecem nas pages de categoria e prejudicam SEO.',
        impact: `${noCat} produtos invisiveis em navegacao por categoria`,
        actionUrl: '/admin/produtos?filter=no-category',
        impactScore: 90,
        confidenceScore: 95,
        createdAt: now,
      })
    }

    // 2. Offers without affiliate URL (high — directly affects revenue)
    const noAffiliate = await prisma.offer.count({
      where: { isActive: true, OR: [{ affiliateUrl: null }, { affiliateUrl: '#' }] },
    })
    if (noAffiliate > 0) {
      opportunities.push({
        id: 'missing-affiliate',
        type: 'missing_affiliate',
        priority: 'high',
        title: `${noAffiliate} ofertas sem affiliate link`,
        description: 'Ofertas sem affiliate URL nao geram receita quando clicadas.',
        impact: `${noAffiliate} clickouts potenciais sem monetizacao`,
        actionUrl: '/admin/ofertas',
        impactScore: 85,
        confidenceScore: 90,
        createdAt: now,
      })
    }

    // 3. Stale offers (medium)
    const stale = await prisma.offer.count({
      where: { isActive: true, lastSeenAt: { lt: sevenDaysAgo } },
    })
    if (stale > 0) {
      opportunities.push({
        id: 'stale-offers',
        type: 'stale_offer',
        priority: 'medium',
        title: `${stale} ofertas desatualizadas (>7 dias)`,
        description: 'Ofertas nao verificadas ha mais de 7 dias podem ter precos incorretos.',
        impact: 'Perda de confianca do usuario com precos desatualizados',
        actionUrl: '/admin/jobs',
        impactScore: 60,
        confidenceScore: 85,
        createdAt: now,
      })
    }

    // 4. Products without image (medium)
    const noImage = await prisma.product.count({
      where: { status: 'ACTIVE', OR: [{ imageUrl: null }, { imageUrl: '' }] },
    })
    if (noImage > 0) {
      opportunities.push({
        id: 'no-image',
        type: 'no_image',
        priority: 'medium',
        title: `${noImage} produtos sem imagem`,
        description: 'Produtos sem imagem tem taxa de conversao muito menor.',
        impact: `${noImage} produtos com baixa conversao`,
        actionUrl: '/admin/produtos?filter=no-image',
        impactScore: 55,
        confidenceScore: 95,
        createdAt: now,
      })
    }

    // 5. Low-score active offers (low)
    const lowScore = await prisma.offer.count({
      where: { isActive: true, offerScore: { lt: 15 } },
    })
    if (lowScore > 0) {
      opportunities.push({
        id: 'low-score',
        type: 'low_score',
        priority: 'low',
        title: `${lowScore} ofertas com score muito baixo (<15)`,
        description: 'Ofertas com score muito baixo raramente sao exibidas.',
        impact: 'Espaco no catalogo ocupado por ofertas fracas',
        impactScore: 30,
        confidenceScore: 80,
        createdAt: now,
      })
    }
  } catch (err) {
    logger.warn("opportunity.fetch-error", { error: err })
  }

  // Sort by priority
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  return opportunities
    .sort((a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9))
    .slice(0, limit)
}

/**
 * Summarize opportunities by priority and type.
 */
export function summarizeOpportunities(opportunities: Opportunity[]): OpportunitySummary {
  const counts: Record<OpportunityPriority, number> = { critical: 0, high: 0, medium: 0, low: 0 }
  const typeCounts: Record<string, number> = {}

  for (const opp of opportunities) {
    counts[opp.priority]++
    typeCounts[opp.type] = (typeCounts[opp.type] || 0) + 1
  }

  const avgImpact = opportunities.length > 0
    ? Math.round(opportunities.reduce((sum, o) => sum + o.impactScore, 0) / opportunities.length)
    : 0

  return {
    total: opportunities.length,
    ...counts,
    byCritical: counts.critical,
    averageImpact: avgImpact,
    topTypes: Object.entries(typeCounts)
      .map(([type, count]) => ({ type: type as any, count }))
      .sort((a, b) => b.count - a.count),
  }
}
