import { NextRequest, NextResponse } from "next/server"
import { rateLimit } from "@/lib/security/rate-limit"
import { generateProductSummary } from "@/lib/ai/product-summary"
import { getProductBySlug } from "@/lib/db/queries"
import { computePriceStats } from "@/lib/price/analytics"
import { generateBuySignal } from "@/lib/decision/buy-signal"
import { getReviewAggregate } from "@/lib/reviews/aggregate"
import { getFlag } from "@/lib/config/feature-flags"
import prisma from "@/lib/db/prisma"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  // Rate limit
  const rl = rateLimit(req, "public")
  if (!rl.success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 })
  }

  // Feature flag check
  if (!getFlag("buySignals")) {
    return NextResponse.json({ error: "Feature not enabled" }, { status: 503 })
  }

  let body: { slug?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const slug = body.slug
  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ error: "slug required" }, { status: 400 })
  }

  // Check cache first
  const product = await getProductBySlug(slug)
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 })
  }

  // Check if we have a cached AI summary
  const aggregate = await getReviewAggregate(product.id).catch(() => null)
  if (aggregate?.aiSummary) {
    const cached = aggregate.aiSummary as { generatedAt?: string }
    const age = cached.generatedAt ? Date.now() - new Date(cached.generatedAt).getTime() : Infinity
    if (age < 24 * 60 * 60 * 1000) {
      return NextResponse.json({ summary: aggregate.aiSummary, cached: true })
    }
  }

  // Compute inputs
  const allOffers = product.listings.flatMap(l =>
    l.offers.map(o => ({ price: o.currentPrice, originalPrice: o.originalPrice }))
  ).sort((a, b) => a.price - b.price)

  const bestPrice = allOffers[0]?.price || 0
  const originalPrice = allOffers[0]?.originalPrice ?? undefined
  const discount = originalPrice && originalPrice > bestPrice
    ? Math.round(((originalPrice - bestPrice) / originalPrice) * 100)
    : null

  // Price stats + buy signal
  let buySignal = null
  const bestOffer = product.listings[0]?.offers?.[0]
  if (bestOffer) {
    const snapshots = await prisma.priceSnapshot.findMany({
      where: { offerId: bestOffer.id },
      orderBy: { capturedAt: "asc" },
      take: 90,
    }).catch(() => [])

    if (snapshots.length >= 3) {
      const stats = computePriceStats(snapshots, bestPrice)
      buySignal = generateBuySignal(bestPrice, stats, { discount })
    }
  }

  const result = await generateProductSummary({
    productName: product.name,
    currentPrice: bestPrice,
    originalPrice: originalPrice ?? undefined,
    discount,
    buySignalLevel: buySignal?.level,
    buySignalDetail: buySignal?.detail,
    avgPrice30d: undefined, // already in buySignal
    reviewRating: aggregate?.rating,
    reviewConfidence: aggregate?.confidence,
    totalReviews: aggregate?.totalReviews,
    themes: Array.isArray(aggregate?.themes) ? aggregate.themes as any : undefined,
    categoryName: product.category?.name,
  })

  if (!result) {
    return NextResponse.json({ error: "AI unavailable" }, { status: 503 })
  }

  // Cache in ReviewAggregate
  if (aggregate) {
    await prisma.reviewAggregate.update({
      where: { productId: product.id },
      data: { aiSummary: result as any },
    }).catch(() => {})
  }

  return NextResponse.json({ summary: result, cached: false })
}
