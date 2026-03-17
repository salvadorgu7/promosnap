// ============================================================================
// PromosApp Scorer — Confidence and quality scoring for promo items
// ============================================================================

import { logger } from '@/lib/logger'
import { canonicalMatch } from '@/lib/catalog/canonical-match'
import prisma from '@/lib/db/prisma'
import type {
  PromosAppNormalizedItem,
  PromosAppScore,
  PromosAppScoreFactors,
  PromosAppDecision,
  PromosAppPipelineConfig,
  DEFAULT_PIPELINE_CONFIG,
} from './types'

const log = logger.child({ module: 'promosapp-scorer' })

// ── Spam Detection ─────────────────────────────────────────────────────────

const SPAM_SIGNALS = [
  /ganhe\s+dinheiro/i,
  /renda\s+extra/i,
  /trabalhe\s+de\s+casa/i,
  /esquema\s+/i,
  /clique\s+aqui\s+agora/i,
  /urgente.*compre/i,
  /grátis.*grátis.*grátis/i,
  /cadastre.*ganhe.*prêmio/i,
  /R\$\s*0[,.]0{1,2}\b/, // Price = R$ 0,00
]

function detectSpam(item: PromosAppNormalizedItem): boolean {
  const text = [item.title, item.rawEvent.rawText].filter(Boolean).join(' ')
  return SPAM_SIGNALS.some(pattern => pattern.test(text))
}

// ── Scoring Functions ──────────────────────────────────────────────────────

function scoreLinkValid(item: PromosAppNormalizedItem): number {
  // 10 pts max
  let score = 0
  if (item.productUrl && item.productUrl.startsWith('https://')) score += 4
  if (!item.dedupeKey.startsWith('hash:')) score += 4 // Has real external ID
  if (item.parseErrors.length === 0) score += 2
  return Math.min(score, 10)
}

async function scoreCatalogMatch(item: PromosAppNormalizedItem): Promise<number> {
  // 15 pts max
  try {
    const match = await canonicalMatch({
      rawTitle: item.title,
      rawBrand: null,
      rawCategory: null,
    })
    if (match && match.confidence === 'strong') return 15
    if (match && match.confidence === 'probable') return 10
    if (match && match.confidence === 'weak') return 5
    return 0
  } catch {
    return 0
  }
}

function scorePriceConfirmed(item: PromosAppNormalizedItem, wasEnriched: boolean): number {
  // 15 pts max
  if (wasEnriched && item.currentPrice > 0) return 15
  if (item.currentPrice > 0) return 7 // Price from message parsing only
  return 0
}

function scoreRealDiscount(item: PromosAppNormalizedItem): number {
  // 10 pts max
  if (item.discount >= 50) return 10
  if (item.discount >= 30) return 8
  if (item.discount >= 15) return 5
  if (item.discount > 0) return 3
  return 0
}

function scoreSellerTrusted(_item: PromosAppNormalizedItem): number {
  // 5 pts max — enrichment would provide seller data
  // For now, default to 2 if we have a known marketplace
  if (_item.sourceSlug !== 'unknown') return 3
  return 0
}

function scoreVolumeSold(_item: PromosAppNormalizedItem): number {
  // 5 pts max — requires enrichment data
  // Placeholder: enrichment result would populate this
  return 0
}

async function scoreMultiSource(item: PromosAppNormalizedItem): Promise<number> {
  // 10 pts max — same product seen across multiple channels = higher confidence
  if (item.dedupeKey.startsWith('hash:')) return 0 // Can't match without real external ID

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    // dedupeKey is stored as externalId in CatalogCandidate
    const candidates = await prisma.catalogCandidate.findMany({
      where: {
        externalId: item.dedupeKey,
        sourceSlug: 'promosapp',
        status: { not: 'REJECTED' },
        createdAt: { gte: sevenDaysAgo },
      },
      select: { enrichedData: true },
    })

    // Count distinct sourceChannels from enrichedData JSON
    const channels = new Set<string>()
    for (const c of candidates) {
      const data = c.enrichedData as Record<string, any> | null
      const ch = data?.sourceChannel
      if (ch) channels.add(ch)
    }
    // Include current item's channel
    if (item.rawEvent.sourceChannel) channels.add(item.rawEvent.sourceChannel)

    if (channels.size >= 3) return 10
    if (channels.size === 2) return 6
    return 0
  } catch {
    return 0
  }
}

