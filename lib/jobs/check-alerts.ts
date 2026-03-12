import prisma from '@/lib/db/prisma';
import { runJob, type JobResult } from '@/lib/jobs/runner';

export async function checkAlerts(): Promise<JobResult> {
  return runJob('check-alerts', async (ctx) => {
    ctx.log('Finding active price alerts...');

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
            offers: {
              where: { isActive: true },
              orderBy: { currentPrice: 'asc' },
              take: 1,
              select: { currentPrice: true },
            },
          },
        },
      },
    });

    ctx.log(`Found ${alerts.length} active alerts to check`);

    let checked = 0;
    let triggered = 0;

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
      }

      await ctx.updateProgress(checked, alerts.length);
    }

    ctx.log(`Done: ${checked} alerts checked, ${triggered} triggered`);

    return {
      itemsTotal: alerts.length,
      itemsDone: checked,
      metadata: { checked, triggered },
    };
  });
}
