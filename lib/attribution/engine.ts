// ============================================
// ATTRIBUTION ENGINE — clickout attribution tracking
// ============================================

// ─── Types ──────────────────────────────────────────────────────────────────

export type PageType =
  | "home"
  | "search"
  | "product"
  | "category"
  | "brand"
  | "offer"
  | "guide"
  | "comparison"
  | "email"
  | "channel";

export type ChannelOrigin =
  | "direct"
  | "telegram"
  | "whatsapp"
  | "email"
  | "slack"
  | "discord"
  | "referral";

export interface AttributionContext {
  source: string;
  category: string;
  productId: string;
  pageType: PageType;
  campaignId?: string;
  bannerId?: string;
  channelOrigin?: ChannelOrigin;
  referralCode?: string;
}

export interface AttributionEntry {
  clickoutId: string;
  context: Partial<AttributionContext>;
  timestamp: string;
}

export interface AttributionSummary {
  bySource: Record<string, number>;
  byPageType: Record<string, number>;
  byChannel: Record<string, number>;
  byCampaign: Record<string, number>;
  byBanner: Record<string, number>;
  total: number;
  period: string;
}

export interface AttributionFunnelStep {
  stage: string;
  count: number;
  byDimension?: Record<string, number>;
}

export interface AttributionFunnel {
  steps: AttributionFunnelStep[];
  period: string;
}

// ─── In-Memory Store ────────────────────────────────────────────────────────

const attributionStore = new Map<string, AttributionEntry>();
const MAX_STORE_SIZE = 2000;

/**
 * Enrich a clickout with attribution context.
 */
export function enrichClickoutAttribution(
  clickoutId: string,
  context: Partial<AttributionContext>
): void {
  // If store is at capacity, remove oldest entries
  if (attributionStore.size >= MAX_STORE_SIZE) {
    const entries = Array.from(attributionStore.keys());
    const toRemove = entries.slice(0, Math.floor(MAX_STORE_SIZE / 4));
    for (const key of toRemove) {
      attributionStore.delete(key);
    }
  }

  attributionStore.set(clickoutId, {
    clickoutId,
    context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get attribution data for a specific clickout.
 */
export function getAttributionForClickout(
  clickoutId: string
): AttributionEntry | null {
  return attributionStore.get(clickoutId) ?? null;
}

/**
 * Get all attribution entries, optionally filtered by days.
 */
export function getAllAttributionEntries(days?: number): AttributionEntry[] {
  const entries = Array.from(attributionStore.values());
  if (!days) return entries;

  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  return entries.filter((e) => e.timestamp >= cutoff);
}

/**
 * Aggregate attribution data by source, pageType, channel, campaign.
 */
export function getAttributionSummary(days = 7): AttributionSummary {
  const entries = getAllAttributionEntries(days);

  const bySource: Record<string, number> = {};
  const byPageType: Record<string, number> = {};
  const byChannel: Record<string, number> = {};
  const byCampaign: Record<string, number> = {};
  const byBanner: Record<string, number> = {};

  for (const entry of entries) {
    const ctx = entry.context;

    if (ctx.source) {
      bySource[ctx.source] = (bySource[ctx.source] || 0) + 1;
    }
    if (ctx.pageType) {
      byPageType[ctx.pageType] = (byPageType[ctx.pageType] || 0) + 1;
    }
    if (ctx.channelOrigin) {
      byChannel[ctx.channelOrigin] = (byChannel[ctx.channelOrigin] || 0) + 1;
    }
    if (ctx.campaignId) {
      byCampaign[ctx.campaignId] = (byCampaign[ctx.campaignId] || 0) + 1;
    }
    if (ctx.bannerId) {
      byBanner[ctx.bannerId] = (byBanner[ctx.bannerId] || 0) + 1;
    }
  }

  return {
    bySource,
    byPageType,
    byChannel,
    byCampaign,
    byBanner,
    total: entries.length,
    period: `${days}d`,
  };
}

/**
 * Full attribution funnel: page views -> clicks -> clickouts -> estimated revenue.
 * Broken down by dimension.
 */
export function getAttributionFunnel(): AttributionFunnel {
  const entries = getAllAttributionEntries(7);
  const totalClickouts = entries.length;

  // Estimate page views as 20x clickouts (typical 5% CTR)
  const estimatedPageViews = totalClickouts * 20;

  // Estimate clicks as 3x clickouts (not all clicks lead to clickout)
  const estimatedClicks = totalClickouts * 3;

  // Estimate revenue: avg R$150 ticket * 3% commission per clickout
  const estimatedRevenue = Math.round(totalClickouts * 150 * 0.03);

  // Break down clickouts by pageType
  const byPageType: Record<string, number> = {};
  const byChannel: Record<string, number> = {};
  const bySource: Record<string, number> = {};

  for (const entry of entries) {
    const ctx = entry.context;
    if (ctx.pageType) {
      byPageType[ctx.pageType] = (byPageType[ctx.pageType] || 0) + 1;
    }
    if (ctx.channelOrigin) {
      byChannel[ctx.channelOrigin] = (byChannel[ctx.channelOrigin] || 0) + 1;
    }
    if (ctx.source) {
      bySource[ctx.source] = (bySource[ctx.source] || 0) + 1;
    }
  }

  return {
    steps: [
      {
        stage: "page_views_estimado",
        count: estimatedPageViews,
        byDimension: Object.fromEntries(
          Object.entries(byPageType).map(([k, v]) => [k, v * 20])
        ),
      },
      {
        stage: "clicks_estimado",
        count: estimatedClicks,
        byDimension: Object.fromEntries(
          Object.entries(byPageType).map(([k, v]) => [k, v * 3])
        ),
      },
      {
        stage: "clickouts",
        count: totalClickouts,
        byDimension: byPageType,
      },
      {
        stage: "revenue_estimado",
        count: estimatedRevenue,
        byDimension: Object.fromEntries(
          Object.entries(bySource).map(([k, v]) => [
            k,
            Math.round(v * 150 * 0.03),
          ])
        ),
      },
    ],
    period: "7d",
  };
}
