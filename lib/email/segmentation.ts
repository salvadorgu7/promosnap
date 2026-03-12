// ============================================
// EMAIL SEGMENTATION — subscriber grouping + deal matching
// ============================================

import prisma from '@/lib/db/prisma'

interface SubscriberLike {
  id: string
  email: string
  interests: string[]
  tags: string[]
  source: string
  frequency: string
}

export interface SubscriberSegment {
  key: string
  label: string
  subscribers: SubscriberLike[]
}

/**
 * Groups subscribers by their interests, tags, and signup source.
 * Returns labeled segments for targeted email campaigns.
 */
export function segmentSubscribers(subscribers: SubscriberLike[]): SubscriberSegment[] {
  const byInterest = new Map<string, SubscriberLike[]>()
  const byTag = new Map<string, SubscriberLike[]>()
  const bySource = new Map<string, SubscriberLike[]>()
  const noSegment: SubscriberLike[] = []

  for (const sub of subscribers) {
    let hasSegment = false

    // Group by interests (category slugs)
    if (sub.interests.length > 0) {
      hasSegment = true
      for (const interest of sub.interests) {
        const key = interest.toLowerCase()
        if (!byInterest.has(key)) byInterest.set(key, [])
        byInterest.get(key)!.push(sub)
      }
    }

    // Group by tags
    if (sub.tags.length > 0) {
      hasSegment = true
      for (const tag of sub.tags) {
        const key = tag.toLowerCase()
        if (!byTag.has(key)) byTag.set(key, [])
        byTag.get(key)!.push(sub)
      }
    }

    // Group by source
    const srcKey = sub.source.toLowerCase()
    if (!bySource.has(srcKey)) bySource.set(srcKey, [])
    bySource.get(srcKey)!.push(sub)

    if (!hasSegment) {
      noSegment.push(sub)
    }
  }

  const segments: SubscriberSegment[] = []

  // Interest segments
  for (const [key, subs] of byInterest) {
    segments.push({
      key: `interest:${key}`,
      label: `Interesse: ${key}`,
      subscribers: subs,
    })
  }

  // Tag segments
  for (const [key, subs] of byTag) {
    segments.push({
      key: `tag:${key}`,
      label: `Tag: ${key}`,
      subscribers: subs,
    })
  }

  // Source segments (only if meaningful size)
  for (const [key, subs] of bySource) {
    if (subs.length >= 2) {
      segments.push({
        key: `source:${key}`,
        label: `Fonte: ${key}`,
        subscribers: subs,
      })
    }
  }

  // Unsegmented group
  if (noSegment.length > 0) {
    segments.push({
      key: 'unsegmented',
      label: 'Sem segmento',
      subscribers: noSegment,
    })
  }

  // Sort by subscriber count descending
  return segments.sort((a, b) => b.subscribers.length - a.subscribers.length)
}

export interface SegmentDeal {
  name: string
  price: number
  discount: number
  url: string
}

/**
 * Gets deals relevant to a given segment based on its key (interest/tag).
 * Falls back to top deals if no segment-specific deals are found.
 */
export async function getSegmentedDeals(segment: SubscriberSegment): Promise<SegmentDeal[]> {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://promosnap.com.br'

  // Extract the category/keyword from segment key
  const [segType, segValue] = segment.key.split(':')

  try {
    // For interest segments, try to find offers in that category
    if (segType === 'interest' && segValue) {
      const deals = await prisma.$queryRaw<SegmentDeal[]>`
        SELECT
          p.name,
          o."currentPrice" AS price,
          CASE
            WHEN o."originalPrice" > 0 AND o."originalPrice" > o."currentPrice"
            THEN ROUND(((o."originalPrice" - o."currentPrice") / o."originalPrice") * 100)
            ELSE 0
          END AS discount,
          COALESCE(o."affiliateUrl", l."productUrl") AS url
        FROM offers o
        JOIN listings l ON l.id = o."listingId"
        JOIN products p ON p.id = l."productId"
        JOIN categories c ON c.id = p."categoryId"
        WHERE o."isActive" = true
          AND p.status = 'ACTIVE'
          AND c.slug = ${segValue}
          AND o."offerScore" > 0
        ORDER BY o."offerScore" DESC
        LIMIT 10
      `

      if (deals.length > 0) {
        return deals.map((d) => ({
          ...d,
          price: Number(d.price),
          discount: Number(d.discount),
          url: d.url || `${APP_URL}/produto/${segValue}`,
        }))
      }
    }

    // For tag segments or fallback: get top deals overall
    if (segType === 'tag' && segValue) {
      const deals = await prisma.$queryRaw<SegmentDeal[]>`
        SELECT
          p.name,
          o."currentPrice" AS price,
          CASE
            WHEN o."originalPrice" > 0 AND o."originalPrice" > o."currentPrice"
            THEN ROUND(((o."originalPrice" - o."currentPrice") / o."originalPrice") * 100)
            ELSE 0
          END AS discount,
          COALESCE(o."affiliateUrl", l."productUrl") AS url
        FROM offers o
        JOIN listings l ON l.id = o."listingId"
        JOIN products p ON p.id = l."productId"
        WHERE o."isActive" = true
          AND p.status = 'ACTIVE'
          AND (LOWER(p.name) LIKE ${'%' + segValue + '%'} OR p.description IS NOT NULL AND LOWER(p.description) LIKE ${'%' + segValue + '%'})
          AND o."offerScore" > 0
        ORDER BY o."offerScore" DESC
        LIMIT 10
      `

      if (deals.length > 0) {
        return deals.map((d) => ({
          ...d,
          price: Number(d.price),
          discount: Number(d.discount),
          url: d.url || `${APP_URL}/ofertas`,
        }))
      }
    }

    // Global fallback — top offers
    const topDeals = await prisma.$queryRaw<SegmentDeal[]>`
      SELECT
        p.name,
        o."currentPrice" AS price,
        CASE
          WHEN o."originalPrice" > 0 AND o."originalPrice" > o."currentPrice"
          THEN ROUND(((o."originalPrice" - o."currentPrice") / o."originalPrice") * 100)
          ELSE 0
        END AS discount,
        COALESCE(o."affiliateUrl", l."productUrl") AS url
      FROM offers o
      JOIN listings l ON l.id = o."listingId"
      JOIN products p ON p.id = l."productId"
      WHERE o."isActive" = true
        AND p.status = 'ACTIVE'
        AND o."offerScore" > 0
      ORDER BY o."offerScore" DESC
      LIMIT 10
    `

    return topDeals.map((d) => ({
      ...d,
      price: Number(d.price),
      discount: Number(d.discount),
      url: d.url || `${APP_URL}/ofertas`,
    }))
  } catch {
    return []
  }
}
