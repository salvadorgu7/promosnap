// ============================================
// MONEY MAP — structured revenue gap analysis & compounding
// ============================================

import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logger"

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MoneyMapEntry {
  label: string;
  slug: string;
  interestScore: number; // searches + views proxy
  revenueScore: number; // clickouts-based
  gapScore: number; // interest - revenue (higher = undermonetized)
  action: string;
}

export interface MoneyMapResult {
  byCategory: MoneyMapEntry[];
  byBrand: MoneyMapEntry[];
  bySource: MoneyMapEntry[];
}

export interface RecurringProduct {
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  clickouts30d: number;
  uniqueSessions: number;
}

export interface RecurringCategory {
  categorySlug: string;
  categoryName: string;
  clickouts30d: number;
  recurringProducts: number;
}

export interface ConversionContent {
  type: "product" | "category";
  label: string;
  slug: string;
  clickouts30d: number;
  conversionProxy: number; // clickouts per popularity point
}

export interface ChannelReturn {
  sourceSlug: string;
  sourceName: string;
  clickouts30d: number;
  estimatedRevenue: number;
  trend: number; // % change week over week
}

export interface CompoundingRevenueResult {
  recurringProducts: RecurringProduct[];
  recurringCategories: RecurringCategory[];
  conversionContent: ConversionContent[];
  channelsWithReturn: ChannelReturn[];
}

// Revenue rate estimates per source (BRL per clickout)
const REVENUE_RATES: Record<string, number> = {
  amazon: 0.15,
  "mercado-livre": 0.10,
  magazineluiza: 0.12,
  americanas: 0.08,
  casasbahia: 0.08,
  shopee: 0.06,
  shein: 0.07,
  default: 0.05,
};

function getRate(slug: string): number {
  return REVENUE_RATES[slug] ?? REVENUE_RATES.default;
}

// ─── Money Map ──────────────────────────────────────────────────────────────

/**
 * Structured view of interest vs revenue across categories, brands, and sources.
 */
