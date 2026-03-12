// ============================================
// EDITORIAL SCORE — organic + commercial potential
// ============================================

import prisma from '@/lib/db/prisma'

export interface EditorialScore {
  score: number
  organic: number
  commercial: number
  competition: 'low' | 'medium' | 'high'
}

/**
 * Calculates the organic + commercial potential of a content opportunity.
 * Uses search_logs frequency, existing product count, and clickout data.
 */
export async function scoreContentOpportunity(
  keyword: string,
  type: 'guide' | 'comparison' | 'price' | 'collection'
): Promise<EditorialScore> {
  const normalizedKeyword = keyword.toLowerCase().trim()

  let searchFrequency = 0
  let productCount = 0
  let clickoutCount = 0
  let competitorPages = 0

  try {
    // Search frequency in last 30 days
    const searchResult = await prisma.$queryRaw<[{ count: number }]>`
      SELECT COUNT(*)::int AS count
      FROM search_logs
      WHERE LOWER(query) LIKE ${'%' + normalizedKeyword + '%'}
        AND "createdAt" > NOW() - INTERVAL '30 days'
    `
    searchFrequency = searchResult[0]?.count ?? 0
  } catch {
    // table may be empty
  }

  try {
    // Products matching the keyword
    productCount = await prisma.product.count({
      where: {
        status: 'ACTIVE',
        OR: [
          { name: { contains: normalizedKeyword, mode: 'insensitive' } },
          { description: { contains: normalizedKeyword, mode: 'insensitive' } },
        ],
      },
    })
  } catch {
    // fallback
  }

  try {
    // Clickout volume for related queries
    const clickoutResult = await prisma.$queryRaw<[{ count: number }]>`
      SELECT COUNT(*)::int AS count
      FROM clickouts c
      WHERE c.query IS NOT NULL
        AND LOWER(c.query) LIKE ${'%' + normalizedKeyword + '%'}
        AND c."clickedAt" > NOW() - INTERVAL '30 days'
    `
    clickoutCount = clickoutResult[0]?.count ?? 0
  } catch {
    // clickouts may not have relevant data
  }

  try {
    // Competition: count existing articles/pages covering this keyword
    competitorPages = await prisma.article.count({
      where: {
        status: 'PUBLISHED',
        OR: [
          { title: { contains: normalizedKeyword, mode: 'insensitive' } },
          { content: { contains: normalizedKeyword, mode: 'insensitive' } },
        ],
      },
    })
  } catch {
    // fallback
  }

  // Organic score: based on search frequency
  const organic = Math.min(100, Math.round(
    (searchFrequency >= 100 ? 100 :
     searchFrequency >= 50 ? 70 :
     searchFrequency >= 20 ? 50 :
     searchFrequency >= 5 ? 30 : 10)
  ))

  // Commercial score: based on product availability and clickouts
  const productSignal = productCount >= 20 ? 40 : productCount >= 5 ? 25 : productCount >= 1 ? 15 : 0
  const clickoutSignal = clickoutCount >= 50 ? 40 : clickoutCount >= 20 ? 30 : clickoutCount >= 5 ? 20 : clickoutCount >= 1 ? 10 : 0
  // Type bonus
  const typeBonus = type === 'price' ? 20 : type === 'comparison' ? 15 : type === 'collection' ? 10 : 5
  const commercial = Math.min(100, productSignal + clickoutSignal + typeBonus)

  // Competition level
  const competition: EditorialScore['competition'] =
    competitorPages >= 5 ? 'high' :
    competitorPages >= 2 ? 'medium' : 'low'

  // Composite score: weighted average with competition discount
  const competitionDiscount = competition === 'high' ? 0.7 : competition === 'medium' ? 0.85 : 1.0
  const score = Math.round(((organic * 0.45) + (commercial * 0.55)) * competitionDiscount)

  return { score, organic, commercial, competition }
}
