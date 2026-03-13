// ============================================
// COMMERCIAL RANKING — unified business prioritization
// ============================================

import prisma from "@/lib/db/prisma";

// ─── Types ──────────────────────────────────────────────────────────────────

export type RankingType =
  | "category"
  | "brand"
  | "product"
  | "page"
  | "channel";

export interface CommercialRankingItem {
  type: RankingType;
  label: string;
  slug: string;
  score: number; // 0-100 composite score
  recommendation: string;
  metrics: {
    clickouts30d: number;
    products: number;
    avgPopularity: number;
    estimatedRevenue: number;
  };
  potential: "high" | "medium" | "low";
}

export interface CommercialRanking {
  topCategories: CommercialRankingItem[];
  topBrands: CommercialRankingItem[];
  topProducts: CommercialRankingItem[];
  lowMonetizationPages: CommercialRankingItem[];
  channelPotential: CommercialRankingItem[];
  generatedAt: string;
}

// ─── Scoring helpers ────────────────────────────────────────────────────────

function scorePotential(score: number): "high" | "medium" | "low" {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

// ─── Main Function ──────────────────────────────────────────────────────────

export async function getCommercialRanking(): Promise<CommercialRanking> {
  const ranking: CommercialRanking = {
    topCategories: [],
    topBrands: [],
    topProducts: [],
    lowMonetizationPages: [],
    channelPotential: [],
    generatedAt: new Date().toISOString(),
  };

  try {
    // ─── Top Categories for Expansion ─────────────────────────────────
    const catRows: any[] = await prisma.$queryRaw`
      SELECT
        c.slug, c.name,
        COUNT(DISTINCT p.id)::int AS product_count,
        AVG(p."popularityScore")::int AS avg_popularity,
        COALESCE(SUM(CASE WHEN cl."clickedAt" > NOW() - INTERVAL '30 days' THEN 1 ELSE 0 END), 0)::int AS clickouts_30d
      FROM categories c
      JOIN products p ON p."categoryId" = c.id AND p.status = 'ACTIVE'
      LEFT JOIN clickouts cl ON cl."productId" = p.id
      GROUP BY c.slug, c.name
      ORDER BY AVG(p."popularityScore") DESC
      LIMIT 10
    `;

    ranking.topCategories = catRows.map((r) => {
      const clickoutsPerProduct = r.product_count > 0 ? r.clickouts_30d / r.product_count : 0;
      const score = Math.min(100, Math.round(
        (r.avg_popularity ?? 0) * 0.4 +
        Math.min(r.product_count, 20) * 2 +
        Math.min(clickoutsPerProduct, 10) * 2
      ));
      const estRevenue = Math.round(r.clickouts_30d * 0.10 * 100) / 100;

      let recommendation: string;
      if (r.product_count < 5) recommendation = `Expandir catalogo — apenas ${r.product_count} produtos`;
      else if (clickoutsPerProduct < 1) recommendation = `Melhorar visibilidade — ${r.product_count} produtos, poucos clickouts`;
      else recommendation = `Categoria forte — manter e otimizar`;

      return {
        type: "category" as RankingType,
        label: r.name,
        slug: r.slug,
        score,
        recommendation,
        metrics: {
          clickouts30d: r.clickouts_30d,
          products: r.product_count,
          avgPopularity: r.avg_popularity ?? 0,
          estimatedRevenue: estRevenue,
        },
        potential: scorePotential(score),
      };
    });

    // ─── Top Brands to Strengthen ─────────────────────────────────────
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
      HAVING COUNT(DISTINCT p.id) >= 2
      ORDER BY AVG(p."popularityScore") DESC
      LIMIT 10
    `;

    ranking.topBrands = brandRows.map((r) => {
      const score = Math.min(100, Math.round(
        (r.avg_popularity ?? 0) * 0.5 +
        Math.min(r.product_count, 15) * 2 +
        Math.min(r.clickouts_30d, 50) * 0.4
      ));
      const estRevenue = Math.round(r.clickouts_30d * 0.10 * 100) / 100;

      let recommendation: string;
      if (r.product_count < 3) recommendation = `Adicionar mais produtos desta marca`;
      else if (r.clickouts_30d < r.product_count) recommendation = `Marca submonetizada — melhorar posicionamento`;
      else recommendation = `Marca forte — considerar parcerias`;

      return {
        type: "brand" as RankingType,
        label: r.name,
        slug: r.slug,
        score,
        recommendation,
        metrics: {
          clickouts30d: r.clickouts_30d,
          products: r.product_count,
          avgPopularity: r.avg_popularity ?? 0,
          estimatedRevenue: estRevenue,
        },
        potential: scorePotential(score),
      };
    });

    // ─── Top Products with Potential ──────────────────────────────────
    const productRows: any[] = await prisma.$queryRaw`
      SELECT
        p.id, p.name, p.slug, p."imageUrl",
        p."popularityScore" AS popularity_score,
        COALESCE(cl.clickout_count, 0)::int AS clickouts_30d,
        COALESCE(o.best_score, 0)::int AS best_offer_score
      FROM products p
      LEFT JOIN (
        SELECT "productId", COUNT(*)::int AS clickout_count
        FROM clickouts WHERE "clickedAt" > NOW() - INTERVAL '30 days'
        GROUP BY "productId"
      ) cl ON cl."productId" = p.id
      LEFT JOIN (
        SELECT l."productId", MAX(o2."offerScore")::int AS best_score
        FROM offers o2
        JOIN listings l ON o2."listingId" = l.id
        WHERE o2."isActive" = true AND l.status = 'ACTIVE'
        GROUP BY l."productId"
      ) o ON o."productId" = p.id
      WHERE p.status = 'ACTIVE' AND p.hidden = false
      ORDER BY p."popularityScore" DESC
      LIMIT 15
    `;

    ranking.topProducts = productRows.map((r: any) => {
      const popularity = r.popularity_score ?? 0;
      const score = Math.min(100, Math.round(
        popularity * 0.4 +
        Math.min(r.clickouts_30d, 20) * 2 +
        r.best_offer_score * 0.2
      ));
      const estRevenue = Math.round(r.clickouts_30d * 0.10 * 100) / 100;

      let recommendation: string;
      if (r.clickouts_30d === 0 && popularity >= 50) recommendation = `Popular mas sem conversao — revisar CTA e ofertas`;
      else if (r.best_offer_score >= 70) recommendation = `Oferta forte — considerar destaque`;
      else recommendation = `Manter monitoramento`;

      return {
        type: "product" as RankingType,
        label: r.name,
        slug: r.slug,
        score,
        recommendation,
        metrics: {
          clickouts30d: r.clickouts_30d,
          products: 1,
          avgPopularity: popularity,
          estimatedRevenue: estRevenue,
        },
        potential: scorePotential(score),
      };
    });

    // ─── Pages with Good Traffic but Low Monetization ─────────────────
    // Products with high popularity but low clickout conversion
    const pageRows: any[] = await prisma.$queryRaw`
      SELECT
        p.id, p.name, p.slug,
        p."popularityScore" AS popularity_score,
        COALESCE(cl.clickout_count, 0)::int AS clickouts_30d
      FROM products p
      LEFT JOIN (
        SELECT "productId", COUNT(*)::int AS clickout_count
        FROM clickouts WHERE "clickedAt" > NOW() - INTERVAL '30 days'
        GROUP BY "productId"
      ) cl ON cl."productId" = p.id
      WHERE p.status = 'ACTIVE' AND p.hidden = false AND p."popularityScore" >= 40
      ORDER BY p."popularityScore" DESC, clickouts_30d ASC
      LIMIT 10
    `;

    ranking.lowMonetizationPages = pageRows
      .filter((r: any) => r.clickouts_30d <= 1 && (r.popularity_score ?? 0) >= 40)
      .map((r: any) => {
        const pop = r.popularity_score ?? 0;
        const score = Math.min(100, pop);
        return {
          type: "page" as RankingType,
          label: r.name,
          slug: r.slug,
          score,
          recommendation: `Pagina popular (score ${pop}) com ${r.clickouts_30d} clickouts — otimizar conversao`,
          metrics: {
            clickouts30d: r.clickouts_30d,
            products: 1,
            avgPopularity: pop,
            estimatedRevenue: 0,
          },
          potential: scorePotential(score),
        };
      });

    // ─── Channels with Best Potential ─────────────────────────────────
    const channelRows: any[] = await prisma.$queryRaw`
      SELECT
        COALESCE("sourceSlug", 'unknown') AS source_slug,
        COUNT(*)::int AS total_clickouts,
        COUNT(*) FILTER (WHERE "clickedAt" > NOW() - INTERVAL '7 days')::int AS clickouts_7d,
        COUNT(*) FILTER (WHERE "clickedAt" > NOW() - INTERVAL '30 days')::int AS clickouts_30d
      FROM clickouts
      GROUP BY source_slug
      ORDER BY clickouts_30d DESC
      LIMIT 10
    `;

    const sources = await prisma.source.findMany({ select: { slug: true, name: true } });
    const sourceNames = new Map(sources.map((s) => [s.slug, s.name]));

    ranking.channelPotential = channelRows.map((r) => {
      const RATES: Record<string, number> = { amazon: 0.15, "mercado-livre": 0.10, magazineluiza: 0.12 };
      const rate = RATES[r.source_slug] ?? 0.05;
      const estRevenue = Math.round(r.clickouts_30d * rate * 100) / 100;
      const score = Math.min(100, Math.round(r.clickouts_30d * 0.5 + rate * 200));

      return {
        type: "channel" as RankingType,
        label: sourceNames.get(r.source_slug) ?? r.source_slug,
        slug: r.source_slug,
        score,
        recommendation: r.clickouts_7d > 5 ? `Canal ativo — manter fluxo` : `Potencial subexplorado — aumentar distribuicao`,
        metrics: {
          clickouts30d: r.clickouts_30d,
          products: 0,
          avgPopularity: 0,
          estimatedRevenue: estRevenue,
        },
        potential: scorePotential(score),
      };
    });
  } catch {
    // Return empty ranking on error
  }

  return ranking;
}
