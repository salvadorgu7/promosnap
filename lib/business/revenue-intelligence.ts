// ============================================
// REVENUE INTELLIGENCE — deep revenue analysis
// ============================================

import prisma from "@/lib/db/prisma";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RevenueByCategory {
  categorySlug: string;
  categoryName: string;
  clickouts7d: number;
  clickouts30d: number;
  estimatedRevenue7d: number;
  estimatedRevenue30d: number;
  productCount: number;
  trend: number; // percentage change
}

export interface RevenueBySource {
  sourceSlug: string;
  sourceName: string;
  clickouts7d: number;
  clickouts30d: number;
  estimatedRevenue7d: number;
  estimatedRevenue30d: number;
  commissionRate: number;
}

export interface TopRevenueProduct {
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  categorySlug: string | null;
  clickouts7d: number;
  clickouts30d: number;
  estimatedRevenue7d: number;
  estimatedRevenue30d: number;
  bestPrice: number | null;
  offerScore: number;
}

export interface Underperformer {
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  views: number;
  clickouts: number;
  conversionRate: number;
  reason: string;
  suggestion: string;
}

export interface RevenueOpportunity {
  type: "category" | "brand" | "product";
  label: string;
  slug: string;
  potential: "high" | "medium" | "low";
  reason: string;
  currentRevenue: number;
  estimatedPotential: number;
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

// ─── Revenue by Category ────────────────────────────────────────────────────

export async function getRevenueByCategory(): Promise<RevenueByCategory[]> {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        COALESCE(p."categoryId", 'uncategorized') AS category_id,
        COALESCE(c.slug, 'sem-categoria') AS category_slug,
        COALESCE(c.name, 'Sem Categoria') AS category_name,
        COUNT(*) FILTER (WHERE cl."clickedAt" > NOW() - INTERVAL '7 days')::int AS clickouts_7d,
        COUNT(*) FILTER (WHERE cl."clickedAt" > NOW() - INTERVAL '30 days')::int AS clickouts_30d,
        COUNT(*) FILTER (WHERE cl."clickedAt" > NOW() - INTERVAL '14 days' AND cl."clickedAt" <= NOW() - INTERVAL '7 days')::int AS clickouts_prev_7d,
        COUNT(DISTINCT p.id)::int AS product_count
      FROM clickouts cl
      LEFT JOIN products p ON cl."productId" = p.id
      LEFT JOIN categories c ON p."categoryId" = c.id
      GROUP BY category_id, category_slug, category_name
      ORDER BY clickouts_7d DESC
      LIMIT 20
    `;

    return rows.map((r) => {
      const trend = r.clickouts_prev_7d > 0
        ? Math.round(((r.clickouts_7d - r.clickouts_prev_7d) / r.clickouts_prev_7d) * 100)
        : r.clickouts_7d > 0 ? 100 : 0;

      return {
        categorySlug: r.category_slug,
        categoryName: r.category_name,
        clickouts7d: r.clickouts_7d,
        clickouts30d: r.clickouts_30d,
        estimatedRevenue7d: Math.round(r.clickouts_7d * 0.10 * 100) / 100,
        estimatedRevenue30d: Math.round(r.clickouts_30d * 0.10 * 100) / 100,
        productCount: r.product_count,
        trend,
      };
    });
  } catch {
    return [];
  }
}

// ─── Revenue by Source ──────────────────────────────────────────────────────

export async function getRevenueBySource(): Promise<RevenueBySource[]> {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        COALESCE("sourceSlug", 'unknown') AS source_slug,
        COUNT(*) FILTER (WHERE "clickedAt" > NOW() - INTERVAL '7 days')::int AS clickouts_7d,
        COUNT(*) FILTER (WHERE "clickedAt" > NOW() - INTERVAL '30 days')::int AS clickouts_30d
      FROM clickouts
      GROUP BY source_slug
      ORDER BY clickouts_7d DESC
    `;

    // Get source names
    const sources = await prisma.source.findMany({
      select: { slug: true, name: true },
    });
    const sourceNames = new Map(sources.map((s) => [s.slug, s.name]));

    return rows.map((r) => {
      const rate = getRate(r.source_slug);
      return {
        sourceSlug: r.source_slug,
        sourceName: sourceNames.get(r.source_slug) ?? r.source_slug,
        clickouts7d: r.clickouts_7d,
        clickouts30d: r.clickouts_30d,
        estimatedRevenue7d: Math.round(r.clickouts_7d * rate * 100) / 100,
        estimatedRevenue30d: Math.round(r.clickouts_30d * rate * 100) / 100,
        commissionRate: rate,
      };
    });
  } catch {
    return [];
  }
}

