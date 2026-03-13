import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { buildProductCard, PRODUCT_INCLUDE } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get products with active offers, then filter for discounts client-side
    const products = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        listings: {
          some: {
            offers: {
              some: {
                isActive: true,
              },
            },
          },
        },
      },
      include: PRODUCT_INCLUDE,
      take: 40,
      orderBy: { updatedAt: "desc" },
    });

    const cards = products
      .map(buildProductCard)
      .filter((c): c is NonNullable<typeof c> => c !== null)
      .sort((a, b) => {
        // Sort by discount descending, then by offer score
        const discA = a.bestOffer.discount || 0;
        const discB = b.bestOffer.discount || 0;
        if (discB !== discA) return discB - discA;
        return b.bestOffer.offerScore - a.bestOffer.offerScore;
      })
      .slice(0, 4);

    const opportunities = cards.map((card) => {
      const discount = card.bestOffer.discount || 0;
      let reason: "price_drop" | "limited" | "trending" = "price_drop";
      let reasonLabel = `Queda de ${discount}%`;

      if (discount >= 30) {
        reason = "price_drop";
        reasonLabel = `Queda de ${discount}% no preco`;
      } else if (card.popularityScore > 70) {
        reason = "trending";
        reasonLabel = "Em alta na comunidade";
      } else {
        reason = "limited";
        reasonLabel = "Oferta por tempo limitado";
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

    return NextResponse.json({ opportunities });
  } catch (error) {
    console.error("[API/opportunities] Error:", error);
    return NextResponse.json({ opportunities: [] });
  }
}
