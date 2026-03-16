import prisma from "@/lib/db/prisma";
import type { Scorecard, ScorecardItem, MetricStatus } from "./types";
import { logger } from "@/lib/logger"

// ============================================
// Helpers
// ============================================

function status(
  value: number,
  good: number,
  warn: number,
  higherIsBetter = true
): MetricStatus {
  if (higherIsBetter) {
    if (value >= good) return "good";
    if (value >= warn) return "warning";
    return "critical";
  }
  if (value <= good) return "good";
  if (value <= warn) return "warning";
  return "critical";
}

function trend(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function item(
  key: string,
  label: string,
  value: number,
  trend7d: number,
  trend30d: number,
  st: MetricStatus,
  format?: ScorecardItem["format"],
  description?: string
): ScorecardItem {
  return { key, label, value, trend7d, trend30d, status: st, format, description };
}

function overallFromItems(items: ScorecardItem[]): MetricStatus {
  const statuses = items.map((i) => i.status);
  if (statuses.includes("critical")) return "critical";
  if (statuses.includes("warning")) return "warning";
  return "good";
}

// ============================================
// Business Scorecard
// ============================================

export async function getBusinessScorecard(): Promise<Scorecard> {
  const items: ScorecardItem[] = [];

  try {
    // North star: qualified clickouts/day (7d)
    const nsRows: any[] = await prisma.$queryRaw`
      SELECT
        COALESCE(COUNT(*) FILTER (WHERE "clickedAt" > NOW() - INTERVAL '7 days')::float / 7, 0) AS current_daily,
        COALESCE(COUNT(*) FILTER (WHERE "clickedAt" > NOW() - INTERVAL '14 days' AND "clickedAt" <= NOW() - INTERVAL '7 days')::float / 7, 0) AS prev_daily
      FROM clickouts WHERE "referrer" IS NOT NULL
    `;
    const ns = nsRows[0] || {};
    items.push(item("north_star", "Qualified Clickouts/Day", Math.round((ns.current_daily ?? 0) * 10) / 10, trend(ns.current_daily ?? 0, ns.prev_daily ?? 0), 0, status(ns.current_daily ?? 0, 10, 3), "decimal", "Clickouts from product pages"));

    // Acquisition: new subscribers 7d
    const subRows: any[] = await prisma.$queryRaw`
      SELECT
        COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '7 days')::int AS c7,
        COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '14 days' AND "createdAt" <= NOW() - INTERVAL '7 days')::int AS p7
      FROM subscribers
    `;
    const sr = subRows[0] || {};
    items.push(item("new_subscribers", "New Subscribers (7d)", sr.c7 ?? 0, trend(sr.c7 ?? 0, sr.p7 ?? 0), 0, status(sr.c7 ?? 0, 5, 1), "number"));

    // Engagement: clickouts/day
    const clkRows: any[] = await prisma.$queryRaw`
      SELECT
        COALESCE(COUNT(*) FILTER (WHERE "clickedAt" > NOW() - INTERVAL '7 days')::float / 7, 0) AS c,
        COALESCE(COUNT(*) FILTER (WHERE "clickedAt" > NOW() - INTERVAL '14 days' AND "clickedAt" <= NOW() - INTERVAL '7 days')::float / 7, 0) AS p
      FROM clickouts
    `;
    const cl = clkRows[0] || {};
    items.push(item("clickouts_day", "Clickouts/Day", Math.round((cl.c ?? 0) * 10) / 10, trend(cl.c ?? 0, cl.p ?? 0), 0, status(cl.c ?? 0, 10, 3), "decimal"));

    // Monetization: estimated revenue 7d
    const revRows: any[] = await prisma.$queryRaw`
      SELECT COUNT(*) FILTER (WHERE "clickedAt" > NOW() - INTERVAL '7 days')::int AS cnt
      FROM clickouts
    `;
    const revEst = (revRows[0]?.cnt ?? 0) * 0.10; // avg R$0.10/click
    items.push(item("est_revenue_7d", "Est. Revenue (7d)", Math.round(revEst * 100) / 100, 0, 0, status(revEst, 5, 1), "currency"));

    // Retention: active subscribers
    const retRows: any[] = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS total FROM subscribers WHERE status = 'ACTIVE'
    `;
    items.push(item("active_subs", "Active Subscribers", retRows[0]?.total ?? 0, 0, 0, status(retRows[0]?.total ?? 0, 50, 10), "number"));
  } catch {
    items.push(item("error", "Data Error", 0, 0, 0, "critical", "number", "Failed to load business metrics"));
  }

  return { title: "Business Scorecard", slug: "business", items, overallStatus: overallFromItems(items) };
}

// ============================================
// Product Scorecard
// ============================================

export async function getProductScorecard(): Promise<Scorecard> {
  const items: ScorecardItem[] = [];

  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active,
        COUNT(*) FILTER (WHERE "imageUrl" IS NOT NULL)::int AS with_images,
        COUNT(*) FILTER (WHERE "brandId" IS NOT NULL)::int AS with_brand,
        COUNT(*) FILTER (WHERE "categoryId" IS NOT NULL)::int AS with_category,
        COUNT(*) FILTER (WHERE "description" IS NOT NULL AND "description" != '')::int AS with_description
      FROM products
    `;
    const r = rows[0] || {};
    const total = r.total ?? 0;
    const active = r.active ?? 0;
    const imgCoverage = total > 0 ? Math.round((r.with_images / total) * 100) : 0;
    const brandCoverage = total > 0 ? Math.round((r.with_brand / total) * 100) : 0;
    const catCoverage = total > 0 ? Math.round((r.with_category / total) * 100) : 0;
    const descCoverage = total > 0 ? Math.round((r.with_description / total) * 100) : 0;

    // Unique brands and categories
    const brandRows: any[] = await prisma.$queryRaw`SELECT COUNT(*)::int AS cnt FROM brands`;
    const catRows: any[] = await prisma.$queryRaw`SELECT COUNT(*)::int AS cnt FROM categories`;

    items.push(item("active_products", "Active Products", active, 0, 0, status(active, 100, 20), "number"));
    items.push(item("total_products", "Total Products", total, 0, 0, status(total, 100, 20), "number"));
    items.push(item("image_coverage", "Image Coverage", imgCoverage, 0, 0, status(imgCoverage, 80, 50), "percent"));
    items.push(item("brand_coverage", "Brand Coverage", brandCoverage, 0, 0, status(brandCoverage, 70, 40), "percent"));
    items.push(item("category_coverage", "Category Coverage", catCoverage, 0, 0, status(catCoverage, 80, 50), "percent"));
    items.push(item("description_coverage", "Description Coverage", descCoverage, 0, 0, status(descCoverage, 60, 30), "percent"));
    items.push(item("brands_count", "Brands", brandRows[0]?.cnt ?? 0, 0, 0, status(brandRows[0]?.cnt ?? 0, 10, 3), "number"));
    items.push(item("categories_count", "Categories", catRows[0]?.cnt ?? 0, 0, 0, status(catRows[0]?.cnt ?? 0, 5, 2), "number"));
  } catch {
    items.push(item("error", "Data Error", 0, 0, 0, "critical", "number", "Failed to load product metrics"));
  }

  return { title: "Product Scorecard", slug: "product", items, overallStatus: overallFromItems(items) };
}

// ============================================
// Catalog Scorecard
// ============================================

export async function getCatalogScorecard(): Promise<Scorecard> {
  const items: ScorecardItem[] = [];

  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active,
        COUNT(*) FILTER (WHERE status = 'ACTIVE' AND "lastSeenAt" < NOW() - INTERVAL '7 days')::int AS stale,
        COUNT(*) FILTER (WHERE "productId" IS NULL)::int AS orphans,
        COUNT(DISTINCT "sourceId")::int AS source_count
      FROM listings
    `;
    const r = rows[0] || {};
    const active = r.active ?? 0;
    const stale = r.stale ?? 0;
    const staleRatio = active > 0 ? Math.round((stale / active) * 100) : 0;
    const orphanRatio = (r.total ?? 0) > 0 ? Math.round(((r.orphans ?? 0) / r.total) * 100) : 0;

    // Offers health
    const offerRows: any[] = await prisma.$queryRaw`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE "isActive" = true)::int AS active
      FROM offers
    `;
    const o = offerRows[0] || {};

    items.push(item("active_listings", "Active Listings", active, 0, 0, status(active, 100, 20), "number"));
    items.push(item("listings_health", "Listings Total", r.total ?? 0, 0, 0, status(r.total ?? 0, 100, 20), "number"));
    items.push(item("source_diversity", "Source Diversity", r.source_count ?? 0, 0, 0, status(r.source_count ?? 0, 3, 2), "number", "Unique sources"));
    items.push(item("stale_ratio", "Stale Ratio", staleRatio, 0, 0, status(staleRatio, 10, 30, false), "percent", "Listings not seen in 7d"));
    items.push(item("orphan_ratio", "Orphan Ratio", orphanRatio, 0, 0, status(orphanRatio, 10, 30, false), "percent", "Listings without product match"));
    items.push(item("active_offers", "Active Offers", o.active ?? 0, 0, 0, status(o.active ?? 0, 100, 20), "number"));
    items.push(item("total_offers", "Total Offers", o.total ?? 0, 0, 0, status(o.total ?? 0, 100, 20), "number"));
  } catch {
    items.push(item("error", "Data Error", 0, 0, 0, "critical", "number", "Failed to load catalog metrics"));
  }

  return { title: "Catalog Scorecard", slug: "catalog", items, overallStatus: overallFromItems(items) };
}

// ============================================
// SEO Scorecard
// ============================================

export async function getSeoScorecard(): Promise<Scorecard> {
  const items: ScorecardItem[] = [];

  try {
    // Product pages with SEO-friendly content
    const prodRows: any[] = await prisma.$queryRaw`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE "description" IS NOT NULL AND "description" != '')::int AS with_desc,
        COUNT(*) FILTER (WHERE "imageUrl" IS NOT NULL)::int AS with_image
      FROM products WHERE status = 'ACTIVE'
    `;
    const p = prodRows[0] || {};
    const total = p.total ?? 0;
    const descCoverage = total > 0 ? Math.round((p.with_desc / total) * 100) : 0;
    const imgCoverage = total > 0 ? Math.round((p.with_image / total) * 100) : 0;

    // Categories with SEO data
    const catRows: any[] = await prisma.$queryRaw`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE "seoTitle" IS NOT NULL AND "seoTitle" != '')::int AS with_seo_title,
        COUNT(*) FILTER (WHERE "seoDescription" IS NOT NULL AND "seoDescription" != '')::int AS with_seo_desc
      FROM categories
    `;
    const c = catRows[0] || {};
    const catTotal = c.total ?? 0;
    const catSeoTitle = catTotal > 0 ? Math.round((c.with_seo_title / catTotal) * 100) : 0;
    const catSeoDesc = catTotal > 0 ? Math.round((c.with_seo_desc / catTotal) * 100) : 0;

    // Articles published
    const artRows: any[] = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS published FROM articles WHERE status = 'PUBLISHED'
    `;
    const publishedArticles = artRows[0]?.published ?? 0;

    // Search volume as content demand signal
    const searchRows: any[] = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT "normalizedQuery")::int AS unique_queries
      FROM search_logs WHERE "createdAt" > NOW() - INTERVAL '30 days'
    `;

    items.push(item("product_desc_coverage", "Product Description Coverage", descCoverage, 0, 0, status(descCoverage, 70, 40), "percent"));
    items.push(item("product_img_coverage", "Product Image Coverage", imgCoverage, 0, 0, status(imgCoverage, 80, 50), "percent"));
    items.push(item("cat_seo_title", "Category SEO Titles", catSeoTitle, 0, 0, status(catSeoTitle, 80, 50), "percent"));
    items.push(item("cat_seo_desc", "Category SEO Descriptions", catSeoDesc, 0, 0, status(catSeoDesc, 80, 50), "percent"));
    items.push(item("published_articles", "Published Articles", publishedArticles, 0, 0, status(publishedArticles, 10, 3), "number"));
    items.push(item("unique_search_queries", "Unique Queries (30d)", searchRows[0]?.unique_queries ?? 0, 0, 0, status(searchRows[0]?.unique_queries ?? 0, 50, 10), "number", "Content gap signal"));
  } catch {
    items.push(item("error", "Data Error", 0, 0, 0, "critical", "number", "Failed to load SEO metrics"));
  }

  return { title: "SEO Scorecard", slug: "seo", items, overallStatus: overallFromItems(items) };
}

// ============================================
// Revenue Scorecard
// ============================================

export async function getRevenueScorecard(): Promise<Scorecard> {
  const items: ScorecardItem[] = [];

  try {
    // Clickouts with source breakdown
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        COALESCE("sourceSlug", 'unknown') AS source_slug,
        COUNT(*) FILTER (WHERE "clickedAt" > NOW() - INTERVAL '7 days')::int AS c7,
        COUNT(*) FILTER (WHERE "clickedAt" > NOW() - INTERVAL '14 days' AND "clickedAt" <= NOW() - INTERVAL '7 days')::int AS p7,
        COUNT(*) FILTER (WHERE "clickedAt" > NOW() - INTERVAL '30 days')::int AS c30,
        COUNT(*) FILTER (WHERE "clickedAt" > NOW() - INTERVAL '60 days' AND "clickedAt" <= NOW() - INTERVAL '30 days')::int AS p30
      FROM clickouts
      GROUP BY source_slug
      ORDER BY c7 DESC
    `;

    let total7d = 0;
    let totalPrev7d = 0;
    let total30d = 0;
    let totalPrev30d = 0;
    let estRevenue7d = 0;

    const RATES: Record<string, number> = { amazon: 0.15, "mercado-livre": 0.10, magazineluiza: 0.12 };

    for (const r of rows) {
      total7d += r.c7;
      totalPrev7d += r.p7;
      total30d += r.c30;
      totalPrev30d += r.p30;
      const rate = RATES[r.source_slug] ?? 0.05;
      estRevenue7d += r.c7 * rate;
    }

    items.push(item("total_clickouts_7d", "Total Clickouts (7d)", total7d, trend(total7d, totalPrev7d), trend(total30d, totalPrev30d), status(total7d, 20, 5), "number"));
    items.push(item("total_clickouts_30d", "Total Clickouts (30d)", total30d, 0, trend(total30d, totalPrev30d), status(total30d, 100, 20), "number"));
    items.push(item("est_revenue_7d", "Est. Revenue (7d BRL)", Math.round(estRevenue7d * 100) / 100, trend(total7d, totalPrev7d), 0, status(estRevenue7d, 5, 1), "currency"));

    // Top sources
    const topSources = rows.slice(0, 3);
    for (const src of topSources) {
      items.push(item(`source_${src.source_slug}`, `Source: ${src.source_slug}`, src.c7, trend(src.c7, src.p7), trend(src.c30, src.p30), status(src.c7, 5, 1), "number"));
    }

    // Conversion proxy: clickouts / searches
    const searchRows: any[] = await prisma.$queryRaw`
      SELECT COUNT(*) FILTER (WHERE "createdAt" > NOW() - INTERVAL '7 days')::int AS s7
      FROM search_logs
    `;
    const searches7d = searchRows[0]?.s7 ?? 0;
    const conversionProxy = searches7d > 0 ? Math.round((total7d / searches7d) * 100) : 0;
    items.push(item("conversion_proxy", "Conversion Proxy (clickouts/searches)", conversionProxy, 0, 0, status(conversionProxy, 20, 5), "percent", "% of searches that led to clickout"));
  } catch {
    items.push(item("error", "Data Error", 0, 0, 0, "critical", "number", "Failed to load revenue metrics"));
  }

  return { title: "Revenue Scorecard", slug: "revenue", items, overallStatus: overallFromItems(items) };
}

// ============================================
// Get all scorecards
// ============================================

export async function getAllScorecards(): Promise<Scorecard[]> {
  const [business, product, catalog, seo, revenue] = await Promise.all([
    getBusinessScorecard(),
    getProductScorecard(),
    getCatalogScorecard(),
    getSeoScorecard(),
    getRevenueScorecard(),
  ]);

  return [business, product, catalog, seo, revenue];
}
