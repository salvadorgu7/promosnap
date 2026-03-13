// ============================================
// CLOSED-LOOP OPS — measure execution outcomes
// ============================================

import prisma from "@/lib/db/prisma";
import { getExecutions } from "./engine";
import type { ExecutionRecord, ExecutionType } from "./types";
import { getAllAttributionEntries } from "@/lib/attribution/engine";

// ─── Types ──────────────────────────────────────────────────────────────────

export type OutcomeStatus = "measured" | "pending" | "unknown";

export interface ClosedLoopEntry {
  execution: ExecutionRecord;
  outcome: OutcomeStatus;
  outcomeDetails: Record<string, unknown>;
}

export interface ExecutionEffectiveness {
  totalExecuted: number;
  successRate: number;
  measuredOutcomeRate: number;
  avgTimeToOutcomeMs: number | null;
  byType: Record<string, { total: number; measured: number; successRate: number }>;
}

export interface ExecutionROIEntry {
  type: ExecutionType;
  executionsCount: number;
  attributedClickouts: number;
  estimatedRevenue: number;
}

// ─── Closed-Loop View ───────────────────────────────────────────────────────

export async function getClosedLoopView(limit = 20): Promise<ClosedLoopEntry[]> {
  const executions = getExecutions({ status: "success", limit });
  const entries: ClosedLoopEntry[] = [];

  for (const exec of executions) {
    try {
      const entry = await measureOutcome(exec);
      entries.push(entry);
    } catch {
      entries.push({
        execution: exec,
        outcome: "unknown",
        outcomeDetails: { error: "Could not measure outcome" },
      });
    }
  }

  return entries;
}

async function measureOutcome(exec: ExecutionRecord): Promise<ClosedLoopEntry> {
  switch (exec.type) {
    case "create_banner":
    case "create_campaign":
      return measureBannerOutcome(exec);
    case "feature_product":
      return measureFeatureOutcome(exec);
    case "publish_distribution":
      return measureDistributionOutcome(exec);
    default:
      return {
        execution: exec,
        outcome: "unknown",
        outcomeDetails: { note: "No outcome measurement for this type" },
      };
  }
}

async function measureBannerOutcome(exec: ExecutionRecord): Promise<ClosedLoopEntry> {
  const bannerId = exec.result?.bannerId as string | undefined;
  if (!bannerId) {
    return { execution: exec, outcome: "unknown", outcomeDetails: {} };
  }

  try {
    const banner = await prisma.banner.findUnique({
      where: { id: bannerId },
      select: { id: true, isActive: true, title: true },
    });

    if (!banner) {
      return {
        execution: exec,
        outcome: "unknown",
        outcomeDetails: { note: "Banner not found" },
      };
    }

    // Check attribution data for clickouts from this banner
    const attributionEntries = getAllAttributionEntries(30);
    const bannerClickouts = attributionEntries.filter(
      (e) => e.context.bannerId === bannerId
    ).length;

    return {
      execution: exec,
      outcome: "measured",
      outcomeDetails: {
        bannerId: banner.id,
        isActive: banner.isActive,
        displayed: banner.isActive,
        title: banner.title,
        attributedClickouts: bannerClickouts,
        estimatedRevenue: Math.round(bannerClickouts * 150 * 0.03 * 100) / 100,
      },
    };
  } catch {
    return { execution: exec, outcome: "unknown", outcomeDetails: {} };
  }
}

