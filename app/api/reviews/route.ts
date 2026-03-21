import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { rateLimit, rateLimitResponse } from '@/lib/security/rate-limit'
import { logger } from '@/lib/logger'

/**
 * GET /api/reviews?productId=xxx — fetch approved user reviews for a product
 * POST /api/reviews — submit a new review
 */

export async function GET(req: NextRequest) {
  const rl = rateLimit(req, 'public')
  if (!rl.success) return rateLimitResponse(rl)

  const productId = req.nextUrl.searchParams.get('productId')
  if (!productId) {
    return NextResponse.json({ error: 'productId required' }, { status: 400 })
  }

  try {
    const reviews = await prisma.userReview.findMany({
      where: { productId, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        rating: true,
        title: true,
        content: true,
        pros: true,
        cons: true,
        authorName: true,
        verified: true,
        helpful: true,
        createdAt: true,
      },
    })

    const aggregate = await prisma.userReview.aggregate({
      where: { productId, status: 'APPROVED' },
      _avg: { rating: true },
      _count: { id: true },
    })

    return NextResponse.json({
      reviews,
      stats: {
        avgRating: aggregate._avg.rating ? Math.round(aggregate._avg.rating * 10) / 10 : null,
        totalReviews: aggregate._count.id,
      },
    })
  } catch (err) {
    logger.error('reviews.get.failed', { productId, error: err })
    return NextResponse.json({ reviews: [], stats: { avgRating: null, totalReviews: 0 } })
  }
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, 'search') // Stricter rate limit for writes
  if (!rl.success) return rateLimitResponse(rl)

  try {
    const body = await req.json()
    const { productId, rating, title, content, pros, cons, authorName, authorEmail } = body

    if (!productId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'productId and rating (1-5) required' }, { status: 400 })
    }

    if (!authorName || authorName.length < 2) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    })

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
    }

    // Check for duplicate (same email + product)
    if (authorEmail) {
      const existing = await prisma.userReview.findFirst({
        where: { productId, authorEmail },
      })
      if (existing) {
        return NextResponse.json({ error: 'Você já avaliou este produto' }, { status: 409 })
      }
    }

    const review = await prisma.userReview.create({
      data: {
        productId,
        rating: Math.min(5, Math.max(1, Math.round(rating))),
        title: title?.slice(0, 100) || null,
        content: content?.slice(0, 1000) || null,
        pros: Array.isArray(pros) ? pros.slice(0, 5).map((p: string) => p.slice(0, 100)) : [],
        cons: Array.isArray(cons) ? cons.slice(0, 5).map((c: string) => c.slice(0, 100)) : [],
        authorName: authorName.slice(0, 50),
        authorEmail: authorEmail?.slice(0, 100) || null,
        status: 'PENDING', // Needs moderation
      },
    })

    logger.info('reviews.created', { reviewId: review.id, productId, rating })

    return NextResponse.json({
      ok: true,
      reviewId: review.id,
      message: 'Avaliação enviada! Será publicada após moderação.',
    })
  } catch (err) {
    logger.error('reviews.create.failed', { error: err })
    return NextResponse.json({ error: 'Erro ao enviar avaliação' }, { status: 500 })
  }
}