// ─── Top Revenue Products ───────────────────────────────────────────────────

export async function getTopRevenueProducts(
  limit = 10
): Promise<TopRevenueProduct[]> {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        cl."productId" AS product_id,
        p.name AS product_name,
        p.slug AS product_slug,
        p."imageUrl" AS image_url,
        c.slug AS category_slug,
        COUNT(*) FILTER (WHERE cl."clickedAt" > NOW() - INTERVAL '7 days')::int AS clickouts_7d,
        COUNT(*) FILTER (WHERE cl."clickedAt" > NOW() - INTERVAL '30 days')::int AS clickouts_30d
      FROM clickouts cl
      JOIN products p ON cl."productId" = p.id
      LEFT JOIN categories c ON p."categoryId" = c.id
      WHERE cl."productId" IS NOT NULL
      GROUP BY cl."productId", p.name, p.slug, p."imageUrl", c.slug
      ORDER BY clickouts_7d DESC
      LIMIT ${limit}
    `;

    // Get best prices and scores for these products
    const productIds = rows.map((r: any) => r.product_id).filter(Boolean);
    const offers = productIds.length > 0
      ? await prisma.offer.findMany({
          where: {
            isActive: true,
            listing: { productId: { in: productIds }, status: "ACTIVE" },
          },
          orderBy: { offerScore: "desc" },
          select: {
            currentPrice: true,
            offerScore: true,
            listing: { select: { productId: true } },
          },
        })
      : [];

    const bestOffers = new Map<string, { price: number; score: number }>();
    for (const o of offers) {
      const pid = o.listing.productId;
      if (pid && !bestOffers.has(pid)) {
        bestOffers.set(pid, { price: o.currentPrice, score: o.offerScore });
      }
    }

    return rows.map((r: any) => {
      const bo = bestOffers.get(r.product_id);
      return {
        productId: r.product_id,
        productName: r.product_name,
        productSlug: r.product_slug,
        imageUrl: r.image_url,
        categorySlug: r.category_slug,
        clickouts7d: r.clickouts_7d,
        clickouts30d: r.clickouts_30d,
        estimatedRevenue7d: Math.round(r.clickouts_7d * 0.10 * 100) / 100,
        estimatedRevenue30d: Math.round(r.clickouts_30d * 0.10 * 100) / 100,
        bestPrice: bo?.price ?? null,
        offerScore: bo?.score ?? 0,
      };
    });
  } catch {
    return [];
  }
}

// ─── Underperformers ────────────────────────────────────────────────────────

export async function getUnderperformers(
  limit = 10
): Promise<Underperformer[]> {
  try {
    // Products with high popularity but low clickouts
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        p.id AS product_id,
        p.name AS product_name,
        p.slug AS product_slug,
        p."imageUrl" AS image_url,
        p."popularityScore" AS views_proxy,
        COALESCE(cl.clickout_count, 0)::int AS clickout_count
      FROM products p
      LEFT JOIN (
        SELECT "productId", COUNT(*)::int AS clickout_count
        FROM clickouts
        WHERE "clickedAt" > NOW() - INTERVAL '30 days'
        GROUP BY "productId"
      ) cl ON cl."productId" = p.id
      WHERE p.status = 'ACTIVE' AND p.hidden = false AND p."popularityScore" >= 30
      ORDER BY p."popularityScore" DESC, clickout_count ASC
      LIMIT ${limit * 2}
    `;

    const underperformers: Underperformer[] = [];

    for (const r of rows) {
      const views = Math.max(r.views_proxy, 1);
      const clickouts = r.clickout_count;
      const conversionRate = Math.round((clickouts / views) * 100);

      // Only include if conversion is notably low relative to popularity
      if (clickouts <= 2 && views >= 30) {
        let reason: string;
        let suggestion: string;

        if (clickouts === 0) {
          reason = "Alto trafego, zero clickouts em 30 dias";
          suggestion = "Revisar ofertas e CTAs do produto";
        } else {
          reason = `Conversao baixa: ${conversionRate}% (${clickouts} clickouts, score ${views})`;
          suggestion = "Melhorar posicionamento ou adicionar mais fontes";
        }

        underperformers.push({
          productId: r.product_id,
          productName: r.product_name,
          productSlug: r.product_slug,
          imageUrl: r.image_url,
          views,
          clickouts,
          conversionRate,
          reason,
          suggestion,
        });

        if (underperformers.length >= limit) break;
      }
    }

    return underperformers;
  } catch {
    return [];
  }
}

