// ============================================
// WEEKLY DIGEST JOB — sends weekly deal summary to subscribers
// Following the pattern of runDailyDealsJob in lib/email/jobs.ts
// ============================================

import prisma from "@/lib/db/prisma";
import { sendEmail, isEmailConfigured } from "@/lib/email/send";
import { weeklyDigestEmail } from "@/lib/email/templates";
import { logger } from "@/lib/logger";

interface SendResult {
  sent: number;
  failed: number;
  skipped: number;
}

/**
 * Sends a weekly digest email to all active subscribers with weekly frequency.
 * Fetches the top deals of the week and sends a summary with stats.
 */
export async function runWeeklyDigestJob(): Promise<SendResult> {
  const result: SendResult = { sent: 0, failed: 0, skipped: 0 };

  if (!isEmailConfigured()) {
    logger.warn("email-jobs.weekly-digest-skipped", { reason: "email not configured" });
    return result;
  }

  try {
    const subscribers = await prisma.subscriber.findMany({
      where: {
        status: "ACTIVE",
        frequency: "weekly",
      },
    });

    if (subscribers.length === 0) return result;

    // Fetch top deals from the past 7 days
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const topOffers = await prisma.offer.findMany({
      where: {
        isActive: true,
        updatedAt: { gte: oneWeekAgo },
        offerScore: { gte: 50 },
      },
      orderBy: { offerScore: "desc" },
      take: 15,
      include: {
        listing: {
          include: {
            product: { select: { name: true, slug: true, imageUrl: true } },
          },
        },
      },
    });

    if (topOffers.length === 0) {
      result.skipped += subscribers.length;
      return result;
    }

    // Build deals array for the template
    const deals = topOffers
      .filter((offer) => offer.listing.product !== null)
      .map((offer) => {
        const product = offer.listing.product!;
        const discount =
          offer.originalPrice && offer.originalPrice > offer.currentPrice
            ? Math.round(
                ((offer.originalPrice - offer.currentPrice) /
                  offer.originalPrice) *
                  100
              )
            : 0;

        return {
          name: product.name,
          price: offer.currentPrice,
          imageUrl: product.imageUrl || undefined,
          url: offer.affiliateUrl || `${process.env.NEXT_PUBLIC_APP_URL || "https://www.promosnap.com.br"}/${product.slug}`,
          discount,
        };
      });

    // Calculate summary stats
    const discounts = deals.map((d) => d.discount).filter((d) => d > 0);
    const avgDiscount =
      discounts.length > 0
        ? Math.round(discounts.reduce((a, b) => a + b, 0) / discounts.length)
        : 0;

    const summary = {
      totalDeals: deals.length,
      avgDiscount,
    };

    const html = weeklyDigestEmail(deals, summary);

    const weekLabel = new Date().toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
    });

    // Send to each subscriber
    const sentEmails = new Set<string>();

    for (const sub of subscribers) {
      if (sentEmails.has(sub.email)) continue;
      sentEmails.add(sub.email);

      // Subject dinâmico com contagem real
      const discounts = deals.map((d) => d.discount).filter((d) => d && d > 0);
      const maxDiscount = discounts.length > 0 ? Math.max(...discounts) : 0;
      const subjectLine = maxDiscount > 0
        ? `📊 ${deals.length} ofertas com até ${maxDiscount}% OFF — Resumo de ${weekLabel}`
        : `📊 ${deals.length} ofertas selecionadas — Resumo de ${weekLabel}`;

      const ok = await sendEmail({
        to: sub.email,
        subject: subjectLine,
        html,
        template: "weekly-digest",
      });

      if (ok) result.sent++;
      else result.failed++;
    }
  } catch (error) {
    logger.error("email-jobs.weekly-digest-error", { error });
  }

  return result;
}
