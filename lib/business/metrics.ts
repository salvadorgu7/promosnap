import prisma from "@/lib/db/prisma";
import type { MetricResult, MetricStatus, BusinessMetrics } from "./types";

// ============================================
// Helpers
// ============================================

function computeStatus(
  value: number,
  goodThreshold: number,
  warningThreshold: number,
  higherIsBetter = true
): MetricStatus {
  if (higherIsBetter) {
    if (value >= goodThreshold) return "good";
    if (value >= warningThreshold) return "warning";
    return "critical";
  }
  // Lower is better (e.g. stale ratio)
  if (value <= goodThreshold) return "good";
  if (value <= warningThreshold) return "warning";
  return "critical";
}

function trendPercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function metric(
  value: number,
  label: string,
  trend7d: number,
  trend30d: number,
  status: MetricStatus,
  format?: MetricResult["format"]
): MetricResult {
  return { value, label, trend7d, trend30d, status, format };
}

// ============================================
// Period count helpers (raw SQL for performance)
// ============================================

interface PeriodCounts {
  current7d: number;
  prev7d: number;
  current30d: number;
  prev30d: number;
}

async function clickoutPeriodCounts(): Promise<PeriodCounts> {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        COUNT(*) FILTER (WHERE "clickedAt" > NOW() - INTERVAL '7 days')::int AS current_7d,
        COUNT(*) FILTER (WHERE "clickedAt" > NOW() - INTERVAL '14 days' AND "clickedAt" <= NOW() - INTERVAL '7 days')::int AS prev_7d,
        COUNT(*) FILTER (WHERE "clickedAt" > NOW() - INTERVAL '30 days')::int AS current_30d,
        COUNT(*) FILTER (WHERE "clickedAt" > NOW() - INTERVAL '60 days' AND "clickedAt" <= NOW() - INTERVAL '30 days')::int AS prev_30d
      FROM clickouts
    `;
    const r = rows[0] || {};
    return {
      current7d: r.current_7d ?? 0,
      prev7d: r.prev_7d ?? 0,
      current30d: r.current_30d ?? 0,
      prev30d: r.prev_30d ?? 0,
    };
  } catch {
    return { current7d: 0, prev7d: 0, current30d: 0, prev30d: 0 };
  }
}

async function searchPeriodCounts(): Promise<PeriodCounts> {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '7 days')::int AS current_7d,
        COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '14 days' AND "createdAt" <= NOW() - INTERVAL '7 days')::int AS prev_7d,
        COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '30 days')::int AS current_30d,
        COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '60 days' AND "createdAt" <= NOW() - INTERVAL '30 days')::int AS prev_30d
      FROM search_logs
    `;
    const r = rows[0] || {};
    return {
      current7d: r.current_7d ?? 0,
      prev7d: r.prev_7d ?? 0,
      current30d: r.current_30d ?? 0,
      prev30d: r.prev_30d ?? 0,
    };
  } catch {
    return { current7d: 0, prev7d: 0, current30d: 0, prev30d: 0 };
  }
}

async function subscriberPeriodCounts(): Promise<PeriodCounts> {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '7 days')::int AS current_7d,
        COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '14 days' AND "createdAt" <= NOW() - INTERVAL '7 days')::int AS prev_7d,
        COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '30 days')::int AS current_30d,
        COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '60 days' AND "createdAt" <= NOW() - INTERVAL '30 days')::int AS prev_30d
      FROM subscribers
    `;
    const r = rows[0] || {};
    return {
      current7d: r.current_7d ?? 0,
      prev7d: r.prev_7d ?? 0,
      current30d: r.current_30d ?? 0,
      prev30d: r.prev_30d ?? 0,
    };
  } catch {
    return { current7d: 0, prev7d: 0, current30d: 0, prev30d: 0 };
  }
}

async function priceAlertPeriodCounts(): Promise<PeriodCounts> {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '7 days')::int AS current_7d,
        COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '14 days' AND "createdAt" <= NOW() - INTERVAL '7 days')::int AS prev_7d,
        COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '30 days')::int AS current_30d,
        COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '60 days' AND "createdAt" <= NOW() - INTERVAL '30 days')::int AS prev_30d
      FROM price_alerts
    `;
    const r = rows[0] || {};
    return {
      current7d: r.current_7d ?? 0,
      prev7d: r.prev_7d ?? 0,
      current30d: r.current_30d ?? 0,
      prev30d: r.prev_30d ?? 0,
    };
  } catch {
    return { current7d: 0, prev7d: 0, current30d: 0, prev30d: 0 };
  }
}