// ─── Revenue Opportunities ──────────────────────────────────────────────────

export async function getRevenueOpportunities(
  limit = 10
): Promise<RevenueOpportunity[]> {
  const opportunities: RevenueOpportunity[] = [];

  try {
    // Categories with products but low clickouts (undermonetized)
    const catRows: any[] = await prisma.$queryRaw`
      SELECT
        c.slug, c.name,
        COUNT(DISTINCT p.id)::int AS product_count,
        COALESCE(SUM(CASE WHEN cl."clickedAt" > NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END), 0)::int AS clickouts_30d
      FROM categories c
      JOIN products p ON p."categoryId" = c.id AND p.status = 'ACTIVE'
      LEFT JOIN clickouts cl ON cl."productId" = p.id
      GROUP BY c.slug, c.name
      HAVING COUNT(DISTINCT p.id) >= 3
      ORDER BY COUNT(DISTINCT p.id) DESC
      LIMIT 10
    `;

    for (const r of catRows) {
      const clickoutsPerProduct = r.product_count > 0 ? r.clickouts_30d / r.product_count : 0;
      if (clickoutsPerProduct < 2 && r.product_count >= 3) {
        const estimatedPotential = r.product_count * 2 * 0.10; // 2 clickouts/product * rate
        opportunities.push({
          type: "category",
          label: r.name,
          slug: r.slug,
          potential: r.product_count >= 10 ? "high" : r.product_count >= 5 ? "medium" : "low",
          reason: `${r.product_count} produtos, apenas ${r.clickouts_30d} clickouts/30d`,
          currentRevenue: Math.round(r.clickouts_30d * 0.10 * 100) / 100,
          estimatedPotential: Math.round(estimatedPotential * 100) / 100,
        });
      }
    }

    // Brands with strong products but low monetization
    const brandRows: any[] = await prisma.$queryRaw`
      SELECT
        b.slug, b.name,
        COUNT(DISTINCT p.id)::int AS product_count,
        AVG(p."popularityScore")::int AS avg_popularity,
        COALESCE(SUM(CASE WHEN cl."clickedAt" > NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END), 0)::int AS clickouts_30d
      FROM brands b
      JOIN products p ON p."brandId" = b.id AND p.status = 'ACTIVE'
      LEFT JOIN clickouts cl ON cl."productId" = p.id
      GROUP BY b.slug, b.name
      HAVING COUNT(DISTINCT p.id) >= 2 AND AVG(p."popularityScore") >= 30
      ORDER BY AVG(p."popularityScore") DESC
      LIMIT 10
    `;

    for (const r of brandRows) {
      const clickoutsPerProduct = r.product_count > 0 ? r.clickouts_30d / r.product_count : 0;
      if (clickoutsPerProduct < 2) {
        opportunities.push({
          type: "brand",
          label: r.name,
          slug: r.slug,
          potential: r.avg_popularity >= 60 ? "high" : "medium",
          reason: `Marca popular (score ${r.avg_popularity}), ${r.clickouts_30d} clickouts/30d`,
          currentRevenue: Math.round(r.clickouts_30d * 0.10 * 100) / 100,
          estimatedPotential: Math.round(r.product_count * 3 * 0.10 * 100) / 100,
        });
      }
    }
  } catch {
    // Fail silently
  }

  return opportunities
    .sort((a, b) => (b.estimatedPotential - a.estimatedPotential))
    .slice(0, limit);
}
