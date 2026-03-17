// ============================================
// ALERT CHECKER JOB — checks active price alerts and triggers emails
// ============================================

import prisma from "@/lib/db/prisma";
import { sendEmail, isEmailConfigured } from "@/lib/email/send";
import { alertTriggeredEmail, alertEmailSubject } from "@/lib/email/templates";
import { logger } from "@/lib/logger";

/**
 * Checks all active price alerts. When an offer's current price drops
 * below the alert's target price, sends a notification email and marks
 * the alert as triggered.
 */
export async function runAlertCheckJob(): Promise<{
  triggered: number;
  checked: number;
}> {
  if (!isEmailConfigured()) {
    logger.warn("alert-checker.email-not-configured");
    return { triggered: 0, checked: 0 };
  }

  const alerts = await prisma.priceAlert.findMany({
    where: { isActive: true, triggeredAt: null },
    include: {
      listing: {
        include: {
          product: { select: { name: true, slug: true, imageUrl: true } },
          source: { select: { name: true } },
          offers: {
            where: { isActive: true },
            orderBy: { currentPrice: "asc" },
            take: 1,
            select: {
              currentPrice: true,
              originalPrice: true,
              affiliateUrl: true,
            },
          },
        },
      },
    },
  });

  let triggered = 0;

  for (const alert of alerts) {
    const offer = alert.listing.offers[0];
    if (!offer) continue;

    if (offer.currentPrice <= alert.targetPrice) {
      const product = alert.listing.product;
      if (!product) continue;

      const productData = {
        name: product.name,
        price: offer.currentPrice,
        targetPrice: alert.targetPrice,
        originalPrice: offer.originalPrice ?? undefined,
        url: offer.affiliateUrl || "#",
        imageUrl: product.imageUrl || undefined,
        promoSnapUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.promosnap.com.br"}/${product.slug}`,
      };

      const html = alertTriggeredEmail(productData);
      const subject = alertEmailSubject(productData);

      await sendEmail({
        to: alert.email,
        subject,
        html,
        template: "alert-triggered",
      });

      // Mark as triggered
      await prisma.priceAlert.update({
        where: { id: alert.id },
        data: { triggeredAt: new Date(), isActive: false },
      });

      triggered++;
    }
  }

  return { triggered, checked: alerts.length };
}
