import prisma from '@/lib/db/prisma';
import { runJob, type JobResult } from '@/lib/jobs/runner';

const BATCH_SIZE = 50;
const STALE_HOURS = 6;
const DEACTIVATE_DAYS = 3;

export async function updatePrices(): Promise<JobResult> {
  return runJob('update-prices', async (ctx) => {
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - STALE_HOURS * 60 * 60 * 1000);
    const deactivateThreshold = new Date(now.getTime() - DEACTIVATE_DAYS * 24 * 60 * 60 * 1000);

    ctx.log('Finding stale active offers...');

    // Prioritize imported products: fetch their stale offers first, then seed
    const staleOffers = await prisma.offer.findMany({
      where: {
        isActive: true,
        lastSeenAt: { lt: staleThreshold },
      },
      select: {
        id: true,
        currentPrice: true,
        originalPrice: true,
        lastSeenAt: true,
        listingId: true,
        listing: {
          select: {
            product: {
              select: { originType: true },
            },
          },
        },
      },
    });

    // Sort: imported products first, then by lastSeenAt (oldest first)
    staleOffers.sort((a, b) => {
      const aImported = a.listing?.product?.originType === 'imported' ? 0 : 1;
      const bImported = b.listing?.product?.originType === 'imported' ? 0 : 1;
      if (aImported !== bImported) return aImported - bImported;
      return a.lastSeenAt.getTime() - b.lastSeenAt.getTime();
    });

    ctx.log(`Found ${staleOffers.length} stale offers`);

    let deactivated = 0;
    let needsUpdate = 0;
    let snapshotsCreated = 0;
    let processed = 0;

    for (let i = 0; i < staleOffers.length; i += BATCH_SIZE) {
      const batch = staleOffers.slice(i, i + BATCH_SIZE);
      const toDeactivate: string[] = [];

      for (const offer of batch) {
        if (offer.lastSeenAt < deactivateThreshold) {
          toDeactivate.push(offer.id);
        } else {
          needsUpdate++;
        }
        processed++;
      }

      // Batch deactivate in a single query
      if (toDeactivate.length > 0) {
        try {
          const result = await prisma.offer.updateMany({
            where: { id: { in: toDeactivate } },
            data: { isActive: false },
          });
          deactivated += result.count;
          ctx.log(`Batch deactivated ${result.count} offers`);
        } catch {
          // Some offers may have been deleted — skip gracefully
        }
      }

      await ctx.updateProgress(processed, staleOffers.length);
    }

    // Create price snapshots ONLY when price changed since last snapshot
    ctx.log('Creating price snapshots for active offers with price changes...');

    const activeOffers = await prisma.offer.findMany({
      where: { isActive: true },
      select: {
        id: true,
        currentPrice: true,
        originalPrice: true,
      },
    });

    let skipped = 0;

    for (let i = 0; i < activeOffers.length; i += BATCH_SIZE) {
      const batch = activeOffers.slice(i, i + BATCH_SIZE);

      // Fetch last snapshot for each offer in batch
      const lastSnapshots = await prisma.priceSnapshot.findMany({
        where: { offerId: { in: batch.map((o) => o.id) } },
        orderBy: { capturedAt: 'desc' },
        distinct: ['offerId'],
        select: { offerId: true, price: true, originalPrice: true },
      });

      const lastByOffer = new Map(lastSnapshots.map((s) => [s.offerId, s]));

      // Only create snapshots where price actually changed
      const changed = batch.filter((offer) => {
        const last = lastByOffer.get(offer.id);
        if (!last) return true; // No snapshot yet — create first one
        return last.price !== offer.currentPrice || last.originalPrice !== offer.originalPrice;
      });

      skipped += batch.length - changed.length;

      if (changed.length === 0) continue;

      try {
        await prisma.priceSnapshot.createMany({
          data: changed.map((offer) => ({
            offerId: offer.id,
            price: offer.currentPrice,
            originalPrice: offer.originalPrice,
          })),
        });
        snapshotsCreated += changed.length;
      } catch {
        // Some offers may have been deleted — fall back to individual creates
        for (const offer of changed) {
          try {
            await prisma.priceSnapshot.create({
              data: {
                offerId: offer.id,
                price: offer.currentPrice,
                originalPrice: offer.originalPrice,
              },
            });
            snapshotsCreated++;
          } catch {
            // Offer deleted — skip
          }
        }
      }
    }

    ctx.log(
      `Done: ${deactivated} deactivated, ${needsUpdate} need update, ${snapshotsCreated} snapshots created, ${skipped} unchanged skipped`
    );

    return {
      itemsTotal: staleOffers.length + activeOffers.length,
      itemsDone: processed + snapshotsCreated,
      metadata: { deactivated, needsUpdate, snapshotsCreated, skipped },
    };
  });
}
