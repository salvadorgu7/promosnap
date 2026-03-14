import prisma from '@/lib/db/prisma';
import { runJob, type JobResult } from '@/lib/jobs/runner';

const BATCH_SIZE = 100;

function computeOfferScore(offer: {
  currentPrice: number;
  originalPrice: number | null;
  isFreeShipping: boolean;
  couponText: string | null;
  lastSeenAt: Date;
  listing: {
    rating: number | null;
    reviewsCount: number | null;
    matchConfidence: number | null;
  };
}): number {
  // Discount weight (35%)
  const originalPrice = offer.originalPrice ?? offer.currentPrice;
  const discountPct = originalPrice > 0
    ? ((originalPrice - offer.currentPrice) / originalPrice) * 100
    : 0;
  const discountScore = Math.min(discountPct, 100);

  // Popularity weight (25%)
  const ratingScore = ((offer.listing.rating ?? 0) / 5) * 100;
  const reviewsScore = offer.listing.reviewsCount
    ? Math.min((Math.log10(offer.listing.reviewsCount + 1) / Math.log10(10000)) * 100, 100)
    : 0;
  const popularityScore = ratingScore * 0.6 + reviewsScore * 0.4;

  // Reliability weight (15%)
  const reliabilityScore = (offer.listing.matchConfidence ?? 0.7) * 100;

  // Freshness weight (15%)
  const hoursSinceLastSeen = (Date.now() - offer.lastSeenAt.getTime()) / (1000 * 60 * 60);
  let freshnessScore: number;
  if (hoursSinceLastSeen <= 0) {
    freshnessScore = 100;
  } else if (hoursSinceLastSeen >= 72) {
    freshnessScore = 0;
  } else if (hoursSinceLastSeen <= 24) {
    // Linear from 100 at 0h to 50 at 24h
    freshnessScore = 100 - (hoursSinceLastSeen / 24) * 50;
  } else {
    // Linear from 50 at 24h to 0 at 72h
    freshnessScore = 50 - ((hoursSinceLastSeen - 24) / 48) * 50;
  }

  // Bonus weight (10%)
  let bonusScore = 0;
  if (offer.isFreeShipping) bonusScore += 50;
  if (offer.couponText) bonusScore += 50;

  const total =
    discountScore * 0.35 +
    popularityScore * 0.25 +
    reliabilityScore * 0.15 +
    freshnessScore * 0.15 +
    bonusScore * 0.10;

  return Math.round(total * 100) / 100;
}

export async function computeScores(): Promise<JobResult> {
  return runJob('compute-scores', async (ctx) => {
    ctx.log('Fetching active offers with listings...');

    const offers = await prisma.offer.findMany({
      where: { isActive: true },
      include: {
        listing: {
          select: {
            rating: true,
            reviewsCount: true,
            matchConfidence: true,
            productId: true,
            product: {
              select: { originType: true },
            },
          },
        },
      },
    });

    // Fetch clickout counts per offer for the last 7 days (real engagement signal)
    let clickoutsByOffer = new Map<string, number>();
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const clickouts = await prisma.clickout.groupBy({
        by: ['offerId'],
        _count: { id: true },
        where: { clickedAt: { gte: sevenDaysAgo } },
      });
      clickoutsByOffer = new Map(clickouts.map(c => [c.offerId, c._count.id]));
    } catch {
      // non-critical — clickout data is supplementary
    }

    ctx.log(`Found ${offers.length} active offers to score`);

    let scored = 0;
    const productBestScores: Map<string, number> = new Map();

    for (let i = 0; i < offers.length; i += BATCH_SIZE) {
      const batch = offers.slice(i, i + BATCH_SIZE);

      for (const offer of batch) {
        let score = computeOfferScore(offer);

        // Boost clickout engagement signal: up to +5 points for popular offers
        const clicks = clickoutsByOffer.get(offer.id) || 0;
        if (clicks > 0) {
          const clickBoost = Math.min(clicks / 10, 1) * 5;
          score = Math.round((score + clickBoost) * 100) / 100;
        }

        await prisma.offer.update({
          where: { id: offer.id },
          data: { offerScore: score },
        });

        // Track best score per product
        const productId = offer.listing.productId;
        if (productId) {
          const current = productBestScores.get(productId) ?? 0;
          if (score > current) {
            productBestScores.set(productId, score);
          }
        }

        scored++;
      }

      await ctx.updateProgress(scored, offers.length);
    }

    // Update product popularity scores
    ctx.log(`Updating popularity scores for ${productBestScores.size} products...`);
    let productsUpdated = 0;

    // Build a set of imported product IDs for boost
    const importedProductIds = new Set<string>();
    for (const offer of offers) {
      if (offer.listing.product?.originType === 'imported' && offer.listing.productId) {
        importedProductIds.add(offer.listing.productId);
      }
    }

    const productEntries = Array.from(productBestScores.entries());
    for (let i = 0; i < productEntries.length; i += BATCH_SIZE) {
      const batch = productEntries.slice(i, i + BATCH_SIZE);

      for (const [productId, bestScore] of batch) {
        // 1.15x boost for imported (real) products on popularity score
        const boostedScore = importedProductIds.has(productId)
          ? Math.round(bestScore * 1.15 * 100) / 100
          : bestScore;

        await prisma.product.update({
          where: { id: productId },
          data: { popularityScore: boostedScore },
        });
        productsUpdated++;
      }
    }

    ctx.log(`Done: ${scored} offers scored, ${productsUpdated} products updated`);

    return {
      itemsTotal: offers.length,
      itemsDone: scored,
      metadata: { productsUpdated, productBestScores: productBestScores.size },
    };
  });
}