export async function getMoneyMap(): Promise<MoneyMapResult> {
  const result: MoneyMapResult = {
    byCategory: [],
    byBrand: [],
    bySource: [],
  };

  try {
    // ── Categories ──────────────────────────────────────────────────────
    const catRows: any[] = await prisma.$queryRaw`
      SELECT
        c.slug, c.name,
        COUNT(DISTINCT p.id)::int AS product_count,
        COALESCE(AVG(p."popularityScore"), 0)::int AS avg_popularity,
        COALESCE(SUM(CASE WHEN cl."clickedAt" > NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END), 0)::int AS clickouts_30d,
        COALESCE(search_counts.search_count, 0)::int AS searches
      FROM categories c
      JOIN products p ON p."categoryId" = c.id AND p.status = 'ACTIVE' AND p.hidden = false
      LEFT JOIN clickouts cl ON cl."productId" = p.id
      LEFT JOIN (
        SELECT
          p2."categoryId" AS cat_id,
          COUNT(*)::int AS search_count
        FROM search_logs sl
        JOIN products p2 ON sl."clickedProductId" = p2.id
        WHERE sl."createdAt" > NOW() - INTERVAL '30 days'
        GROUP BY p2."categoryId"
      ) search_counts ON search_counts.cat_id = c.id
      GROUP BY c.slug, c.name, search_counts.search_count
      ORDER BY AVG(p."popularityScore") DESC
      LIMIT 15
    `;

    result.byCategory = catRows.map((r) => {
      const interest = Math.round(r.avg_popularity * 0.6 + Math.min(r.searches, 100) * 0.4);
      const revenue = Math.min(100, Math.round(r.clickouts_30d * 2));
      const gap = Math.max(0, interest - revenue);
      let action: string;
      if (gap >= 40) action = "Priorizar monetizacao — alto interesse, baixa receita";
      else if (gap >= 20) action = "Otimizar CTAs e ofertas";
      else if (revenue > interest) action = "Manter fluxo — categoria ja converte bem";
      else action = "Monitorar";

      return { label: r.name, slug: r.slug, interestScore: interest, revenueScore: revenue, gapScore: gap, action };
    });

    // ── Brands ──────────────────────────────────────────────────────────
    const brandRows: any[] = await prisma.$queryRaw`
      SELECT
        b.slug, b.name,
        COUNT(DISTINCT p.id)::int AS product_count,
        COALESCE(AVG(p."popularityScore"), 0)::int AS avg_popularity,
        COALESCE(SUM(CASE WHEN cl."clickedAt" > NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END), 0)::int AS clickouts_30d
      FROM brands b
      JOIN products p ON p."brandId" = b.id AND p.status = 'ACTIVE' AND p.hidden = false
      LEFT JOIN clickouts cl ON cl."productId" = p.id
      GROUP BY b.slug, b.name
      HAVING COUNT(DISTINCT p.id) >= 2
      ORDER BY AVG(p."popularityScore") DESC
      LIMIT 15
    `;

    result.byBrand = brandRows.map((r) => {
      const interest = Math.round(r.avg_popularity);
      const revenue = Math.min(100, Math.round(r.clickouts_30d * 2));
      const gap = Math.max(0, interest - revenue);
      let action: string;
      if (gap >= 40) action = "Expandir ofertas desta marca";
      else if (gap >= 20) action = "Melhorar posicionamento";
      else action = "Manter";

      return { label: r.name, slug: r.slug, interestScore: interest, revenueScore: revenue, gapScore: gap, action };
    });

    // ── Sources ─────────────────────────────────────────────────────────
    const sourceRows: any[] = await prisma.$queryRaw`
      SELECT
        s.slug, s.name,
        COUNT(DISTINCT l.id)::int AS listing_count,
        COALESCE(cl_data.clickouts_30d, 0)::int AS clickouts_30d
      FROM sources s
      LEFT JOIN listings l ON l."sourceId" = s.id AND l.status = 'ACTIVE'
      LEFT JOIN (
        SELECT "sourceSlug", COUNT(*)::int AS clickouts_30d
        FROM clickouts
        WHERE "clickedAt" > NOW() - INTERVAL '30 days'
        GROUP BY "sourceSlug"
      ) cl_data ON cl_data."sourceSlug" = s.slug
      WHERE s.status = 'ACTIVE'
      GROUP BY s.slug, s.name, cl_data.clickouts_30d
      ORDER BY COALESCE(cl_data.clickouts_30d, 0) DESC
      LIMIT 10
    `;

    result.bySource = sourceRows.map((r) => {
      const interest = Math.min(100, Math.round(r.listing_count * 0.5));
      const rate = getRate(r.slug);
      const revenue = Math.min(100, Math.round(r.clickouts_30d * rate * 10));
      const gap = Math.max(0, interest - revenue);
      let action: string;
      if (gap >= 30) action = "Melhorar taxa de conversao para esta fonte";
      else if (revenue > interest) action = "Canal forte — expandir catalogo";
      else action = "Monitorar";

      return { label: r.name, slug: r.slug, interestScore: interest, revenueScore: revenue, gapScore: gap, action };
    });
  } catch (err) { logger.warn("money-map.query-failed", { error: err }) }

  // Sort all by gap descending
  result.byCategory.sort((a, b) => b.gapScore - a.gapScore);
  result.byBrand.sort((a, b) => b.gapScore - a.gapScore);
  result.bySource.sort((a, b) => b.gapScore - a.gapScore);

  return result;
}

// ─── Compounding Revenue ────────────────────────────────────────────────────

/**
 * Identify recurring revenue patterns — products, categories, and channels
 * that compound over time.
 */