async function measureFeatureOutcome(exec: ExecutionRecord): Promise<ClosedLoopEntry> {
  const productId = exec.result?.productId as string | undefined;
  if (!productId) {
    return { execution: exec, outcome: "unknown", outcomeDetails: {} };
  }

  try {
    const executionDate = exec.completedAt || exec.createdAt;
    const beforeDate = new Date(executionDate);
    const afterDate = new Date();

    // Count clickouts before and after featuring (through offer -> listing -> product)
    const [clickoutsBefore, clickoutsAfter] = await Promise.all([
      prisma.clickout.count({
        where: {
          offer: { listing: { productId } },
          clickedAt: {
            gte: new Date(beforeDate.getTime() - 7 * 24 * 60 * 60 * 1000),
            lt: beforeDate,
          },
        },
      }),
      prisma.clickout.count({
        where: {
          offer: { listing: { productId } },
          clickedAt: { gte: beforeDate, lte: afterDate },
        },
      }),
    ]);

    const daysSinceExec = Math.max(
      1,
      (afterDate.getTime() - beforeDate.getTime()) / (24 * 60 * 60 * 1000)
    );

    // Need at least 1 day to measure
    if (daysSinceExec < 1) {
      return {
        execution: exec,
        outcome: "pending",
        outcomeDetails: {
          productId,
          note: "Too early to measure — less than 1 day",
          clickoutsBefore,
        },
      };
    }

    const clickoutsBeforeDaily = clickoutsBefore / 7;
    const clickoutsAfterDaily = clickoutsAfter / daysSinceExec;
    const improvement =
      clickoutsBeforeDaily > 0
        ? Math.round(((clickoutsAfterDaily - clickoutsBeforeDaily) / clickoutsBeforeDaily) * 100)
        : clickoutsAfter > 0
        ? 100
        : 0;

    // Check attribution data for this product
    const attributionEntries = getAllAttributionEntries(30);
    const productAttributedClickouts = attributionEntries.filter(
      (e) => e.context.productId === productId
    ).length;

    return {
      execution: exec,
      outcome: "measured",
      outcomeDetails: {
        productId,
        clickoutsBefore,
        clickoutsAfter,
        clickoutsBeforeDaily: Math.round(clickoutsBeforeDaily * 10) / 10,
        clickoutsAfterDaily: Math.round(clickoutsAfterDaily * 10) / 10,
        improvementPercent: improvement,
        daysMeasured: Math.round(daysSinceExec * 10) / 10,
        attributedClickouts: productAttributedClickouts,
        estimatedRevenue: Math.round(clickoutsAfter * 150 * 0.03 * 100) / 100,
      },
    };
  } catch {
    return { execution: exec, outcome: "unknown", outcomeDetails: {} };
  }
}

async function measureDistributionOutcome(exec: ExecutionRecord): Promise<ClosedLoopEntry> {
  const channel = exec.result?.channel as string | undefined;
  const offersDistributed = exec.result?.offersDistributed as number | undefined;

  if (!channel) {
    return { execution: exec, outcome: "unknown", outcomeDetails: {} };
  }

  try {
    const executionDate = exec.completedAt || exec.createdAt;

    // Check if there were clickouts from this channel after distribution
    const clickoutsAfter = await prisma.clickout.count({
      where: {
        clickedAt: { gte: executionDate },
        ...(channel !== "homepage" ? { sourceSlug: channel } : {}),
      },
    });

    // Also check attribution data for clickouts from this channel
    const attributionEntries = getAllAttributionEntries(30);
    const channelAttributed = attributionEntries.filter(
      (e) => e.context.channelOrigin === channel
    ).length;

    if (clickoutsAfter > 0) {
      return {
        execution: exec,
        outcome: "measured",
        outcomeDetails: {
          channel,
          offersDistributed: offersDistributed ?? 0,
          clickoutsAfterDistribution: clickoutsAfter,
          attributedClickouts: channelAttributed,
          hasConversion: true,
          estimatedRevenue: Math.round(clickoutsAfter * 150 * 0.03 * 100) / 100,
        },
      };
    }

    // If less than 24h since execution, still pending
    const hoursSince =
      (Date.now() - new Date(executionDate).getTime()) / (60 * 60 * 1000);

    if (hoursSince < 24) {
      return {
        execution: exec,
        outcome: "pending",
        outcomeDetails: {
          channel,
          offersDistributed: offersDistributed ?? 0,
          note: "Less than 24h since distribution — still measuring",
        },
      };
    }

    return {
      execution: exec,
      outcome: "measured",
      outcomeDetails: {
        channel,
        offersDistributed: offersDistributed ?? 0,
        clickoutsAfterDistribution: 0,
        hasConversion: false,
      },
    };
  } catch {
    return { execution: exec, outcome: "unknown", outcomeDetails: {} };
  }
}

