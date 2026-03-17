// ============================================
// REVENUE ATTRIBUTION — revenue by attribution dimension
// ============================================

import prisma from "@/lib/db/prisma";
import {
  getAllAttributionEntries,
  getAttributionSummary,
} from "./engine";
import type { AttributionEntry } from "./engine";

// ─── Revenue Rates (mirrors existing convention) ────────────────────────────

const REVENUE_RATES: Record<string, number> = {
  "amazon-br": 0.04,
  amazon: 0.04,
  mercadolivre: 0.03,
  "mercado-livre": 0.03,
  shopee: 0.025,
  shein: 0.03,
  magazineluiza: 0.035,
  americanas: 0.03,
  casasbahia: 0.03,
};

const DEFAULT_RATE = 0.03;
const DEFAULT_AVG_TICKET = 150; // R$

function getRate(source: string | undefined): number {
  if (!source) return DEFAULT_RATE;
  return REVENUE_RATES[source] ?? DEFAULT_RATE;
}

function estimateRevenue(count: number, source?: string): number {
  return Math.round(count * DEFAULT_AVG_TICKET * getRate(source) * 100) / 100;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RevenueAttribution {
  dimension: string;
  key: string;
  clickouts: number;
  estimatedRevenue: number;
}

export interface TopPerformingPage {
  pageType: string;
  clickouts: number;
  estimatedRevenue: number;
  share: number; // percentage
}

export interface ChannelROI {
  channel: string;
  distributionsSent: number;
  clickoutsGenerated: number;
  estimatedRevenue: number;
  roi: number; // clickouts per distribution
}

// ─── Revenue by Attribution ────────────────────────────────────────────────

export async function getRevenueByAttribution(days = 7): Promise<{
  bySource: RevenueAttribution[];
  byPageType: RevenueAttribution[];
  byChannel: RevenueAttribution[];
  byCampaign: RevenueAttribution[];
  byBanner: RevenueAttribution[];
  totalEstimatedRevenue: number;
}> {
  const summary = await getAttributionSummary(days);

  const bySource: RevenueAttribution[] = Object.entries(summary.bySource).map(
    ([key, count]) => ({
      dimension: "source",
      key,
      clickouts: count,
      estimatedRevenue: estimateRevenue(count, key),
    })
  );

  const byPageType: RevenueAttribution[] = Object.entries(
    summary.byPageType
  ).map(([key, count]) => ({
    dimension: "pageType",
    key,
    clickouts: count,
    estimatedRevenue: estimateRevenue(count),
  }));

  const byChannel: RevenueAttribution[] = Object.entries(
    summary.byChannel
  ).map(([key, count]) => ({
    dimension: "channel",
    key,
    clickouts: count,
    estimatedRevenue: estimateRevenue(count),
  }));

  const byCampaign: RevenueAttribution[] = Object.entries(
    summary.byCampaign
  ).map(([key, count]) => ({
    dimension: "campaign",
    key,
    clickouts: count,
    estimatedRevenue: estimateRevenue(count),
  }));

  const byBanner: RevenueAttribution[] = Object.entries(
    summary.byBanner
  ).map(([key, count]) => ({
    dimension: "banner",
    key,
    clickouts: count,
    estimatedRevenue: estimateRevenue(count),
  }));

  const totalEstimatedRevenue = bySource.reduce(
    (sum, r) => sum + r.estimatedRevenue,
    0
  );

  return {
    bySource: bySource.sort((a, b) => b.clickouts - a.clickouts),
    byPageType: byPageType.sort((a, b) => b.clickouts - a.clickouts),
    byChannel: byChannel.sort((a, b) => b.clickouts - a.clickouts),
    byCampaign: byCampaign.sort((a, b) => b.clickouts - a.clickouts),
    byBanner: byBanner.sort((a, b) => b.clickouts - a.clickouts),
    totalEstimatedRevenue:
      Math.round(totalEstimatedRevenue * 100) / 100,
  };
}

// ─── Top Performing Pages ──────────────────────────────────────────────────

export async function getTopPerformingPages(limit = 10): Promise<TopPerformingPage[]> {
  const entries = await getAllAttributionEntries(30);
  const byPageType: Record<string, number> = {};

  for (const entry of entries) {
    const pt = entry.context.pageType || "unknown";
    byPageType[pt] = (byPageType[pt] || 0) + 1;
  }

  const total = entries.length || 1;

  return Object.entries(byPageType)
    .map(([pageType, clickouts]) => ({
      pageType,
      clickouts,
      estimatedRevenue: estimateRevenue(clickouts),
      share: Math.round((clickouts / total) * 1000) / 10,
    }))
    .sort((a, b) => b.clickouts - a.clickouts)
    .slice(0, limit);
}

// ─── Channel ROI ────────────────────────────────────────────────────────────

export async function getChannelROI(): Promise<ChannelROI[]> {
  const entries = await getAllAttributionEntries(30);
  const channels: Record<string, number> = {};

  for (const entry of entries) {
    const ch = entry.context.channelOrigin || "direct";
    channels[ch] = (channels[ch] || 0) + 1;
  }

  // Estimate distributions sent per channel from execution store
  let distributionEstimates: Record<string, number> = {};
  try {
    const { getExecutions } = await import("@/lib/execution/engine");
    const executions = getExecutions({
      type: "publish_distribution",
      limit: 200,
    });
    for (const exec of executions) {
      if (exec.status === "success") {
        const channel = (exec.result?.channel as string) || "homepage";
        distributionEstimates[channel] =
          (distributionEstimates[channel] || 0) + 1;
      }
    }
  } catch {
    // execution engine not available, use empty estimates
    distributionEstimates = {};
  }

  return Object.entries(channels).map(([channel, clickouts]) => {
    const distsSent = distributionEstimates[channel] || 0;
    return {
      channel,
      distributionsSent: distsSent,
      clickoutsGenerated: clickouts,
      estimatedRevenue: estimateRevenue(clickouts),
      roi: distsSent > 0 ? Math.round((clickouts / distsSent) * 100) / 100 : 0,
    };
  }).sort((a, b) => b.clickoutsGenerated - a.clickoutsGenerated);
}
