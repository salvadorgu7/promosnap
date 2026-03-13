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

export async function GET(request: NextRequest) {
  // Rate limit: 60 req/min (public)
  const rl = rateLimit(request, "public");
  if (!rl.success) return rateLimitResponse(rl);

  try {
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

    return withRateLimitHeaders(NextResponse.json({ opportunities }), rl);
  } catch (error) {
    console.error("[API/opportunities] Error:", error);
    return NextResponse.json({ opportunities: [] });
  }
}
