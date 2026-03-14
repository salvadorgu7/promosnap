import prisma from '@/lib/db/prisma';
import { runJob, type JobResult } from '@/lib/jobs/runner';
import { sendEmail, isEmailConfigured } from '@/lib/email/send';
import { alertTriggeredEmail } from '@/lib/email/templates';

export async function checkAlerts(): Promise<JobResult> {
  return runJob('check-alerts', async (ctx) => {
    ctx.log('Finding active price alerts...');

    const emailEnabled = isEmailConfigured();
    if (!emailEnabled) {
      ctx.log('Email not configured (RESEND_API_KEY missing) — alerts will be marked but not emailed');
    }

    const alerts = await prisma.priceAlert.findMany({
      where: {
        isActive: true,
        triggeredAt: null,
      },
      include: {
        listing: {
          select: {
            id: true,
            rawTitle: true,
            productUrl: true,
            imageUrl: true,
            product: {
              select: { slug: true, imageUrl: true, originType: true },
            },
            offers: {
              where: { isActive: true },
              orderBy: { currentPrice: 'asc' },
              take: 1,
              select: { currentPrice: true, affiliateUrl: true },
            },
          },
        },
      },
    });

    ctx.log(`Found ${alerts.length} active alerts to check`);

    let checked = 0;
    let triggered = 0;
    let emailed = 0;
    let emailFailed = 0;

    for (const alert of alerts) {
      checked++;

      const bestOffer = alert.listing.offers[0];
      if (!bestOffer) {
        ctx.log(`Alert ${alert.id}: no active offers for listing ${alert.listingId}`);
        continue;
      }

      if (bestOffer.currentPrice <= alert.targetPrice) {
        await prisma.priceAlert.update({
          where: { id: alert.id },
          data: { triggeredAt: new Date() },
        });
        triggered++;
        ctx.log(
          `Alert ${alert.id} TRIGGERED: "${alert.listing.rawTitle}" ` +
          `price ${bestOffer.currentPrice} <= target ${alert.targetPrice}`
        );

        // Send email notification (never let email failure block alert processing)
        if (emailEnabled && alert.email) {
          try {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.promosnap.com.br';
            // CTA links to affiliateUrl (ML permalink) for real products
            const buyUrl = bestOffer.affiliateUrl
              || alert.listing.productUrl
              || (alert.listing.product?.slug
                ? `${appUrl}/produto/${alert.listing.product.slug}`
                : '#');
            // PromoSnap product page link
            const promoSnapUrl = alert.listing.product?.slug
              ? `${appUrl}/produto/${alert.listing.product.slug}`
              : undefined;
            // Product image
            const imageUrl = alert.listing.imageUrl
              || alert.listing.product?.imageUrl
              || undefined;

            const html = alertTriggeredEmail({
              name: alert.listing.rawTitle,
              price: Number(bestOffer.currentPrice),
              targetPrice: Number(alert.targetPrice),
              url: buyUrl,
              imageUrl,
              promoSnapUrl,
            });

            const ok = await sendEmail({
              to: alert.email,
              subject: `Alerta de Preco: ${alert.listing.rawTitle} atingiu R$ ${Number(bestOffer.currentPrice).toFixed(2).replace('.', ',')}`,
              html,
              template: 'alert-triggered',
            });

            if (ok) {
              emailed++;
              ctx.log(`Email sent to ${alert.email} for alert ${alert.id}`);
            } else {
              emailFailed++;
              ctx.warn(`Email failed for alert ${alert.id} to ${alert.email}`);
            }
          } catch (err) {
            emailFailed++;
            ctx.warn(`Email error for alert ${alert.id}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      }

      await ctx.updateProgress(checked, alerts.length);
    }

    ctx.log(`Done: ${checked} checked, ${triggered} triggered, ${emailed} emailed, ${emailFailed} email failures`);

    // Structured summary for monitoring/log aggregation
    if (emailed > 0) {
      ctx.log(`[check-alerts] Summary: ${checked}/${triggered}/${emailed}/${emailFailed}`);
    }

    return {
      itemsTotal: alerts.length,
      itemsDone: checked,
      metadata: { checked, triggered, emailed, emailFailed },
    };
  });
}
