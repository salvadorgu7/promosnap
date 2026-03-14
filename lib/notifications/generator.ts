// ============================================
// NOTIFICATION GENERATOR — price drop & hot deal notifications
// for favorited products
// ============================================

import prisma from "@/lib/db/prisma";

export interface NotificationPayload {
  id: string;
  title: string;
  body: string;
  type: "price_drop" | "new_offer" | "hot_deal";
  read: boolean;
  createdAt: string;
  productSlug?: string;
}

/**
 * Generate notifications based on price drops for favorited products.
 * Checks latest vs previous price snapshots for each product's best offer.
 */
export async function generateNotificationsForProducts(
  productIds: string[]
): Promise<NotificationPayload[]> {
  if (productIds.length === 0) return [];

  // Fetch products with their latest offers and recent price snapshots
  const products = await prisma.product.findMany({
    where: { id: { in: productIds.slice(0, 50) }, status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      slug: true,
      listings: {
        where: { status: "ACTIVE" },
        select: {
          offers: {
            where: { isActive: true },
            orderBy: { offerScore: "desc" },
            take: 1,
            select: {
              currentPrice: true,
              originalPrice: true,
              offerScore: true,
              priceSnapshots: {
                orderBy: { capturedAt: "desc" },
                take: 2,
                select: { price: true, capturedAt: true },
              },
            },
          },
        },
      },
    },
  });

  const notifications: NotificationPayload[] = [];

  for (const product of products) {
    const offer = product.listings[0]?.offers[0];
    if (!offer || offer.priceSnapshots.length < 2) continue;

    const [latest, previous] = offer.priceSnapshots;
    const dropPercent =
      ((previous.price - latest.price) / previous.price) * 100;

    if (dropPercent >= 5) {
      notifications.push({
        id: `drop-${product.id}-${Date.now()}`,
        title: `Queda de preco: ${product.name}`,
        body: `Caiu ${dropPercent.toFixed(0)}% — agora por R$ ${latest.price.toFixed(2)}`,
        type: "price_drop",
        read: false,
        createdAt: new Date().toISOString(),
        productSlug: product.slug,
      });
    }

    if (offer.offerScore >= 85) {
      notifications.push({
        id: `hot-${product.id}-${Date.now()}`,
        title: `Oferta quente: ${product.name}`,
        body: `Score ${offer.offerScore} — oportunidade rara`,
        type: "hot_deal",
        read: false,
        createdAt: new Date().toISOString(),
        productSlug: product.slug,
      });
    }
  }

  return notifications;
}
