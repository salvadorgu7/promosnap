import prisma from '@/lib/db/prisma';
import { runJob, type JobResult } from '@/lib/jobs/runner';
import { adapterRegistry } from '@/lib/adapters/registry';
import { logger } from '@/lib/logger';

const log = logger.child({ module: 'update-prices' });

const BATCH_SIZE = 50;
const STALE_HOURS = 4;          // 4h — more aggressive freshness (cron runs every 2h)
const DEACTIVATE_DAYS = 3;
const REFRESH_BATCH_SIZE = 40;  // 40 items per run — balance between speed and rate limits

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
            externalId: true,
            source: { select: { slug: true } },
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
    let refreshed = 0;
    let refreshFailed = 0;

    // ── Phase 1: Deactivate very stale offers ──────────────────────────────

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

    // ── Phase 2: Multi-source price refresh via adapters ───────────────────
    // Refresh prices for stale but still active offers using marketplace APIs.
    // Key multi-source improvement: calls adapters to get fresh prices from
    // Amazon, Shopee, ML etc. instead of just deactivating stale offers.

    ctx.log('Refreshing prices via marketplace adapters...');

    const toRefresh = staleOffers
      .filter((o) => o.lastSeenAt >= deactivateThreshold)
      .slice(0, REFRESH_BATCH_SIZE);

    // Group by source for per-adapter rate limiting
    const bySource = new Map<string, typeof toRefresh>();
    for (const offer of toRefresh) {
      const slug = offer.listing?.source?.slug || 'unknown';
      if (!bySource.has(slug)) bySource.set(slug, []);
      bySource.get(slug)!.push(offer);
    }

    for (const [sourceSlug, offers] of bySource) {
      const adapter = adapterRegistry.get(sourceSlug);
      if (!adapter || !adapter.isConfigured()) {
        ctx.log(`Skipping ${sourceSlug}: adapter not configured`);
        continue;
      }

      if (!adapter.refreshOffer && !adapter.getProduct) {
        ctx.log(`Skipping ${sourceSlug}: no refresh capability`);
        continue;
      }

      let adapterIdx = 0;
      for (const offer of offers) {
        const externalId = offer.listing?.externalId;
        if (!externalId) continue;

        // Rate limit: 1 req/s for ML, 500ms for others — prevents API throttling
        if (adapterIdx > 0) {
          const delay = sourceSlug === 'mercadolivre' ? 1200 : 600;
          await new Promise(r => setTimeout(r, delay));
        }
        adapterIdx++;

        try {
          const fresh = adapter.refreshOffer
            ? await adapter.refreshOffer(externalId)
            : await adapter.getProduct(externalId);

          if (fresh && fresh.currentPrice > 0) {
            const oldPrice = offer.currentPrice;
            const newPrice = fresh.currentPrice;

            // ── Price sanity guard ──────────────────────────────────────────
            // Amazon PA-API / Creators API sometimes returns 3rd-party seller
            // prices that are wildly different from the known price (e.g. a
            // product at R$899 showing as R$6 because a seller offers it at
            // clearance, or R$6000 because a re-seller inflated it).
            // Rules:
            //   - New price > 3× old price → SKIP (3rd-party markup / API error)
            //   - New price < 5% of old price (95%+ drop) → SKIP (parse error)
            //   - Old price is 0 (first write) → always accept
            // Legitimate price changes are usually within 50% of the last known price.

            if (oldPrice > 0) {
              const ratio = newPrice / oldPrice;
              if (ratio > 3) {
                log.warn('price-refresh.sanity-skip-high', {
                  source: sourceSlug, externalId, oldPrice, newPrice, ratio: ratio.toFixed(2),
                });
                refreshFailed++;
                continue;
              }
              if (ratio < 0.05) {
                log.warn('price-refresh.sanity-skip-low', {
                  source: sourceSlug, externalId, oldPrice, newPrice, ratio: ratio.toFixed(2),
                });
                refreshFailed++;
                continue;
              }
            }

            // Update offer with fresh data
            await prisma.offer.update({
              where: { id: offer.id },
              data: {
                currentPrice: newPrice,
                originalPrice: fresh.originalPrice || offer.originalPrice,
                isFreeShipping: fresh.isFreeShipping ?? undefined,
                lastSeenAt: new Date(),
              },
            });

            // Update listing data if available
            if (fresh.availability && fresh.availability !== 'unknown') {
              await prisma.listing.update({
                where: { id: offer.listingId },
                data: {
                  availability: fresh.availability === 'in_stock' ? 'IN_STOCK' : 'OUT_OF_STOCK',
                  lastSeenAt: new Date(),
                  rating: fresh.rating || undefined,
                  reviewsCount: fresh.reviewsCount || undefined,
                  salesCountEstimate: fresh.salesCount || undefined,
                },
              });
            }

            refreshed++;
            log.info('price-refresh.success', {
              source: sourceSlug,
              externalId,
              oldPrice,
              newPrice,
              changed: oldPrice !== newPrice,
            });
          } else {
            refreshFailed++;
          }
        } catch (err) {
          refreshFailed++;
          log.warn('price-refresh.error', {
            source: sourceSlug,
            externalId,
            error: String(err),
          });
        }

        // Rate limit: 1.1s for Amazon (PA-API limit), 500ms for others
        const delay = sourceSlug === 'amazon-br' ? 1100 : 500;
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    ctx.log(`Adapter refresh: ${refreshed} updated, ${refreshFailed} failed`);

    // ── Phase 3: Create price snapshots for all active offers ──────────────

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
      `Done: ${deactivated} deactivated, ${needsUpdate} stale, ${refreshed} refreshed via adapters, ${snapshotsCreated} snapshots, ${skipped} unchanged`
    );

    return {
      itemsTotal: staleOffers.length + activeOffers.length,
      itemsDone: processed + snapshotsCreated + refreshed,
      metadata: {
        deactivated,
        needsUpdate,
        refreshed,
        refreshFailed,
        snapshotsCreated,
        skipped,
        adapterGroups: bySource.size,
      },
    };
  });
}
