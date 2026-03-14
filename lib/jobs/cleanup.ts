import prisma from '@/lib/db/prisma';
import { runJob, type JobResult } from '@/lib/jobs/runner';

const SNAPSHOT_RETENTION_DAYS = 180;
const SEARCH_LOG_RETENTION_DAYS = 30;
const OFFER_STALE_DAYS = 7;
const TRENDING_KEYWORD_RETENTION_DAYS = 30;

export async function cleanupData(): Promise<JobResult> {
  return runJob('cleanup', async (ctx) => {
    const now = new Date();
    const snapshotCutoff = new Date(now.getTime() - SNAPSHOT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const searchLogCutoff = new Date(now.getTime() - SEARCH_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const offerStaleCutoff = new Date(now.getTime() - OFFER_STALE_DAYS * 24 * 60 * 60 * 1000);

    // Delete old price snapshots
    ctx.log(`Deleting price snapshots older than ${SNAPSHOT_RETENTION_DAYS} days...`);
    const deletedSnapshots = await prisma.priceSnapshot.deleteMany({
      where: { capturedAt: { lt: snapshotCutoff } },
    });
    ctx.log(`Deleted ${deletedSnapshots.count} price snapshots`);

    // Delete old search logs
    ctx.log(`Deleting search logs older than ${SEARCH_LOG_RETENTION_DAYS} days...`);
    const deletedSearchLogs = await prisma.searchLog.deleteMany({
      where: { createdAt: { lt: searchLogCutoff } },
    });
    ctx.log(`Deleted ${deletedSearchLogs.count} search logs`);

    // Deactivate stale offers — NEVER deactivate offers from imported products
    ctx.log(`Deactivating offers not seen in ${OFFER_STALE_DAYS}+ days (excluding imported products)...`);
    const deactivatedOffers = await prisma.offer.updateMany({
      where: {
        isActive: true,
        lastSeenAt: { lt: offerStaleCutoff },
        listing: {
          product: {
            originType: { not: 'imported' },
          },
        },
      },
      data: { isActive: false },
    });
    ctx.log(`Deactivated ${deactivatedOffers.count} stale offers (imported products preserved)`);

    // Clean stale trending keywords (older than 30 days)
    let deletedTrends = { count: 0 };
    try {
      const trendingCutoff = new Date(now.getTime() - TRENDING_KEYWORD_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      ctx.log(`Deleting trending keywords older than ${TRENDING_KEYWORD_RETENTION_DAYS} days...`);
      deletedTrends = await prisma.trendingKeyword.deleteMany({
        where: { fetchedAt: { lt: trendingCutoff } },
      });
      ctx.log(`Cleaned ${deletedTrends.count} stale trending keywords`);
    } catch (error) {
      ctx.log(`Warning: failed to clean trending keywords: ${error}`);
    }

    const totalActions = deletedSnapshots.count + deletedSearchLogs.count + deactivatedOffers.count + deletedTrends.count;

    ctx.log(`Cleanup complete: ${totalActions} total actions`);

    return {
      itemsTotal: totalActions,
      itemsDone: totalActions,
      metadata: {
        deletedSnapshots: deletedSnapshots.count,
        deletedSearchLogs: deletedSearchLogs.count,
        deactivatedOffers: deactivatedOffers.count,
        deletedTrendingKeywords: deletedTrends.count,
      },
    };
  });
}