// ─── Effectiveness aggregation ──────────────────────────────────────────────

export async function getExecutionEffectiveness(): Promise<ExecutionEffectiveness> {
  const allExecutions = getExecutions({ limit: 500 });
  const closedLoop = await getClosedLoopView(100);

  const totalExecuted = allExecutions.length;
  const successCount = allExecutions.filter((e) => e.status === "success").length;
  const successRate = totalExecuted > 0 ? Math.round((successCount / totalExecuted) * 100) : 0;

  const measuredCount = closedLoop.filter((e) => e.outcome === "measured").length;
  const measuredBase = closedLoop.length;
  const measuredOutcomeRate =
    measuredBase > 0 ? Math.round((measuredCount / measuredBase) * 100) : 0;

  // Avg time to outcome for measured entries
  const timesMs: number[] = [];
  for (const entry of closedLoop) {
    if (entry.outcome === "measured" && entry.execution.completedAt) {
      const created = new Date(entry.execution.createdAt).getTime();
      const completed = new Date(entry.execution.completedAt).getTime();
      timesMs.push(completed - created);
    }
  }
  const avgTimeToOutcomeMs =
    timesMs.length > 0
      ? Math.round(timesMs.reduce((a, b) => a + b, 0) / timesMs.length)
      : null;

  // By type
  const byType: Record<string, { total: number; measured: number; successRate: number }> = {};
  for (const exec of allExecutions) {
    if (!byType[exec.type]) {
      byType[exec.type] = { total: 0, measured: 0, successRate: 0 };
    }
    byType[exec.type].total++;
    if (exec.status === "success") {
      byType[exec.type].successRate++;
    }
  }
  for (const entry of closedLoop) {
    if (entry.outcome === "measured" && byType[entry.execution.type]) {
      byType[entry.execution.type].measured++;
    }
  }
  // Convert successRate count to percentage
  for (const key of Object.keys(byType)) {
    const t = byType[key];
    t.successRate = t.total > 0 ? Math.round((t.successRate / t.total) * 100) : 0;
  }

  return {
    totalExecuted,
    successRate,
    measuredOutcomeRate,
    avgTimeToOutcomeMs,
    byType,
  };
}

// ─── Execution ROI ──────────────────────────────────────────────────────────

const AVG_TICKET = 150;
const DEFAULT_COMMISSION = 0.03;

/**
 * Estimated revenue generated by each execution type,
 * based on attribution data and clickout counts.
 */
export async function getExecutionROI(): Promise<ExecutionROIEntry[]> {
  const closedLoop = await getClosedLoopView(200);
  const attributionEntries = getAllAttributionEntries(30);

  // Aggregate by execution type
  const byType: Record<string, { count: number; clickouts: number }> = {};

  for (const entry of closedLoop) {
    const type = entry.execution.type;
    if (!byType[type]) {
      byType[type] = { count: 0, clickouts: 0 };
    }
    byType[type].count++;

    // Extract clickout counts from outcome details
    const details = entry.outcomeDetails;
    if (typeof details.clickoutsAfterDistribution === "number") {
      byType[type].clickouts += details.clickoutsAfterDistribution;
    } else if (typeof details.clickoutsAfter === "number") {
      byType[type].clickouts += details.clickoutsAfter as number;
    } else if (typeof details.attributedClickouts === "number") {
      byType[type].clickouts += details.attributedClickouts as number;
    }
  }

  // Also check attribution entries for banner/product/channel executions
  const bannerClickouts = attributionEntries.filter(
    (e) => e.context.bannerId
  ).length;
  if (byType["create_banner"]) {
    byType["create_banner"].clickouts = Math.max(
      byType["create_banner"].clickouts,
      bannerClickouts
    );
  }

  return Object.entries(byType).map(([type, data]) => ({
    type: type as ExecutionType,
    executionsCount: data.count,
    attributedClickouts: data.clickouts,
    estimatedRevenue:
      Math.round(data.clickouts * AVG_TICKET * DEFAULT_COMMISSION * 100) / 100,
  })).sort((a, b) => b.estimatedRevenue - a.estimatedRevenue);
}
