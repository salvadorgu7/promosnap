import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logger"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RetentionMetrics {
  /** Estimated returning users based on clickout patterns */
  returningUsers: number;
  /** Total unique users (by session/email) */
  totalUniqueUsers: number;
  /** Return rate percentage */
  returnRate: number;

  /** Alert-to-clickout conversion: alerts triggered → clickouts */
  alertTriggered: number;
  alertClickouts: number;
  alertConversionRate: number;

  /** Avg alerts per user (PriceAlert grouped by email) */
  avgAlertsPerUser: number;
  totalAlertUsers: number;

  /** Recurring clickout rate (same offer, multiple dates) */
  recurringClickouts: number;
  totalClickouts: number;
  recurringRate: number;
}

// ─── Main function ───────────────────────────────────────────────────────────

/**
 * Get retention metrics from real DB data.
 * Uses clickout patterns, alerts, and session data to estimate retention.
 */
export async function getRetentionMetrics(): Promise<RetentionMetrics> {
  const [
    returningData,
    alertData,
    alertPerUser,
    recurringData,
  ] = await Promise.all([
    getReturningUserData(),
    getAlertConversionData(),
    getAlertPerUserData(),
    getRecurringClickoutData(),
  ]);

  return {
    ...returningData,
    ...alertData,
    ...alertPerUser,
    ...recurringData,
  };
}

// ─── Returning users ─────────────────────────────────────────────────────────

async function getReturningUserData(): Promise<{
  returningUsers: number;
  totalUniqueUsers: number;
  returnRate: number;
}> {
  try {
    // Users who clicked out on more than one distinct day in last 30 days
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        COUNT(*)::int AS total_users,
        COUNT(*) FILTER (WHERE day_count > 1)::int AS returning_users
      FROM (
        SELECT
          COALESCE("sessionId", "userAgent") AS user_id,
          COUNT(DISTINCT DATE("clickedAt")) AS day_count
        FROM clickouts
        WHERE "clickedAt" > NOW() - INTERVAL '30 days'
          AND ("sessionId" IS NOT NULL OR "userAgent" IS NOT NULL)
        GROUP BY user_id
      ) user_days
    `;

    const r = rows[0] || {};
    const total = r.total_users ?? 0;
    const returning = r.returning_users ?? 0;

    return {
      returningUsers: returning,
      totalUniqueUsers: total,
      returnRate: total > 0 ? Math.round((returning / total) * 100) : 0,
    };
  } catch {
    return { returningUsers: 0, totalUniqueUsers: 0, returnRate: 0 };
  }
}

// ─── Alert conversion ────────────────────────────────────────────────────────

async function getAlertConversionData(): Promise<{
  alertTriggered: number;
  alertClickouts: number;
  alertConversionRate: number;
}> {
  try {
    // Alerts that were triggered (have triggeredAt)
    const triggered = await prisma.priceAlert.count({
      where: {
        triggeredAt: { not: null },
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });

    // Clickouts from users who have alerts (matching by email → sessionId heuristic)
    // Since we can't directly link, we count clickouts from sessions that created alerts
    const clickoutRows: any[] = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT c.id)::int AS alert_clickouts
      FROM clickouts c
      INNER JOIN price_alerts pa ON pa."listingId" = (
        SELECT "listingId" FROM offers WHERE id = c."offerId" LIMIT 1
      )
      WHERE c."clickedAt" > NOW() - INTERVAL '30 days'
        AND pa."triggeredAt" IS NOT NULL
    `;

    const alertClickouts = clickoutRows[0]?.alert_clickouts ?? 0;

    return {
      alertTriggered: triggered,
      alertClickouts,
      alertConversionRate: triggered > 0 ? Math.round((alertClickouts / triggered) * 100) : 0,
    };
  } catch {
    return { alertTriggered: 0, alertClickouts: 0, alertConversionRate: 0 };
  }
}

// ─── Alerts per user ─────────────────────────────────────────────────────────

async function getAlertPerUserData(): Promise<{
  avgAlertsPerUser: number;
  totalAlertUsers: number;
}> {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        COUNT(DISTINCT "email")::int AS total_users,
        COUNT(*)::float / NULLIF(COUNT(DISTINCT "email"), 0) AS avg_per_user
      FROM price_alerts
    `;

    const r = rows[0] || {};
    return {
      totalAlertUsers: r.total_users ?? 0,
      avgAlertsPerUser: Math.round((r.avg_per_user ?? 0) * 10) / 10,
    };
  } catch {
    return { avgAlertsPerUser: 0, totalAlertUsers: 0 };
  }
}

// ─── Recurring clickouts ─────────────────────────────────────────────────────

async function getRecurringClickoutData(): Promise<{
  recurringClickouts: number;
  totalClickouts: number;
  recurringRate: number;
}> {
  try {
    // Recurring = same offerId clicked on multiple distinct dates
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        COUNT(*)::int AS total_clickouts,
        COALESCE(SUM(CASE WHEN day_count > 1 THEN day_count ELSE 0 END), 0)::int AS recurring_clickouts
      FROM (
        SELECT
          "offerId",
          COALESCE("sessionId", "userAgent") AS user_id,
          COUNT(DISTINCT DATE("clickedAt")) AS day_count,
          COUNT(*) AS click_count
        FROM clickouts
        WHERE "clickedAt" > NOW() - INTERVAL '30 days'
          AND ("sessionId" IS NOT NULL OR "userAgent" IS NOT NULL)
        GROUP BY "offerId", user_id
      ) offer_user
    `;

    const r = rows[0] || {};
    const total = r.total_clickouts ?? 0;
    const recurring = r.recurring_clickouts ?? 0;

    return {
      recurringClickouts: recurring,
      totalClickouts: total,
      recurringRate: total > 0 ? Math.round((recurring / total) * 100) : 0,
    };
  } catch {
    return { recurringClickouts: 0, totalClickouts: 0, recurringRate: 0 };
  }
}
