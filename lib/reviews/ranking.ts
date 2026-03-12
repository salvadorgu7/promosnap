import prisma from "@/lib/db/prisma";
import type { CategoryInsight, RankingBadge } from "./types";

/**
 * Get category ranking insights for a product.
 * Returns position in category by rating and earned badges.
 * Based on real data — never fakes rankings.
 */
export async function getCategoryInsights(
  productId: string,
  categoryId: string,
): Promise<CategoryInsight | null> {
  // Get category info
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true },
  });

  if (!category) return null;

  // Get all products in this category with their listing ratings
  const productsInCategory = await prisma.product.findMany({
    where: {
      categoryId,
      status: "ACTIVE",
      listings: {
        some: {
          status: "ACTIVE",
          rating: { not: null },
        },
      },
    },
    select: {
      id: true,
      popularityScore: true,
      listings: {
        where: { status: "ACTIVE", rating: { not: null } },
        select: {
          rating: true,
          reviewsCount: true,
          offers: {
            where: { isActive: true },
            select: { currentPrice: true, originalPrice: true },
            take: 1,
            orderBy: { currentPrice: "asc" },
          },
        },
      },
    },
  });

  if (productsInCategory.length === 0) return null;

  // Calculate average rating per product
  const productRatings = productsInCategory.map((p) => {
    const ratings = p.listings.filter((l) => l.rating !== null);
    const avgRating =
      ratings.length > 0
        ? ratings.reduce((sum, l) => sum + (l.rating ?? 0), 0) / ratings.length
        : 0;
    const totalReviews = ratings.reduce((sum, l) => sum + (l.reviewsCount ?? 0), 0);
    const bestPrice =
      p.listings.flatMap((l) => l.offers).sort((a, b) => a.currentPrice - b.currentPrice)[0]
        ?.currentPrice ?? null;
    const bestOriginalPrice =
      p.listings.flatMap((l) => l.offers).sort((a, b) => a.currentPrice - b.currentPrice)[0]
        ?.originalPrice ?? null;

    return {
      productId: p.id,
      avgRating,
      totalReviews,
      popularityScore: p.popularityScore,
      bestPrice,
      bestOriginalPrice,
    };
  });

  // Sort by rating (descending)
  const sortedByRating = [...productRatings].sort((a, b) => b.avgRating - a.avgRating);
  const positionByRating = sortedByRating.findIndex((p) => p.productId === productId) + 1;

  if (positionByRating === 0) return null; // Product not found in rated list

  const currentProduct = productRatings.find((p) => p.productId === productId);
  if (!currentProduct) return null;

  // Determine badges
  const badges: RankingBadge[] = [];
  const totalRated = sortedByRating.length;

  // "Top avaliado" — top 10% by rating, minimum rating 4.0
  if (positionByRating <= Math.max(1, Math.ceil(totalRated * 0.1)) && currentProduct.avgRating >= 4.0) {
    badges.push({
      type: "top-rated",
      label: "Top avaliado",
      description: `Entre os mais bem avaliados da categoria ${category.name}`,
    });
  }

  // "Melhor custo-beneficio" — good rating + good discount
  if (currentProduct.avgRating >= 3.5 && currentProduct.bestPrice && currentProduct.bestOriginalPrice) {
    const discount =
      ((currentProduct.bestOriginalPrice - currentProduct.bestPrice) / currentProduct.bestOriginalPrice) * 100;
    if (discount >= 15) {
      badges.push({
        type: "best-value",
        label: "Melhor custo-beneficio",
        description: `Boa avaliacao com ${Math.round(discount)}% de desconto`,
      });
    }
  }

  // "Mais popular" — top 20% by popularity + has reviews
  const sortedByPopularity = [...productRatings].sort(
    (a, b) => b.popularityScore - a.popularityScore,
  );
  const popularityPosition =
    sortedByPopularity.findIndex((p) => p.productId === productId) + 1;
  if (
    popularityPosition <= Math.max(1, Math.ceil(totalRated * 0.2)) &&
    currentProduct.totalReviews >= 5
  ) {
    badges.push({
      type: "most-popular",
      label: "Mais popular",
      description: `Entre os mais populares da categoria ${category.name}`,
    });
  }

  return {
    productId,
    categoryId: category.id,
    categoryName: category.name,
    positionByRating,
    totalRatedInCategory: totalRated,
    badges,
  };
}
