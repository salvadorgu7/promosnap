import prisma from '@/lib/db/prisma';
import { runJob, type JobResult } from '@/lib/jobs/runner';
import { logger } from '@/lib/logger';
import { buildAffiliateUrl } from '@/lib/affiliate';

const log = logger.child({ module: 'cleanup' });

const SNAPSHOT_RETENTION_DAYS = 180;
const SEARCH_LOG_RETENTION_DAYS = 30;
const OFFER_STALE_DAYS = 7;
/** Imported products are refreshed via CSV — deactivate after 30 days without a price update */
const OFFER_STALE_IMPORTED_DAYS = 30;
const TRENDING_KEYWORD_RETENTION_DAYS = 30;

/**
 * Retroactive price-sanity cleanup.
 *
 * Deactivates offers whose stored prices are clearly wrong (parse errors,
 * Amazon 3rd-party sellers, WhatsApp message misparse, etc.).
 *
 * Criteria (either rule triggers deactivation):
 *   1. currentPrice < R$5  AND  originalPrice > R$50
 *      → 90%+ implied discount — virtually always a parse error
 *        (e.g. frete R$6.98 confused for product price)
 *   2. currentPrice > 0  AND  originalPrice > currentPrice * 10.87
 *      → implied discount > 90.8% — suspiciously high for any real deal
 *        (e.g. Samsung at R$278 when true price is R$2500+)
 *
 * Safe: only looks at active offers with BOTH prices set.
 */
async function deactivateBadPriceOffers(): Promise<number> {
  // Rule 1: absolute floor — price under R$5 with a high original price
  const rule1 = await prisma.offer.updateMany({
    where: {
      isActive: true,
      currentPrice: { gt: 0, lt: 5 },
      originalPrice: { gt: 50 },
    },
    data: { isActive: false },
  });

  // Rule 2: >90% implied discount (load in batches, filter in JS since
  // Prisma can't express column-to-column comparisons in updateMany).
  // Pre-filter: currentPrice < 50 with originalPrice > 200 to limit rows loaded.
  const candidates = await prisma.offer.findMany({
    where: {
      isActive: true,
      currentPrice: { gt: 0, lt: 50 },
      originalPrice: { gt: 200 },
    },
    select: { id: true, currentPrice: true, originalPrice: true },
  });

  const rule2Ids = candidates
    .filter(o => o.originalPrice !== null && o.originalPrice > o.currentPrice * 10.87) // > 90.8% off
    .map(o => o.id);

  let rule2Count = 0;
  if (rule2Ids.length > 0) {
    const result = await prisma.offer.updateMany({
      where: { id: { in: rule2Ids } },
      data: { isActive: false },
    });
    rule2Count = result.count;
  }

  // Rule 3: High-value product keywords priced below minimum plausible price.
  // Catches cases where BOTH prices are wrong (Amazon 3rd-party sellers, parse errors).
  // e.g. iPhone 17 at R$138 with "original" R$496 — ratio looks ok but price is absurd.
  const HIGH_VALUE_PATTERNS = [
    /iphone/i,
    /macbook/i,
    /\bipad\b/i,
    /galaxy\s+[sz]\d/i,
    /\bps5\b/i,
    /playstation\s*5/i,
    /xbox\s+series/i,
    /airpods\s+pro/i,
  ];
  const HIGH_VALUE_MIN_PRICE = 500; // R$ — below this for these products = certainly wrong

  const highValueCandidates = await prisma.offer.findMany({
    where: {
      isActive: true,
      currentPrice: { gt: 0, lt: HIGH_VALUE_MIN_PRICE },
    },
    select: {
      id: true,
      currentPrice: true,
      listing: { select: { rawTitle: true } },
    },
  });

  const rule3Ids = highValueCandidates
    .filter(o => HIGH_VALUE_PATTERNS.some(p => p.test(o.listing?.rawTitle || '')))
    .map(o => o.id);

  let rule3Count = 0;
  if (rule3Ids.length > 0) {
    const result = await prisma.offer.updateMany({
      where: { id: { in: rule3Ids } },
      data: { isActive: false },
    });
    rule3Count = result.count;
  }

  // Rule 4: Installment-as-price pattern — currentPrice < R$200 with discount > 75%
  // This catches WhatsApp parse errors where "12x de R$ 10,31" was grabbed as the price.
  // Pre-filter: currentPrice between R$5-200, originalPrice > R$400, discount implied > 75%
  const rule4Candidates = await prisma.offer.findMany({
    where: {
      isActive: true,
      currentPrice: { gte: 5, lt: 200 },
      originalPrice: { gt: 400 },
    },
    select: { id: true, currentPrice: true, originalPrice: true },
  });

  const rule4Ids = rule4Candidates
    .filter(o => {
      if (!o.originalPrice) return false;
      const discount = (o.originalPrice - o.currentPrice) / o.originalPrice;
      return discount > 0.75; // > 75% off with price < R$200 = almost certainly parse error
    })
    .map(o => o.id);

  let rule4Count = 0;
  if (rule4Ids.length > 0) {
    const result = await prisma.offer.updateMany({
      where: { id: { in: rule4Ids } },
      data: { isActive: false },
    });
    rule4Count = result.count;
  }

  const total = rule1.count + rule2Count + rule3Count + rule4Count;
  if (total > 0) {
    log.warn('cleanup.bad-prices-deactivated', {
      rule1: rule1.count,
      rule2: rule2Count,
      rule3: rule3Count,
      rule4: rule4Count,
      total,
    });
  }

  return total;
}