// ============================================
// North Star: Qualified Clickouts per Day
// A qualified clickout = user viewed product page + clicked out
// We approximate this as clickouts that have a referrer (came from a product page)
// ============================================

export async function getNorthStarMetric(): Promise<MetricResult> {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        COALESCE(COUNT(*) FILTER (WHERE "clickedAt" > NOW() - INTERVAL '7 days')::float / NULLIF(7, 0), 0) AS current_daily,
        COALESCE(COUNT(*) FILTER (WHERE "clickedAt" > NOW() - INTERVAL '14 days' AND "clickedAt" <= NOW() - INTERVAL '7 days')::float / NULLIF(7, 0), 0) AS prev_daily,
        COALESCE(COUNT(*) FILTER (WHERE "clickedAt" > NOW() - INTERVAL '30 days')::float / NULLIF(30, 0), 0) AS current_30d_daily,
        COALESCE(COUNT(*) FILTER (WHERE "clickedAt" > NOW() - INTERVAL '60 days' AND "clickedAt" <= NOW() - INTERVAL '30 days')::float / NULLIF(30, 0), 0) AS prev_30d_daily
      FROM clickouts
      WHERE "referrer" IS NOT NULL
    `;
    const r = rows[0] || {};
    const value = Math.round(r.current_daily ?? 0);
    const t7 = trendPercent(r.current_daily ?? 0, r.prev_daily ?? 0);
    const t30 = trendPercent(r.current_30d_daily ?? 0, r.prev_30d_daily ?? 0);
    return metric(value, "Qualified Clickouts/Day", t7, t30, computeStatus(value, 10, 3), "decimal");
  } catch {
    return metric(0, "Qualified Clickouts/Day", 0, 0, "critical", "decimal");
  }
}

// ============================================
// Acquisition Metrics
// ============================================

export async function getAcquisitionMetrics(): Promise<MetricResult[]> {
  const [subs, alerts, searches] = await Promise.all([
    subscriberPeriodCounts(),
    priceAlertPeriodCounts(),
    searchPeriodCounts(),
  ]);

  return [
    metric(
      subs.current7d,
      "New Subscribers (7d)",
      trendPercent(subs.current7d, subs.prev7d),
      trendPercent(subs.current30d, subs.prev30d),
      computeStatus(subs.current7d, 5, 1),
      "number"
    ),
    metric(
      alerts.current7d,
      "New Price Alerts (7d)",
      trendPercent(alerts.current7d, alerts.prev7d),
      trendPercent(alerts.current30d, alerts.prev30d),
      computeStatus(alerts.current7d, 3, 1),
      "number"
    ),
    metric(
      searches.current7d,
      "Search Volume (7d)",
      trendPercent(searches.current7d, searches.prev7d),
      trendPercent(searches.current30d, searches.prev30d),
      computeStatus(searches.current7d, 50, 10),
      "number"
    ),
  ];
}

// ============================================
// Engagement Metrics
// ============================================

export async function getEngagementMetrics(): Promise<MetricResult[]> {
  const [clicks, searches, alerts] = await Promise.all([
    clickoutPeriodCounts(),
    searchPeriodCounts(),
    priceAlertPeriodCounts(),
  ]);

  const clickoutsPerDay7d = clicks.current7d / 7;
  const clickoutsPerDayPrev = clicks.prev7d / 7;
  const searchesPerDay7d = searches.current7d / 7;
  const searchesPerDayPrev = searches.prev7d / 7;

  // Pages/session estimate: assume avg 3 pages for users who search + click
  const activeSessions7d = Math.max(clicks.current7d, searches.current7d);
  const pagesPerSession = activeSessions7d > 0
    ? Math.round(((clicks.current7d + searches.current7d) / activeSessions7d) * 10) / 10
    : 0;
  const activeSessionsPrev = Math.max(clicks.prev7d, searches.prev7d);
  const pagesPerSessionPrev = activeSessionsPrev > 0
    ? ((clicks.prev7d + searches.prev7d) / activeSessionsPrev)
    : 0;

  return [
    metric(
      Math.round(clickoutsPerDay7d * 10) / 10,
      "Clickouts/Day",
      trendPercent(clickoutsPerDay7d, clickoutsPerDayPrev),
      trendPercent(clicks.current30d / 30, clicks.prev30d / 30),
      computeStatus(clickoutsPerDay7d, 10, 3),
      "decimal"
    ),
    metric(
      Math.round(searchesPerDay7d * 10) / 10,
      "Searches/Day",
      trendPercent(searchesPerDay7d, searchesPerDayPrev),
      trendPercent(searches.current30d / 30, searches.prev30d / 30),
      computeStatus(searchesPerDay7d, 10, 3),
      "decimal"
    ),
    metric(
      pagesPerSession,
      "Pages/Session (est.)",
      trendPercent(pagesPerSession, pagesPerSessionPrev),
      0,
      computeStatus(pagesPerSession, 2, 1.2),
      "decimal"
    ),
    metric(
      alerts.current7d,
      "Price Alert Signups (7d)",
      trendPercent(alerts.current7d, alerts.prev7d),
      trendPercent(alerts.current30d, alerts.prev30d),
      computeStatus(alerts.current7d, 3, 1),
      "number"
    ),
  ];
}

// ============================================
// Monetization Metrics
// ============================================

// Revenue rate estimates per source (BRL per clickout)
const REVENUE_RATES: Record<string, number> = {
  amazon: 0.15,
  "mercado-livre": 0.10,
  magazineluiza: 0.12,
  americanas: 0.08,
  casasbahia: 0.08,
  default: 0.05,
};

export async function getMonetizationMetrics(): Promise<MetricResult[]> {
  try {
    const sourceClickouts: any[] = await prisma.$queryRaw`
      SELECT
        COALESCE("sourceSlug", 'unknown') AS source_slug,
        COUNT(*) FILTER (WHERE "clickedAt" > NOW() - INTERVAL '7 days')::int AS current_7d,
        COUNT(*) FILTER (WHERE "clickedAt" > NOW() - INTERVAL '14 days' AND "clickedAt" <= NOW() - INTERVAL '7 days')::int AS prev_7d,
        COUNT(*) FILTER (WHERE "clickedAt" > NOW() - INTERVAL '30 days')::int AS current_30d,
        COUNT(*) FILTER (WHERE "clickedAt" > NOW() - INTERVAL '60 days' AND "clickedAt" <= NOW() - INTERVAL '30 days')::int AS prev_30d
      FROM clickouts
      GROUP BY source_slug
      ORDER BY current_7d DESC
    `;

    const results: MetricResult[] = [];
    let totalRevenue7d = 0;
    let totalRevenuePrev7d = 0;
    let totalRevenue30d = 0;
    let totalRevenuePrev30d = 0;

    for (const row of sourceClickouts) {
      const slug = row.source_slug;
      const rate = REVENUE_RATES[slug] ?? REVENUE_RATES.default;
      totalRevenue7d += row.current_7d * rate;
      totalRevenuePrev7d += row.prev_7d * rate;
      totalRevenue30d += row.current_30d * rate;
      totalRevenuePrev30d += row.prev_30d * rate;

      results.push(
        metric(
          row.current_7d,
          `Clickouts: ${slug} (7d)`,
          trendPercent(row.current_7d, row.prev_7d),
          trendPercent(row.current_30d, row.prev_30d),
          computeStatus(row.current_7d, 5, 1),
          "number"
        )
      );
    }

    // Total clickouts
    const totalClicks = await clickoutPeriodCounts();
    results.unshift(
      metric(
        totalClicks.current7d,
        "Total Clickouts (7d)",
        trendPercent(totalClicks.current7d, totalClicks.prev7d),
        trendPercent(totalClicks.current30d, totalClicks.prev30d),
        computeStatus(totalClicks.current7d, 20, 5),
        "number"
      )
    );

    // Estimated revenue
    results.push(
      metric(
        Math.round(totalRevenue7d * 100) / 100,
        "Est. Revenue (7d BRL)",
        trendPercent(totalRevenue7d, totalRevenuePrev7d),
        trendPercent(totalRevenue30d, totalRevenuePrev30d),
        computeStatus(totalRevenue7d, 5, 1),
        "currency"
      )
    );

    return results;
  } catch {
    return [
      metric(0, "Total Clickouts (7d)", 0, 0, "critical", "number"),
      metric(0, "Est. Revenue (7d BRL)", 0, 0, "critical", "currency"),
    ];
  }
}

// ============================================
// Retention Proxy Metrics
// ============================================

export async function getRetentionMetrics(): Promise<MetricResult[]> {
  try {
    // Returning users proxy: sessions with >1 clickout
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        COUNT(DISTINCT "sessionId") FILTER (WHERE "clickedAt" > NOW() - INTERVAL '7 days')::int AS sessions_7d,
        COUNT(DISTINCT "sessionId") FILTER (WHERE "clickedAt" > NOW() - INTERVAL '14 days' AND "clickedAt" <= NOW() - INTERVAL '7 days')::int AS sessions_prev_7d,
        COUNT(DISTINCT "email") FILTER (WHERE "createdAt" > NOW() - INTERVAL '7 days')::int AS active_alerts_7d,
        COUNT(DISTINCT "email") FILTER (WHERE "createdAt" > NOW() - INTERVAL '14 days' AND "createdAt" <= NOW() - INTERVAL '7 days')::int AS active_alerts_prev_7d
      FROM (
        SELECT "sessionId", "clickedAt", NULL AS "email", NULL AS "createdAt" FROM clickouts WHERE "sessionId" IS NOT NULL
        UNION ALL
        SELECT NULL, NULL, "email", "createdAt" FROM price_alerts
      ) combined
    `;
    const r = rows[0] || {};

    // Active subscribers (total)
    const subRows: any[] = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS total FROM subscribers WHERE status = 'ACTIVE'
    `;
    const totalActiveSubs = subRows[0]?.total ?? 0;

    return [
      metric(
        r.sessions_7d ?? 0,
        "Unique Sessions (7d)",
        trendPercent(r.sessions_7d ?? 0, r.sessions_prev_7d ?? 0),
        0,
        computeStatus(r.sessions_7d ?? 0, 20, 5),
        "number"
      ),
      metric(
        totalActiveSubs,
        "Active Subscribers",
        0,
        0,
        computeStatus(totalActiveSubs, 50, 10),
        "number"
      ),
      metric(
        r.active_alerts_7d ?? 0,
        "Users with Alerts (7d)",
        trendPercent(r.active_alerts_7d ?? 0, r.active_alerts_prev_7d ?? 0),
        0,
        computeStatus(r.active_alerts_7d ?? 0, 5, 1),
        "number"
      ),
    ];
  } catch {
    return [
      metric(0, "Unique Sessions (7d)", 0, 0, "critical", "number"),
      metric(0, "Active Subscribers", 0, 0, "critical", "number"),
      metric(0, "Users with Alerts (7d)", 0, 0, "critical", "number"),
    ];
  }
}

// ============================================
// Operational Metrics
// ============================================

export async function getOperationalMetrics(): Promise<MetricResult[]> {
  try {
    const [productRows, listingRows, jobRows] = (await Promise.all([
      prisma.$queryRaw`
        SELECT
          COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active_products,
          COUNT(*) FILTER (WHERE status = 'ACTIVE' AND "imageUrl" IS NOT NULL)::int AS with_images,
          COUNT(*)::int AS total
        FROM products
      `,
      prisma.$queryRaw`
        SELECT
          COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active_listings,
          COUNT(*) FILTER (WHERE status = 'ACTIVE' AND "lastSeenAt" < NOW() - INTERVAL '7 days')::int AS stale_listings,
          COUNT(*) FILTER (WHERE status = 'ACTIVE' AND "productId" IS NULL)::int AS orphan_listings
        FROM listings
      `,
      prisma.$queryRaw`
        SELECT
          COUNT(*) FILTER (WHERE "startedAt" > NOW() - INTERVAL '7 days')::int AS total_7d,
          COUNT(*) FILTER (WHERE "startedAt" > NOW() - INTERVAL '7 days' AND status = 'SUCCESS')::int AS success_7d,
          COUNT(*) FILTER (WHERE "startedAt" > NOW() - INTERVAL '14 days' AND "startedAt" <= NOW() - INTERVAL '7 days')::int AS total_prev_7d,
          COUNT(*) FILTER (WHERE "startedAt" > NOW() - INTERVAL '14 days' AND "startedAt" <= NOW() - INTERVAL '7 days' AND status = 'SUCCESS')::int AS success_prev_7d
        FROM job_runs
      `,
    ])) as [any[], any[], any[]];

    const p = (productRows as any[])[0] || {};
    const l = (listingRows as any[])[0] || {};
    const j = (jobRows as any[])[0] || {};

    const activeProducts = p.active_products ?? 0;
    const activeListings = l.active_listings ?? 0;
    const staleListings = l.stale_listings ?? 0;
    const staleRatio = activeListings > 0 ? Math.round((staleListings / activeListings) * 100) : 0;
    const jobSuccessRate = (j.total_7d ?? 0) > 0
      ? Math.round(((j.success_7d ?? 0) / j.total_7d) * 100)
      : 0;
    const jobSuccessRatePrev = (j.total_prev_7d ?? 0) > 0
      ? Math.round(((j.success_prev_7d ?? 0) / j.total_prev_7d) * 100)
      : 0;

    // Active offers
    let activeOffers = 0;
    try {
      const offerRows: any[] = await prisma.$queryRaw`
        SELECT COUNT(*)::int AS cnt FROM offers WHERE "isActive" = true
      `;
      activeOffers = offerRows[0]?.cnt ?? 0;
    } catch {}

    return [
      metric(activeProducts, "Active Products", 0, 0, computeStatus(activeProducts, 100, 20), "number"),
      metric(activeOffers, "Active Offers", 0, 0, computeStatus(activeOffers, 100, 20), "number"),
      metric(activeListings, "Active Listings", 0, 0, computeStatus(activeListings, 100, 20), "number"),
      metric(staleListings, "Stale Listings (>7d)", 0, 0, computeStatus(staleRatio, 20, 50, false), "number"),
      metric(
        jobSuccessRate,
        "Job Success Rate (7d)",
        trendPercent(jobSuccessRate, jobSuccessRatePrev),
        0,
        computeStatus(jobSuccessRate, 90, 70),
        "percent"
      ),
    ];
  } catch {
    return [
      metric(0, "Active Products", 0, 0, "critical", "number"),
      metric(0, "Active Offers", 0, 0, "critical", "number"),
      metric(0, "Active Listings", 0, 0, "critical", "number"),
      metric(0, "Stale Listings (>7d)", 0, 0, "critical", "number"),
      metric(0, "Job Success Rate (7d)", 0, 0, "critical", "percent"),
    ];
  }
}

// ============================================
// Aggregate: All Business Metrics
// ============================================

export async function getAllBusinessMetrics(): Promise<BusinessMetrics> {
  const [northStar, acquisition, engagement, monetization, retention, operational] =
    await Promise.all([
      getNorthStarMetric(),
      getAcquisitionMetrics(),
      getEngagementMetrics(),
      getMonetizationMetrics(),
      getRetentionMetrics(),
      getOperationalMetrics(),
    ]);

  return { northStar, acquisition, engagement, monetization, retention, operational };
}
