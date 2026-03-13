/**
 * Measurement & Tracking Module
 *
 * Tracks execution outcomes, clickout attribution, conversion funnels,
 * and identifies measurement gaps across the platform.
 */

import prisma from "@/lib/db/prisma";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ExecutionType =
  | "job"
  | "import"
  | "publish"
  | "distribution"
  | "automation"
  | "manual";

export type ExecutionResult = "success" | "partial" | "failed";

export interface ExecutionRecord {
  executionId: string;
  type: ExecutionType;
  result: ExecutionResult;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface ClickoutAttribution {
  clickoutId: string;
  source: string;
  category: string | null;
  productId: string | null;
  timestamp: string;
}

export interface FunnelStep {
  stage: string;
  count: number;
}

export interface ConversionFunnel {
  period: string;
  byCategory: Record<string, FunnelStep[]>;
  bySource: Record<string, FunnelStep[]>;
  overall: FunnelStep[];
}

export interface MeasurementGap {
  area: string;
  description: string;
  impact: "high" | "medium" | "low";
  recommendation: string;
}

// ─── In-Memory Execution Log ────────────────────────────────────────────────
// Uses in-memory store for lightweight tracking without schema changes.
// In production, this would be persisted to a dedicated analytics table.

const executionLog: ExecutionRecord[] = [];
const MAX_LOG_SIZE = 500;

/**
 * Track an execution outcome (job, import, publish, etc.)
 */
export function trackExecution(
  executionId: string,
  type: ExecutionType,
  result: ExecutionResult,
  details?: Record<string, unknown>
): void {
  executionLog.push({
    executionId,
    type,
    result,
    timestamp: new Date().toISOString(),
    details,
  });

  // Keep log bounded
  if (executionLog.length > MAX_LOG_SIZE) {
    executionLog.splice(0, executionLog.length - MAX_LOG_SIZE);
  }
}

/**
 * Get recent execution records, optionally filtered by type.
 */
export function getRecentExecutions(
  limit = 50,
  type?: ExecutionType
): ExecutionRecord[] {
  const filtered = type
    ? executionLog.filter((e) => e.type === type)
    : executionLog;
  return filtered.slice(-limit).reverse();
}

// ─── Clickout Attribution ───────────────────────────────────────────────────

const clickoutAttributionLog: ClickoutAttribution[] = [];

/**
 * Track enhanced clickout attribution for better conversion analysis.
 */
export function trackClickoutConversion(
  clickoutId: string,
  source: string,
  category: string | null,
  productId: string | null
): void {
  clickoutAttributionLog.push({
    clickoutId,
    source,
    category,
    productId,
    timestamp: new Date().toISOString(),
  });

  if (clickoutAttributionLog.length > MAX_LOG_SIZE) {
    clickoutAttributionLog.splice(
      0,
      clickoutAttributionLog.length - MAX_LOG_SIZE
    );
  }
}

// ─── Conversion Funnel ──────────────────────────────────────────────────────

/**
 * Returns the conversion funnel: impressions -> clicks -> clickouts -> estimated revenue.
 * Uses real database data for clickouts, and estimates for other stages.
 */
export async function getConversionFunnel(): Promise<ConversionFunnel> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

