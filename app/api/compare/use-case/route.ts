/**
 * GET /api/compare/use-case?category=celulares&useCase=fotografia&limit=5
 *
 * Returns products ranked by how well they fit a specific use case.
 * Powers "melhor para fotografia", "melhor para gaming", etc.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { rateLimit, rateLimitResponse } from '@/lib/security/rate-limit'
import { getCategoryConfig, rankByUseCase, getUseCasesForCategory } from '@/lib/comparison/category-specs'
import { buildProductCard, PRODUCT_INCLUDE } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'public')
  if (!rl.success) return rateLimitResponse(rl)

  const categorySlug = req.nextUrl.searchParams.get('category')
  const useCaseSlug = req.nextUrl.searchParams.get('useCase')
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '10', 10), 20)

  if (!categorySlug) {
    return NextResponse.json({ error: 'category parameter required' }, { status: 400 })
  }

  const config = getCategoryConfig(categorySlug)
  if (!config) {
    return NextResponse.json({
      error: `Category "${categorySlug}" not configured for comparison`,
      availableCategories: ['celulares', 'notebooks', 'audio', 'smart-tvs'],
    }, { status: 400 })
  }

  // If no useCase, return available use cases for this category
  if (!useCaseSlug) {
    return NextResponse.json({
      category: config.name,
      useCases: config.useCases.map(uc => ({
        slug: uc.slug,
        label: uc.label,
        description: uc.description,
      })),
      attributes: config.attributes.map(a => ({
        key: a.key,
        label: a.label,
        unit: a.unit,
      })),
    })
  }

  try {
    // Find category in DB
    const category = await prisma.category.findUnique({
      where: { slug: categorySlug },
      select: { id: true },
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found in database' }, { status: 404 })
    }

    // Get active products in this category with offers
    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        categoryId: category.id,
        imageUrl: { not: null },
        listings: {
          some: {
            offers: { some: { isActive: true } },
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        ...PRODUCT_INCLUDE,
      },
      take: 50, // Fetch more to rank and cut
    })

    // Rank by use case
    const ranked = rankByUseCase(
      products.map(p => ({
        id: p.id,
        name: p.name,
        title: p.name, // Use product name as title for attribute extraction
        specsJson: null, // TODO: fetch from variants when available
      })),
      useCaseSlug,
      categorySlug
    )

    // Build product cards for top results
    const topIds = new Set(ranked.slice(0, limit).map(r => r.productId))
    const topProducts = products.filter(p => topIds.has(p.id))

    const cards = topProducts
      .map(p => {
        const card = buildProductCard(p)
        if (!card) return null
        const useCaseData = ranked.find(r => r.productId === p.id)
        return {
          ...card,
          useCaseScore: useCaseData?.score || 0,
          useCaseBreakdown: useCaseData?.breakdown || [],
        }
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.useCaseScore - a.useCaseScore)
      .slice(0, limit)

    const useCase = config.useCases.find(uc => uc.slug === useCaseSlug)

    return NextResponse.json({
      category: config.name,
      useCase: {
        slug: useCaseSlug,
        label: useCase?.label || useCaseSlug,
        description: useCase?.description || '',
      },
      products: cards,
      totalEvaluated: products.length,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to rank products' }, { status: 500 })
  }
}
