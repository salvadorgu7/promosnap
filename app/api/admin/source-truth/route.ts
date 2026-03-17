import { NextRequest, NextResponse } from 'next/server';
import { validateAdmin } from '@/lib/auth/admin';
import { rateLimit, rateLimitResponse } from '@/lib/security/rate-limit';
import prisma from '@/lib/db/prisma';
import { adapterRegistry } from '@/lib/adapters/registry';
import { getSourceProfile } from '@/lib/config/source-profiles';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/source-truth — Single source of truth per marketplace.
 *
 * Returns a unified view of each source with:
 * - Configuration status
 * - Real capability (search, lookup, import, affiliate, price refresh)
 * - Live DB metrics (products, offers, snapshots, clickouts, revenue)
 * - Last sync/cron status
 */
export async function GET(req: NextRequest) {
  const auth = validateAdmin(req);
  if (auth) return auth;
  const rl = rateLimit(req, 'admin');
  if (!rl.success) return rateLimitResponse(rl);

  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 86400000);
  const d30 = new Date(now.getTime() - 30 * 86400000);

  // Get all adapter statuses
  const adapters = adapterRegistry.getAll();

  // Fetch all source slugs from DB
  const sourceSlugs = await prisma.source.findMany({
    select: { slug: true, name: true, status: true },
  });
  const sourceMap = new Map(sourceSlugs.map((s) => [s.slug, s]));

  // Aggregate metrics per source in parallel
  const [
    productsBySource,
    offersBySource,
    snapshotsBySource,
    clickouts7d,
    clickouts30d,
    lastJobRuns,
  ] = await Promise.all([
    // Active products per source
    prisma.$queryRaw<Array<{ source: string; cnt: bigint }>>`
      SELECT s."slug" AS source, COUNT(DISTINCT l."productId") AS cnt
      FROM "listings" l
      JOIN "sources" s ON l."sourceId" = s."id"
      WHERE l."status" = 'ACTIVE'
      GROUP BY s."slug"
    `.catch(() => [] as Array<{ source: string; cnt: bigint }>),

    // Active offers per source
    prisma.$queryRaw<Array<{ source: string; cnt: bigint }>>`
      SELECT s."slug" AS source, COUNT(*) AS cnt
      FROM "offers" o
      JOIN "listings" l ON o."listingId" = l."id"
      JOIN "sources" s ON l."sourceId" = s."id"
      WHERE o."isActive" = true
      GROUP BY s."slug"
    `.catch(() => [] as Array<{ source: string; cnt: bigint }>),

    // Snapshots (last 30d) per source
    prisma.$queryRaw<Array<{ source: string; cnt: bigint }>>`
      SELECT s."slug" AS source, COUNT(*) AS cnt
      FROM "price_snapshots" ps
      JOIN "offers" o ON ps."offerId" = o."id"
      JOIN "listings" l ON o."listingId" = l."id"
      JOIN "sources" s ON l."sourceId" = s."id"
      WHERE ps."capturedAt" >= ${d30}
      GROUP BY s."slug"
    `.catch(() => [] as Array<{ source: string; cnt: bigint }>),

    // Clickouts 7d per source
    prisma.$queryRaw<Array<{ source: string; cnt: bigint }>>`
      SELECT "sourceSlug" AS source, COUNT(*) AS cnt
      FROM "clickouts"
      WHERE "clickedAt" >= ${d7}
      GROUP BY "sourceSlug"
    `.catch(() => [] as Array<{ source: string; cnt: bigint }>),

    // Clickouts 30d per source
    prisma.$queryRaw<Array<{ source: string; cnt: bigint }>>`
      SELECT "sourceSlug" AS source, COUNT(*) AS cnt
      FROM "clickouts"
      WHERE "clickedAt" >= ${d30}
      GROUP BY "sourceSlug"
    `.catch(() => [] as Array<{ source: string; cnt: bigint }>),

    // Last job run per source-related job
    prisma.jobRun.findMany({
      where: {
        jobName: { in: ['discover-import', 'update-prices', 'compute-scores', 'ingest'] },
        status: 'SUCCESS',
      },
      orderBy: { startedAt: 'desc' },
      take: 20,
      select: { jobName: true, startedAt: true, durationMs: true },
    }).catch(() => []),
  ]);

  // Build lookup maps
  const toMap = (rows: Array<{ source: string; cnt: bigint }>) =>
    new Map(rows.map((r) => [r.source, Number(r.cnt)]));

  const productsMap = toMap(productsBySource);
  const offersMap = toMap(offersBySource);
  const snapshotsMap = toMap(snapshotsBySource);
  const clicks7dMap = toMap(clickouts7d);
  const clicks30dMap = toMap(clickouts30d);

  // Last job run per job name
  const lastJobs = new Map<string, { startedAt: Date; durationMs: number | null }>();
  for (const jr of lastJobRuns) {
    if (!lastJobs.has(jr.jobName)) {
      lastJobs.set(jr.jobName, { startedAt: jr.startedAt, durationMs: jr.durationMs });
    }
  }

  // Build source truth for each adapter
  const sources = adapters.map((adapter) => {
    const slug = adapter.slug;
    const status = adapter.getStatus();
    const dbSource = sourceMap.get(slug);
    const profile = getSourceProfile(slug);
    const capTruth = adapter.getCapabilityTruth?.();

    const products = productsMap.get(slug) ?? 0;
    const offers = offersMap.get(slug) ?? 0;
    const snapshots = snapshotsMap.get(slug) ?? 0;
    const cl7d = clicks7dMap.get(slug) ?? 0;
    const cl30d = clicks30dMap.get(slug) ?? 0;

    // Revenue estimation
    const rev7d = Math.round(cl7d * profile.conversionRate * profile.avgTicket * profile.commissionRate * 100) / 100;
    const rev30d = Math.round(cl30d * profile.conversionRate * profile.avgTicket * profile.commissionRate * 100) / 100;

    // Determine real capabilities
    const hasSearch = typeof adapter.search === 'function';
    const hasLookup = typeof adapter.getProduct === 'function';
    const hasSyncFeed = typeof adapter.syncFeed === 'function';
    const hasRefresh = typeof adapter.refreshOffer === 'function';

    return {
      slug,
      name: status.name,
      configured: status.configured,
      enabled: status.enabled,
      health: status.health,
      capabilityTruth: capTruth?.status ?? 'unknown',
      dbExists: !!dbSource,
      dbStatus: dbSource?.status ?? null,

      // Real capabilities (not just declared — checks isConfigured + method exists)
      capabilities: {
        searchReal: hasSearch && status.configured,
        lookupReal: hasLookup && status.configured,
        importReal: hasSyncFeed && status.configured,
        affiliateReal: status.configured, // Affiliate links work if configured
        priceRefreshReal: hasRefresh && status.configured,
        cronActive: !!lastJobs.get('update-prices'), // Cron has run at least once
      },

      // Live DB metrics
      metrics: {
        productsActive: products,
        offersActive: offers,
        snapshots30d: snapshots,
        clickouts7d: cl7d,
        clickouts30d: cl30d,
        revenueEstimated7d: rev7d,
        revenueEstimated30d: rev30d,
      },

      // Last sync info
      lastSync: {
        discoverImport: lastJobs.get('discover-import')?.startedAt?.toISOString() ?? null,
        updatePrices: lastJobs.get('update-prices')?.startedAt?.toISOString() ?? null,
      },

      // Profile
      profile: {
        avgTicket: profile.avgTicket,
        commissionRate: profile.commissionRate,
        conversionRate: profile.conversionRate,
      },

      // Missing env vars
      missingEnvVars: status.missingEnvVars,
    };
  });

  // Overall summary
  const totalProducts = sources.reduce((s, x) => s + x.metrics.productsActive, 0);
  const totalOffers = sources.reduce((s, x) => s + x.metrics.offersActive, 0);
  const totalClickouts30d = sources.reduce((s, x) => s + x.metrics.clickouts30d, 0);
  const totalRevenue30d = sources.reduce((s, x) => s + x.metrics.revenueEstimated30d, 0);
  const configuredCount = sources.filter((s) => s.configured).length;

  return NextResponse.json({
    timestamp: now.toISOString(),
    summary: {
      totalSources: sources.length,
      configured: configuredCount,
      totalProducts,
      totalOffers,
      totalClickouts30d,
      totalRevenueEstimated30d: Math.round(totalRevenue30d * 100) / 100,
    },
    sources,
  });
}