  try {
    // Get active products (proxy for impressions)
    const activeProducts = await prisma.product.count({
      where: { status: "ACTIVE" },
    });

    // Get active offers (proxy for available clicks)
    const activeOffers = await prisma.offer.count({
      where: { isActive: true },
    });

    // Get clickouts in last 7 days
    const clickouts7d = await prisma.clickout.count({
      where: { clickedAt: { gte: sevenDaysAgo } },
    });

    // Get clickouts by source
    const clickoutsBySource = await prisma.clickout.groupBy({
      by: ["sourceSlug"],
      where: { clickedAt: { gte: sevenDaysAgo } },
      _count: { id: true },
    });

    // Get clickouts by category
    const clickoutsByCategory = await prisma.clickout.groupBy({
      by: ["categorySlug"],
      where: {
        clickedAt: { gte: sevenDaysAgo },
        categorySlug: { not: null },
      },
      _count: { id: true },
    });

    // Build per-source funnel
    const bySource: Record<string, FunnelStep[]> = {};
    for (const row of clickoutsBySource) {
      const slug = row.sourceSlug || "unknown";
      bySource[slug] = [
        { stage: "clickouts", count: row._count.id },
        {
          stage: "estimated_revenue",
          count: Math.round(row._count.id * 0.03 * 150),
        }, // estimate
      ];
    }

    // Build per-category funnel
    const byCategory: Record<string, FunnelStep[]> = {};
    for (const row of clickoutsByCategory) {
      const slug = row.categorySlug || "uncategorized";
      byCategory[slug] = [
        { stage: "clickouts", count: row._count.id },
        {
          stage: "estimated_revenue",
          count: Math.round(row._count.id * 0.03 * 150),
        },
      ];
    }

    // Overall funnel
    const overall: FunnelStep[] = [
      { stage: "produtos_ativos", count: activeProducts },
      { stage: "ofertas_ativas", count: activeOffers },
      { stage: "clickouts_7d", count: clickouts7d },
      {
        stage: "revenue_estimado_7d",
        count: Math.round(clickouts7d * 0.03 * 150),
      },
    ];

    return {
      period: "7d",
      byCategory,
      bySource,
      overall,
    };
  } catch (error) {
    console.error("[measurement] Error building conversion funnel:", error);
    return {
      period: "7d",
      byCategory: {},
      bySource: {},
      overall: [
        { stage: "produtos_ativos", count: 0 },
        { stage: "ofertas_ativas", count: 0 },
        { stage: "clickouts_7d", count: 0 },
        { stage: "revenue_estimado_7d", count: 0 },
      ],
    };
  }
}

// ─── Measurement Gaps ───────────────────────────────────────────────────────

/**
 * Identifies what's not being tracked and what measurement gaps exist.
 */
export function getMeasurementGaps(): MeasurementGap[] {
  const gaps: MeasurementGap[] = [];

  // Check for conversion tracking gap
  gaps.push({
    area: "Conversao pos-clickout",
    description:
      "Nao ha callback de conversao dos programas de afiliados. Revenue e estimado baseado em clickouts, nao confirmado.",
    impact: "high",
    recommendation:
      "Integrar postback/callback de conversao com cada programa de afiliados (Amazon Associates, ML Afiliados, etc.)",
  });

  // Check for page analytics gap
  if (!process.env.NEXT_PUBLIC_GA_ID) {
    gaps.push({
      area: "Analytics de pagina",
      description:
        "NEXT_PUBLIC_GA_ID nao configurado. Sem metricas de pageview, bounce rate, tempo na pagina.",
      impact: "high",
      recommendation:
        "Configurar Google Analytics ou Plausible para metricas de comportamento do usuario.",
    });
  }

  // Check for attribution gaps
  gaps.push({
    area: "Atribuicao de clickout",
    description:
      "Clickouts registram sourceSlug e categorySlug, mas nao rastreiam campanha, UTM ou sessao do usuario de forma completa.",
    impact: "medium",
    recommendation:
      "Adicionar UTM parsing e session tracking para melhor atribuicao de conversoes.",
  });

  // Check for search analytics
  gaps.push({
    area: "Analytics de busca",
    description:
      "SearchLog existe no schema mas endpoint de busca esta desconectado. Termos buscados nao sao registrados.",
    impact: "medium",
    recommendation:
      "Conectar /api/search ao banco e registrar SearchLog para entender demanda do usuario.",
  });

  // Price tracking completeness
  gaps.push({
    area: "Historico de precos",
    description:
      "PriceSnapshot existe mas /api/price-history retorna vazio. Sem visualizacao de tendencia de precos para o usuario.",
    impact: "medium",
    recommendation:
      "Conectar endpoint de price-history ao banco e garantir que job de precos salva snapshots regularmente.",
  });

  // Distribution effectiveness
  gaps.push({
    area: "Efetividade de distribuicao",
    description:
      "Distribuicao via Telegram existe mas sem tracking de open rate ou click-through do canal.",
    impact: "low",
    recommendation:
      "Adicionar UTM links nas distribuicoes e rastrear CTR por canal de distribuicao.",
  });

  // Alert effectiveness
  gaps.push({
    area: "Efetividade de alertas",
    description:
      "Alertas de preco disparam mas sem tracking de re-engajamento (usuario voltou e comprou?).",
    impact: "low",
    recommendation:
      "Rastrear clickouts originados de emails de alerta para medir efetividade.",
  });

  return gaps;
}