export async function getCompoundingRevenue(): Promise<CompoundingRevenueResult> {
  const result: CompoundingRevenueResult = {
    recurringProducts: [],
    recurringCategories: [],
    conversionContent: [],
    channelsWithReturn: [],
  };

  try {
    // ── Recurring clickout products (3+ clickouts in 30d) ───────────────
    const recurringRows: any[] = await prisma.$queryRaw`
      SELECT
        cl."productId" AS product_id,
        p.name AS product_name,
        p.slug AS product_slug,
        p."imageUrl" AS image_url,
        COUNT(*)::int AS clickouts_30d,
        COUNT(DISTINCT cl."sessionId")::int AS unique_sessions
      FROM clickouts cl
      JOIN products p ON cl."productId" = p.id
      WHERE cl."clickedAt" > NOW() - INTERVAL '30 days'
        AND cl."productId" IS NOT NULL
        AND p.status = 'ACTIVE'
      GROUP BY cl."productId", p.name, p.slug, p."imageUrl"
      HAVING COUNT(*) >= 3
      ORDER BY COUNT(*) DESC
      LIMIT 15
    `;

    result.recurringProducts = recurringRows.map((r) => ({
      productId: r.product_id,
      productName: r.product_name,
      productSlug: r.product_slug,
      imageUrl: r.image_url,
      clickouts30d: r.clickouts_30d,
      uniqueSessions: r.unique_sessions,
    }));

    // ── Recurring categories ────────────────────────────────────────────
    const catRecurringRows: any[] = await prisma.$queryRaw`
      SELECT
        c.slug AS category_slug,
        c.name AS category_name,
        COUNT(*)::int AS clickouts_30d,
        COUNT(DISTINCT cl."productId")::int AS recurring_products
      FROM clickouts cl
      JOIN products p ON cl."productId" = p.id
      JOIN categories c ON p."categoryId" = c.id
      WHERE cl."clickedAt" > NOW() - INTERVAL '30 days'
        AND cl."productId" IS NOT NULL
      GROUP BY c.slug, c.name
      HAVING COUNT(*) >= 5
      ORDER BY COUNT(*) DESC
      LIMIT 10
    `;

    result.recurringCategories = catRecurringRows.map((r) => ({
      categorySlug: r.category_slug,
      categoryName: r.category_name,
      clickouts30d: r.clickouts_30d,
      recurringProducts: r.recurring_products,
    }));

    // ── Content that drives conversions ──────────────────────────────────
    // Products with high clickouts relative to popularity (good conversion)
    const conversionRows: any[] = await prisma.$queryRaw`
      SELECT
        p.id, p.name, p.slug,
        p."popularityScore" AS popularity,
        c.slug AS category_slug,
        c.name AS category_name,
        COUNT(cl.id)::int AS clickouts_30d
      FROM products p
      LEFT JOIN categories c ON p."categoryId" = c.id
      LEFT JOIN clickouts cl ON cl."productId" = p.id AND cl."clickedAt" > NOW() - INTERVAL '30 days'
      WHERE p.status = 'ACTIVE' AND p.hidden = false AND p."popularityScore" > 0
      GROUP BY p.id, p.name, p.slug, p."popularityScore", c.slug, c.name
      HAVING COUNT(cl.id) >= 2
      ORDER BY (COUNT(cl.id)::float / GREATEST(p."popularityScore", 1)) DESC
      LIMIT 10
    `;

    result.conversionContent = conversionRows.map((r) => ({
      type: "product" as const,
      label: r.name,
      slug: r.slug,
      clickouts30d: r.clickouts_30d,
      conversionProxy: Math.round((r.clickouts_30d / Math.max(r.popularity, 1)) * 100) / 100,
    }));

    // ── Channels with return (source → clickout correlation) ────────────
    const channelRows: any[] = await prisma.$queryRaw`
      SELECT
        COALESCE(cl."sourceSlug", 'unknown') AS source_slug,
        COUNT(*)::int AS clickouts_30d,
        COUNT(*) FILTER (WHERE cl."clickedAt" > NOW() - INTERVAL '7 days')::int AS clickouts_7d,
        COUNT(*) FILTER (WHERE cl."clickedAt" > NOW() - INTERVAL '14 days' AND cl."clickedAt" <= NOW() - INTERVAL '7 days')::int AS clickouts_prev_7d
      FROM clickouts cl
      WHERE cl."clickedAt" > NOW() - INTERVAL '30 days'
      GROUP BY cl."sourceSlug"
      ORDER BY clickouts_30d DESC
      LIMIT 10
    `;

    const sources = await prisma.source.findMany({
      select: { slug: true, name: true },
    });
    const sourceNames = new Map(sources.map((s) => [s.slug, s.name]));

    result.channelsWithReturn = channelRows.map((r) => {
      const rate = getRate(r.source_slug);
      const trend = r.clickouts_prev_7d > 0
        ? Math.round(((r.clickouts_7d - r.clickouts_prev_7d) / r.clickouts_prev_7d) * 100)
        : r.clickouts_7d > 0 ? 100 : 0;

      return {
        sourceSlug: r.source_slug,
        sourceName: sourceNames.get(r.source_slug) ?? r.source_slug,
        clickouts30d: r.clickouts_30d,
        estimatedRevenue: Math.round(r.clickouts_30d * rate * 100) / 100,
        trend,
      };
    });
  } catch (err) { logger.warn("money-map.query-failed", { error: err }) }

  return result;
}
