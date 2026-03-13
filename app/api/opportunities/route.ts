import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { buildProductCard, PRODUCT_INCLUDE } from "@/lib/db/queries";
import { calculateCommercialScore, type CommercialSignals } from "@/lib/ranking/commercial";
import { rateLimit, rateLimitResponse, withRateLimitHeaders } from "@/lib/security/rate-limit";
import type { ProductCard } from "@/types";

export const dynamic = "force-dynamic";

function cardToSignals(card: ProductCard): CommercialSignals {
  return {
    currentPrice: card.bestOffer.price,
    originalPrice: card.bestOffer.originalPrice,
    offerScore: card.bestOffer.offerScore,
    isFreeShipping: card.bestOffer.isFreeShipping,
    hasImage: !!card.imageUrl,
    hasAffiliate: card.bestOffer.affiliateUrl !== '#',
  }
}

// ── New opportunity type definitions ─────────────────────────────────────

interface EnrichedOpportunity {
  type: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  actionable: string;
  data: Record<string, unknown>;
}

async function findHighSearchLowCatalog(): Promise<EnrichedOpportunity[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const results: EnrichedOpportunity[] = [];

  try {
    const topSearches = await prisma.searchLog.groupBy({
      by: ['normalizedQuery'],
      _count: { id: true },
      where: {
        createdAt: { gte: sevenDaysAgo },
        normalizedQuery: { not: null },
      },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    for (const s of topSearches) {
      if (!s.normalizedQuery || s._count.id < 2) continue;
      const matchCount = await prisma.product.count({
        where: {
          status: 'ACTIVE',
          OR: [
            { name: { contains: s.normalizedQuery, mode: 'insensitive' } },
            { listings: { some: { rawTitle: { contains: s.normalizedQuery, mode: 'insensitive' } } } },
          ],
        },
      });

      if (matchCount <= 2) {
        results.push({
          type: 'high_search_low_catalog',
          title: `"${s.normalizedQuery}" buscado ${s._count.id}x com apenas ${matchCount} produto(s)`,
          priority: matchCount === 0 ? 'high' : 'medium',
          actionable: 'Importar produtos para esta busca via ML Discovery ou adicionar manualmente',
          data: {
            query: s.normalizedQuery,
            searchCount: s._count.id,
            catalogMatchCount: matchCount,
          },
        });
      }
    }
  } catch { /* non-critical */ }

  return results.slice(0, 5);
}

async function findImportedWithBigDiscount(): Promise<EnrichedOpportunity[]> {
  const results: EnrichedOpportunity[] = [];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    // Defensive: try with originType, fall back to createdAt
    let products: any[];
    try {
      products = await prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          originType: 'imported',
          importedAt: { gte: sevenDaysAgo },
          listings: { some: { offers: { some: { isActive: true, originalPrice: { not: null } } } } },
        },
        select: {
          id: true, name: true, slug: true, importedAt: true,
          category: { select: { name: true } },
          listings: {
            where: { status: 'ACTIVE' },
            select: {
              offers: {
                where: { isActive: true },
                orderBy: { offerScore: 'desc' },
                take: 1,
                select: { currentPrice: true, originalPrice: true, isFreeShipping: true },
              },
            },
          },
        },
        take: 30,
      });
    } catch {
      // originType may not exist
      products = await prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          createdAt: { gte: sevenDaysAgo },
          listings: { some: { offers: { some: { isActive: true, originalPrice: { not: null } } } } },
        },
        select: {
          id: true, name: true, slug: true, createdAt: true,
          category: { select: { name: true } },
          listings: {
            where: { status: 'ACTIVE' },
            select: {
              offers: {
                where: { isActive: true },
                orderBy: { offerScore: 'desc' },
                take: 1,
                select: { currentPrice: true, originalPrice: true, isFreeShipping: true },
              },
            },
          },
        },
        take: 30,
      });
    }

    for (const p of products) {
      const offer = p.listings?.[0]?.offers?.[0];
      if (!offer?.originalPrice || !offer.currentPrice) continue;
      const discount = ((offer.originalPrice - offer.currentPrice) / offer.originalPrice) * 100;
      if (discount > 30) {
        results.push({
          type: 'imported_with_big_discount',
          title: `${p.name} — ${Math.round(discount)}% de desconto`,
          priority: discount >= 50 ? 'high' : 'medium',
          actionable: 'Destacar na home, criar campanha ou incluir em newsletter',
          data: {
            productId: p.id,
            productName: p.name,
            slug: p.slug,
            category: p.category?.name,
            currentPrice: offer.currentPrice,
            originalPrice: offer.originalPrice,
            discount: Math.round(discount),
            freeShipping: offer.isFreeShipping,
          },
        });
      }
    }
  } catch { /* non-critical */ }

  return results.sort((a, b) => ((b.data.discount as number) || 0) - ((a.data.discount as number) || 0)).slice(0, 5);
}

async function findHotCategoryLowDepth(): Promise<EnrichedOpportunity[]> {
  const results: EnrichedOpportunity[] = [];

  try {
    // Get trending keywords
    const trends = await prisma.trendingKeyword.findMany({
      where: { fetchedAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) } },
      orderBy: { position: 'asc' },
      take: 15,
      select: { keyword: true, position: true },
    });

    // Get categories with product counts
    const categories = await prisma.category.findMany({
      select: { id: true, name: true, slug: true, _count: { select: { products: true } } },
    });

    // Check which categories have trending activity but few products
    for (const cat of categories) {
      const matchingTrends = trends.filter(t =>
        t.keyword.toLowerCase().includes(cat.name.toLowerCase()) ||
        cat.name.toLowerCase().includes(t.keyword.toLowerCase())
      );

      if (matchingTrends.length > 0 && cat._count.products < 5) {
        results.push({
          type: 'hot_category_low_depth',
          title: `Categoria "${cat.name}" em alta mas com apenas ${cat._count.products} produto(s)`,
          priority: cat._count.products === 0 ? 'high' : 'medium',
          actionable: 'Importar mais produtos para esta categoria via ML Discovery',
          data: {
            categoryId: cat.id,
            categoryName: cat.name,
            categorySlug: cat.slug,
            productCount: cat._count.products,
            matchingTrends: matchingTrends.map(t => t.keyword),
          },
        });
      }
    }
  } catch { /* non-critical */ }

  return results.slice(0, 5);
}

