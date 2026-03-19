/**
 * GET /api/admin/catalog-health
 *
 * Returns catalog quality metrics for admin dashboard:
 * - unmatched listings
 * - low confidence matches
 * - products missing images
 * - products missing categories
 * - offers without affiliate URLs
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { validateAdmin } from '@/lib/auth/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  try {
    const [
      unmatchedListings,
      lowConfidenceListings,
      noImageProducts,
      noCategoryProducts,
      noAffiliateOffers,
      totalProducts,
      totalListings,
      totalOffers,
      sourceDistribution,
    ] = await Promise.all([
      // Unmatched listings (no product linked)
      prisma.listing.findMany({
        where: {
          status: 'ACTIVE',
          productId: null,
        },
        select: {
          id: true,
          rawTitle: true,
          externalId: true,
          source: { select: { slug: true, name: true } },
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),

      // Low confidence matches (matchConfidence < 0.6)
      prisma.listing.findMany({
        where: {
          status: 'ACTIVE',
          productId: { not: null },
          matchConfidence: { lt: 0.6, gt: 0 },
        },
        select: {
          id: true,
          rawTitle: true,
          externalId: true,
          matchConfidence: true,
          source: { select: { slug: true, name: true } },
          product: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { matchConfidence: 'asc' },
        take: 50,
      }),

      // Products without images
      prisma.product.count({
        where: { status: 'ACTIVE', imageUrl: null },
      }),

      // Products without categories
      prisma.product.count({
        where: { status: 'ACTIVE', categoryId: null },
      }),

      // Offers without affiliate URLs
      prisma.offer.count({
        where: {
          isActive: true,
          OR: [
            { affiliateUrl: null },
            { affiliateUrl: '#' },
          ],
        },
      }),

      // Totals
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.listing.count({ where: { status: 'ACTIVE' } }),
      prisma.offer.count({ where: { isActive: true } }),

      // Source distribution
      prisma.listing.groupBy({
        by: ['sourceId'],
        where: { status: 'ACTIVE' },
        _count: { id: true },
      }),
    ])

    // Compute quality score (0-100)
    const issues = [
      noImageProducts > 0 ? Math.min(noImageProducts / totalProducts, 0.3) * 100 : 0,
      noCategoryProducts > 0 ? Math.min(noCategoryProducts / totalProducts, 0.3) * 50 : 0,
      noAffiliateOffers > 0 ? Math.min(noAffiliateOffers / totalOffers, 0.2) * 50 : 0,
      unmatchedListings.length > 0 ? Math.min(unmatchedListings.length / 50, 1) * 30 : 0,
      lowConfidenceListings.length > 0 ? Math.min(lowConfidenceListings.length / 50, 1) * 20 : 0,
    ]
    const totalPenalty = issues.reduce((s, i) => s + i, 0)
    const qualityScore = Math.max(0, Math.round(100 - totalPenalty))

    return NextResponse.json({
      qualityScore,
      totals: {
        products: totalProducts,
        listings: totalListings,
        offers: totalOffers,
      },
      issues: {
        noImageProducts,
        noCategoryProducts,
        noAffiliateOffers,
        unmatchedListingsCount: unmatchedListings.length,
        lowConfidenceCount: lowConfidenceListings.length,
      },
      unmatchedListings: unmatchedListings.map(l => ({
        id: l.id,
        title: l.rawTitle?.slice(0, 80),
        externalId: l.externalId,
        source: l.source.name,
        sourceSlug: l.source.slug,
        createdAt: l.createdAt,
      })),
      lowConfidenceListings: lowConfidenceListings.map(l => ({
        id: l.id,
        title: l.rawTitle?.slice(0, 80),
        confidence: l.matchConfidence,
        source: l.source.name,
        product: l.product ? { name: l.product.name?.slice(0, 60), slug: l.product.slug } : null,
      })),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to compute catalog health' },
      { status: 500 }
    )
  }
}
