import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logger"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RetentionFeatureRank {
  feature: string;
  label: string;
  description: string;
  /** Primary metric value */
  metricValue: number;
  metricLabel: string;
  /** Secondary conversion/engagement rate */
  conversionRate: number;
  /** Rank position (1 = best) */
  rank: number;
}

// ─── Main function ───────────────────────────────────────────────────────────

/**
 * Rank which features drive return visits based on real data.
 * Analyzes: Alerts, Favorites (alerts proxy), Guides (articles), Comparisons, Distribution.
 */
export async function getRetentionValueRanking(): Promise<RetentionFeatureRank[]> {
  const [alerts, searches, distribution, content] = await Promise.all([
    getAlertRetention(),
    getSearchRetention(),
    getDistributionRetention(),
    getContentRetention(),
  ]);

  const features = [alerts, searches, distribution, content].filter(Boolean) as RetentionFeatureRank[];

  // Sort by metric value descending, assign ranks
  features.sort((a, b) => b.metricValue - a.metricValue);
  features.forEach((f, i) => (f.rank = i + 1));

  return features;
}

// ─── Alert retention ─────────────────────────────────────────────────────────

async function getAlertRetention(): Promise<RetentionFeatureRank | null> {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        COUNT(*)::int AS total_alerts,
        COUNT(*) FILTER (WHERE "triggeredAt" IS NOT NULL)::int AS triggered,
        COUNT(DISTINCT "email")::int AS unique_users
      FROM price_alerts
      WHERE "createdAt" > NOW() - INTERVAL '30 days'
    `;

    const r = rows[0] || {};
    const total = r.total_alerts ?? 0;
    const triggered = r.triggered ?? 0;
    const rate = total > 0 ? Math.round((triggered / total) * 100) : 0;

    return {
      feature: "alerts",
      label: "Alertas de Preco",
      description: `${r.unique_users ?? 0} usuarios criaram ${total} alertas nos ultimos 30 dias`,
      metricValue: total,
      metricLabel: "alertas criados",
      conversionRate: rate,
      rank: 0,
    };
  } catch {
    return {
      feature: "alerts",
      label: "Alertas de Preco",
      description: "Sem dados de alertas disponiveis",
      metricValue: 0,
      metricLabel: "alertas criados",
      conversionRate: 0,
      rank: 0,
    };
  }
}

// ─── Search-driven retention ─────────────────────────────────────────────────

async function getSearchRetention(): Promise<RetentionFeatureRank | null> {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        COUNT(*)::int AS total_searches,
        COUNT(*) FILTER (WHERE "clickedProductId" IS NOT NULL)::int AS with_click,
        COUNT(DISTINCT "normalizedQuery")::int AS unique_queries
      FROM search_logs
      WHERE "createdAt" > NOW() - INTERVAL '30 days'
    `;

    const r = rows[0] || {};
    const total = r.total_searches ?? 0;
    const withClick = r.with_click ?? 0;
    const rate = total > 0 ? Math.round((withClick / total) * 100) : 0;

    return {
      feature: "search",
      label: "Busca no Site",
      description: `${r.unique_queries ?? 0} termos distintos, ${total} buscas nos ultimos 30 dias`,
      metricValue: total,
      metricLabel: "buscas realizadas",
      conversionRate: rate,
      rank: 0,
    };
  } catch {
    return {
      feature: "search",
      label: "Busca no Site",
      description: "Sem dados de buscas disponiveis",
      metricValue: 0,
      metricLabel: "buscas realizadas",
      conversionRate: 0,
      rank: 0,
    };
  }
}

// ─── Distribution channel retention ──────────────────────────────────────────

async function getDistributionRetention(): Promise<RetentionFeatureRank | null> {
  try {
    // Clickouts that came from distribution channels (referrer-based)
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        COUNT(*)::int AS total_clickouts,
        COUNT(*) FILTER (WHERE "referrer" IS NOT NULL AND "referrer" != '')::int AS from_referrer,
        COUNT(*) FILTER (WHERE "sourceSlug" IS NOT NULL)::int AS with_source
      FROM clickouts
      WHERE "clickedAt" > NOW() - INTERVAL '30 days'
    `;

    const r = rows[0] || {};
    const total = r.total_clickouts ?? 0;
    const fromReferrer = r.from_referrer ?? 0;
    const rate = total > 0 ? Math.round((fromReferrer / total) * 100) : 0;

    return {
      feature: "distribution",
      label: "Canais de Distribuicao",
      description: `${fromReferrer} clickouts vieram de canais rastreados de ${total} total`,
      metricValue: fromReferrer,
      metricLabel: "clickouts rastreados",
      conversionRate: rate,
      rank: 0,
    };
  } catch {
    return {
      feature: "distribution",
      label: "Canais de Distribuicao",
      description: "Sem dados de distribuicao disponiveis",
      metricValue: 0,
      metricLabel: "clickouts rastreados",
      conversionRate: 0,
      rank: 0,
    };
  }
}

// ─── Content-driven retention ────────────────────────────────────────────────

async function getContentRetention(): Promise<RetentionFeatureRank | null> {
  try {
    // Articles and guides
    const articleCount = await prisma.article.count({
      where: { status: "PUBLISHED" },
    });

    // Clickouts from article/guide referrers
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        COUNT(*)::int AS content_clickouts
      FROM clickouts
      WHERE "clickedAt" > NOW() - INTERVAL '30 days'
        AND ("referrer" LIKE '%/guia/%' OR "referrer" LIKE '%/artigo/%' OR "referrer" LIKE '%/comparar/%')
    `;

    const contentClickouts = rows[0]?.content_clickouts ?? 0;

    return {
      feature: "content",
      label: "Conteudo Editorial",
      description: `${articleCount} artigos publicados geraram ${contentClickouts} clickouts nos ultimos 30 dias`,
      metricValue: contentClickouts,
      metricLabel: "clickouts de conteudo",
      conversionRate: articleCount > 0 ? Math.round((contentClickouts / articleCount) * 100) : 0,
      rank: 0,
    };
  } catch {
    return {
      feature: "content",
      label: "Conteudo Editorial",
      description: "Sem dados de conteudo disponiveis",
      metricValue: 0,
      metricLabel: "clickouts de conteudo",
      conversionRate: 0,
      rank: 0,
    };
  }
}