function scoreNoSpam(item: PromosAppNormalizedItem): number {
  // 10 pts max
  if (detectSpam(item)) return 0
  return 10
}

function scoreHasImage(item: PromosAppNormalizedItem): number {
  // 5 pts max
  return item.imageUrl ? 5 : 0
}

function scoreCouponConfirmed(item: PromosAppNormalizedItem): number {
  // 5 pts max
  if (item.couponCode && item.couponCode.length >= 3) return 5
  return 0
}

function scoreAvailable(item: PromosAppNormalizedItem): number {
  // 10 pts max
  // If enrichment confirmed availability, full score
  // Otherwise, assume available if we have a valid link
  if (item.productUrl && item.currentPrice > 0) return 7
  return 0
}

// ── Main Scoring ───────────────────────────────────────────────────────────

/**
 * Score a single item. Returns detailed breakdown.
 */
export async function scoreItem(
  item: PromosAppNormalizedItem,
  options?: { wasEnriched?: boolean }
): Promise<PromosAppScore> {
  const wasEnriched = options?.wasEnriched ?? false

  const factors: PromosAppScoreFactors = {
    linkValid: scoreLinkValid(item),
    catalogMatch: await scoreCatalogMatch(item),
    priceConfirmed: scorePriceConfirmed(item, wasEnriched),
    realDiscount: scoreRealDiscount(item),
    sellerTrusted: scoreSellerTrusted(item),
    volumeSold: scoreVolumeSold(item),
    multiSourceRepetition: await scoreMultiSource(item),
    noSpamSignals: scoreNoSpam(item),
    hasImage: scoreHasImage(item),
    couponConfirmed: scoreCouponConfirmed(item),
    available: scoreAvailable(item),
  }

  const total = Math.min(
    100,
    factors.linkValid +
    factors.catalogMatch +
    factors.priceConfirmed +
    factors.realDiscount +
    factors.sellerTrusted +
    factors.volumeSold +
    factors.multiSourceRepetition +
    factors.noSpamSignals +
    factors.hasImage +
    factors.couponConfirmed +
    factors.available
  )

  const tier = total >= 70 ? 'high' : total >= 40 ? 'medium' : 'low'

  return { total, factors, tier }
}

/**
 * Determine the decision for a scored item based on config thresholds.
 */
export function decideAction(
  score: PromosAppScore,
  config: { autoApproveThreshold: number; rejectThreshold: number }
): PromosAppDecision {
  if (score.total >= config.autoApproveThreshold) return 'auto_approve'
  if (score.total < config.rejectThreshold) return 'rejected'
  return 'pending_review'
}

/**
 * Score a batch of items.
 */
export async function scoreBatch(
  items: PromosAppNormalizedItem[],
  options?: { wasEnriched?: boolean[] }
): Promise<Array<{ item: PromosAppNormalizedItem; score: PromosAppScore }>> {
  const results: Array<{ item: PromosAppNormalizedItem; score: PromosAppScore }> = []

  for (let i = 0; i < items.length; i++) {
    const wasEnriched = options?.wasEnriched?.[i] ?? false
    const score = await scoreItem(items[i], { wasEnriched })
    results.push({ item: items[i], score })
  }

  log.info('promosapp.scored-batch', {
    total: items.length,
    high: results.filter(r => r.score.tier === 'high').length,
    medium: results.filter(r => r.score.tier === 'medium').length,
    low: results.filter(r => r.score.tier === 'low').length,
    avgScore: results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.score.total, 0) / results.length)
      : 0,
  })

  return results
}