async function findPriceBelowRecentAvg(): Promise<EnrichedOpportunity[]> {
  const results: EnrichedOpportunity[] = [];

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Get recent price snapshots to compute averages
    const snapshots = await prisma.priceSnapshot.findMany({
      where: { capturedAt: { gte: sevenDaysAgo } },
      select: {
        offerId: true,
        price: true,
        offer: {
          select: {
            id: true, currentPrice: true, isActive: true,
            listing: {
              select: {
                product: { select: { id: true, name: true, slug: true, category: { select: { name: true } } } },
              },
            },
          },
        },
      },
      orderBy: { capturedAt: 'desc' },
      take: 500,
    });

    // Group by offerId, compute avg
    const offerPrices = new Map<string, { prices: number[]; offer: typeof snapshots[0]['offer'] }>();
    for (const snap of snapshots) {
      if (!snap.offer?.isActive) continue;
      const entry = offerPrices.get(snap.offerId);
      if (entry) {
        entry.prices.push(snap.price);
      } else {
        offerPrices.set(snap.offerId, { prices: [snap.price], offer: snap.offer });
      }
    }

    const seen = new Set<string>();
    for (const [offerId, { prices, offer }] of offerPrices) {
      if (prices.length < 2) continue;
      const product = offer.listing?.product;
      if (!product || seen.has(product.id)) continue;

      const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
      const current = offer.currentPrice;
      const belowPct = ((avg - current) / avg) * 100;

      if (belowPct >= 15) {
        seen.add(product.id);
        results.push({
          type: 'price_below_recent_avg',
          title: `${product.name} — ${Math.round(belowPct)}% abaixo da media recente`,
          priority: belowPct >= 30 ? 'high' : 'medium',
          actionable: 'Oportunidade de destaque — preco historicamente baixo',
          data: {
            productId: product.id,
            productName: product.name,
            slug: product.slug,
            category: product.category?.name,
            currentPrice: current,
            recentAvgPrice: Math.round(avg * 100) / 100,
            belowAvgPercent: Math.round(belowPct),
            dataPoints: prices.length,
          },
        });
      }
    }
  } catch { /* non-critical */ }

  return results.sort((a, b) => ((b.data.belowAvgPercent as number) || 0) - ((a.data.belowAvgPercent as number) || 0)).slice(0, 5);
}

export async function GET(request: NextRequest) {
  // Rate limit: 60 req/min (public)
  const rl = rateLimit(request, "public");
  if (!rl.success) return rateLimitResponse(rl);

  try {
    // ── Original ranked opportunities (legacy format) ────────────────────
    const products = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        listings: { some: { offers: { some: { isActive: true } } } },
      },
      include: PRODUCT_INCLUDE,
      take: 40,
      orderBy: { updatedAt: "desc" },
    });

    const cards = products
      .map(buildProductCard)
      .filter((c): c is NonNullable<typeof c> => c !== null);

    // Rank by homepage preset (balanced, demand-heavy)
    const scored = cards.map(card => ({
      card,
      score: calculateCommercialScore(cardToSignals(card), 'homepage'),
    }));
    scored.sort((a, b) => b.score.total - a.score.total);

    const topCards = scored.slice(0, 4);

    const opportunities = topCards.map(({ card, score }) => {
      const discount = card.bestOffer.discount || 0;
      let reason: "price_drop" | "limited" | "trending" = "price_drop";
      let reasonLabel = `Score ${score.total}/100`;

      if (discount >= 30) {
        reason = "price_drop";
        reasonLabel = `Queda de ${discount}% no preco`;
      } else if (score.breakdown.demand >= 8) {
        reason = "trending";
        reasonLabel = "Em alta na comunidade";
      } else if (score.breakdown.dealQuality >= 10) {
        reason = "limited";
        reasonLabel = "Oferta imperdivel";
      } else {
        reason = "trending";
        reasonLabel = "Destaque inteligente";
      }

      return {
        id: card.id,
        name: card.name,
        slug: card.slug,
        imageUrl: card.imageUrl,
        price: card.bestOffer.price,
        originalPrice: card.bestOffer.originalPrice,
        discount,
        sourceName: card.bestOffer.sourceName,
        reason,
        reasonLabel,
      };
    });

    // ── New enriched opportunity types (run in parallel) ─────────────────
    const [
      highSearchLow,
      importedDiscounts,
      hotCategoryLow,
      priceBelowAvg,
    ] = await Promise.all([
      findHighSearchLowCatalog().catch(() => []),
      findImportedWithBigDiscount().catch(() => []),
      findHotCategoryLowDepth().catch(() => []),
      findPriceBelowRecentAvg().catch(() => []),
    ]);

    const enrichedOpportunities: EnrichedOpportunity[] = [
      ...highSearchLow,
      ...importedDiscounts,
      ...hotCategoryLow,
      ...priceBelowAvg,
    ];

    return withRateLimitHeaders(NextResponse.json({
      opportunities,
      enrichedOpportunities,
    }), rl);
  } catch (error) {
    console.error("[API/opportunities] Error:", error);
    return NextResponse.json({ opportunities: [], enrichedOpportunities: [] });
  }
}