export async function cleanupData(): Promise<JobResult> {
  return runJob('cleanup', async (ctx) => {
    const now = new Date();
    const snapshotCutoff = new Date(now.getTime() - SNAPSHOT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const searchLogCutoff = new Date(now.getTime() - SEARCH_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const offerStaleCutoff = new Date(now.getTime() - OFFER_STALE_DAYS * 24 * 60 * 60 * 1000);
    const offerStaleImportedCutoff = new Date(now.getTime() - OFFER_STALE_IMPORTED_DAYS * 24 * 60 * 60 * 1000);

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

    // Deactivate stale offers from non-imported products (7-day window — these come from ML discovery)
    ctx.log(`Deactivating non-imported offers not seen in ${OFFER_STALE_DAYS}+ days...`);
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
    ctx.log(`Deactivated ${deactivatedOffers.count} stale non-imported offers`);

    // Deactivate stale offers from imported products (30-day window — Shopee/Amazon CSV imports)
    // These won't be re-imported automatically if prices change — after 30 days without re-import
    // the price data is likely stale and should be hidden from users.
    ctx.log(`Deactivating imported offers not seen in ${OFFER_STALE_IMPORTED_DAYS}+ days...`);
    const deactivatedImportedOffers = await prisma.offer.updateMany({
      where: {
        isActive: true,
        lastSeenAt: { lt: offerStaleImportedCutoff },
        listing: {
          product: {
            originType: 'imported',
          },
        },
      },
      data: { isActive: false },
    });
    ctx.log(`Deactivated ${deactivatedImportedOffers.count} stale imported offers (>30 days old)`);

    // Deactivate offers with impossible/parse-error prices (retroactive + ongoing hygiene)
    ctx.log('Deactivating offers with bad prices (< R$5 or > 90% implied discount)...');
    const deactivatedBadPrices = await deactivateBadPriceOffers();
    ctx.log(`Deactivated ${deactivatedBadPrices} bad-price offers`);

    // ── Deactivate zombie products ─────────────────────────────────────────
    // Rule A: Products without ANY active offers → INACTIVE (empty pages)
    // Rule B: Products without image → INACTIVE (unpresentable on site)
    // These products can be reactivated when they get offers/images again.
    ctx.log('Deactivating zombie products...');
    let zombieProducts = 0;
    try {
      // Rule A: No active offers at all
      const noOffers = await prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          listings: {
            none: {
              offers: { some: { isActive: true } },
            },
          },
        },
        select: { id: true },
        take: 1000,
      });
      if (noOffers.length > 0) {
        const result = await prisma.product.updateMany({
          where: { id: { in: noOffers.map(z => z.id) } },
          data: { status: 'INACTIVE' },
        });
        zombieProducts += result.count;
        log.warn('cleanup.no-offer-products-deactivated', { count: result.count });
      }

      // Rule B: No image — can't show on site without looking broken
      const noImage = await prisma.product.updateMany({
        where: {
          status: 'ACTIVE',
          imageUrl: null,
        },
        data: { status: 'INACTIVE' },
      });
      zombieProducts += noImage.count;
      if (noImage.count > 0) {
        log.warn('cleanup.no-image-products-deactivated', { count: noImage.count });
      }

      ctx.log(`Deactivated ${zombieProducts} zombie products (no offers: ${noOffers.length}, no image: ${noImage.count})`);
    } catch (err) {
      ctx.log(`Warning: zombie product cleanup failed: ${err}`);
    }

    // ── Clear expired WhatsApp/Meta CDN image URLs ────────────────────────
    // WhatsApp image URLs (mmg.whatsapp.net, fbcdn.net) expire in ~14 days.
    // Clear them so backfill-images can find a durable replacement.
    ctx.log('Clearing expired WhatsApp/Meta CDN image URLs...');
    let expiredImagesCleared = 0;
    try {
      const waProducts = await prisma.product.updateMany({
        where: {
          imageUrl: { not: null, contains: 'whatsapp.net' },
        },
        data: { imageUrl: null },
      });
      const mmgProducts = await prisma.product.updateMany({
        where: {
          imageUrl: { not: null, contains: 'mmg.' },
        },
        data: { imageUrl: null },
      });
      const fbProducts = await prisma.product.updateMany({
        where: {
          imageUrl: { not: null, contains: 'fbcdn.net' },
        },
        data: { imageUrl: null },
      });
      expiredImagesCleared = waProducts.count + mmgProducts.count + fbProducts.count;
      // Also clear listing imageUrls
      const waListings = await prisma.listing.updateMany({
        where: { imageUrl: { not: null, contains: 'whatsapp.net' } },
        data: { imageUrl: null },
      });
      const mmgListings = await prisma.listing.updateMany({
        where: { imageUrl: { not: null, contains: 'mmg.' } },
        data: { imageUrl: null },
      });
      const fbListings = await prisma.listing.updateMany({
        where: { imageUrl: { not: null, contains: 'fbcdn.net' } },
        data: { imageUrl: null },
      });
      expiredImagesCleared += waListings.count + mmgListings.count + fbListings.count;
      if (expiredImagesCleared > 0) {
        log.warn('cleanup.expired-images-cleared', { count: expiredImagesCleared });
      }
      ctx.log(`Cleared ${expiredImagesCleared} expired WhatsApp/Meta image URLs`);
    } catch (err) {
      ctx.log(`Warning: expired image cleanup failed: ${err}`);
    }

    // ── Fix affiliate URLs with third-party tags ──────────────────────────
    // WhatsApp messages may contain URLs with someone else's affiliate codes.
    // This retroactively rewrites them with our configured env tags.
    ctx.log('Checking affiliate URLs for third-party tags...');
    let affiliateFixed = 0;
    try {
      const offersToCheck = await prisma.offer.findMany({
        where: { isActive: true, affiliateUrl: { not: null } },
        select: {
          id: true,
          affiliateUrl: true,
          listing: { select: { productUrl: true } },
        },
        take: 200, // Process in batches to avoid timeout
      });

      for (const offer of offersToCheck) {
        if (!offer.affiliateUrl || !offer.listing?.productUrl) continue;
        const correctUrl = buildAffiliateUrl(offer.listing.productUrl);
        if (correctUrl !== offer.affiliateUrl) {
          await prisma.offer.update({
            where: { id: offer.id },
            data: { affiliateUrl: correctUrl },
          });
          affiliateFixed++;
        }
      }
      if (affiliateFixed > 0) {
        log.warn('cleanup.affiliate-urls-fixed', { count: affiliateFixed });
      }
      ctx.log(`Fixed ${affiliateFixed} affiliate URLs with wrong tags`);
    } catch (err) {
      ctx.log(`Warning: affiliate URL fix failed: ${err}`);
    }

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

    const totalActions = deletedSnapshots.count + deletedSearchLogs.count + deactivatedOffers.count + deactivatedImportedOffers.count + deactivatedBadPrices + zombieProducts + deletedTrends.count + affiliateFixed + expiredImagesCleared;

    ctx.log(`Cleanup complete: ${totalActions} total actions`);

    return {
      itemsTotal: totalActions,
      itemsDone: totalActions,
      metadata: {
        deletedSnapshots: deletedSnapshots.count,
        deletedSearchLogs: deletedSearchLogs.count,
        deactivatedOffers: deactivatedOffers.count,
        deactivatedImportedOffers: deactivatedImportedOffers.count,
        deactivatedBadPrices,
        zombieProductsDeactivated: zombieProducts,
        affiliateUrlsFixed: affiliateFixed,
        expiredImagesCleared,
        deletedTrendingKeywords: deletedTrends.count,
      },
    };
  });
}
