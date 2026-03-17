/**
 * Job Health Monitor — validates cron jobs are running on schedule.
 *
 * Checks last run of each job, detects staleness, and sends alerts
 * via Discord/Slack webhook when jobs are overdue or failing.
 */

import prisma from '@/lib/db/prisma';
import { logger } from '@/lib/logger';

// ─── Configuration ─────────────────────────────────────────────────────────

/** Expected max interval between runs (in hours) per job */
const JOB_SCHEDULES: Record<string, { maxIntervalHours: number; critical: boolean }> = {
  'update-prices': { maxIntervalHours: 2, critical: true },
  'compute-scores': { maxIntervalHours: 4, critical: true },
  'ingest': { maxIntervalHours: 6, critical: true },
  'discover-import': { maxIntervalHours: 6, critical: true },
  'check-alerts': { maxIntervalHours: 4, critical: false },
  'cleanup': { maxIntervalHours: 25, critical: false },
  'backfill-images': { maxIntervalHours: 25, critical: false },
  'sitemap': { maxIntervalHours: 25, critical: false },
  'process-promosapp': { maxIntervalHours: 6, critical: false },
};

// ─── Types ─────────────────────────────────────────────────────────────────

export interface JobHealthStatus {
  jobName: string;
  lastRun: Date | null;
  lastStatus: string | null;
  lastDurationMs: number | null;
  isOverdue: boolean;
  isFailing: boolean;
  failStreak: number;
  hoursAgo: number | null;
  maxIntervalHours: number;
  critical: boolean;
}

export interface CronHealthReport {
  timestamp: string;
  healthy: boolean;
  criticalIssues: number;
  warningIssues: number;
  jobs: JobHealthStatus[];
  summary: string;
}

// ─── Health Check ──────────────────────────────────────────────────────────

/**
 * Check health of all registered cron jobs.
 * Returns detailed report with staleness and failure detection.
 */
export async function checkCronHealth(): Promise<CronHealthReport> {
  const now = new Date();
  const jobs: JobHealthStatus[] = [];
  let criticalIssues = 0;
  let warningIssues = 0;

  for (const [jobName, schedule] of Object.entries(JOB_SCHEDULES)) {
    try {
      // Get last 5 runs to detect fail streaks
      const recentRuns = await prisma.jobRun.findMany({
        where: { jobName },
        orderBy: { startedAt: 'desc' },
        take: 5,
        select: {
          status: true,
          startedAt: true,
          durationMs: true,
        },
      });

      const lastRun = recentRuns[0] || null;
      const hoursAgo = lastRun
        ? (now.getTime() - lastRun.startedAt.getTime()) / 3600000
        : null;
      const isOverdue = hoursAgo === null || hoursAgo > schedule.maxIntervalHours;
      const isFailing = lastRun?.status === 'FAILED';
      const failStreak = countFailStreak(recentRuns.map((r) => r.status));

      const status: JobHealthStatus = {
        jobName,
        lastRun: lastRun?.startedAt || null,
        lastStatus: lastRun?.status || null,
        lastDurationMs: lastRun?.durationMs || null,
        isOverdue,
        isFailing,
        failStreak,
        hoursAgo: hoursAgo !== null ? Math.round(hoursAgo * 10) / 10 : null,
        maxIntervalHours: schedule.maxIntervalHours,
        critical: schedule.critical,
      };

      if ((isOverdue || isFailing) && schedule.critical) {
        criticalIssues++;
      } else if (isOverdue || isFailing) {
        warningIssues++;
      }

      jobs.push(status);
    } catch (err) {
      logger.error('job-health.check-failed', { jobName, error: String(err) });
      jobs.push({
        jobName,
        lastRun: null,
        lastStatus: null,
        lastDurationMs: null,
        isOverdue: true,
        isFailing: false,
        failStreak: 0,
        hoursAgo: null,
        maxIntervalHours: schedule.maxIntervalHours,
        critical: schedule.critical,
      });
      if (schedule.critical) criticalIssues++;
      else warningIssues++;
    }
  }

  const healthy = criticalIssues === 0;
  const summaryParts: string[] = [];
  if (criticalIssues > 0) summaryParts.push(`${criticalIssues} critical`);
  if (warningIssues > 0) summaryParts.push(`${warningIssues} warning`);
  const summary = healthy
    ? `All ${jobs.length} jobs healthy`
    : `Issues: ${summaryParts.join(', ')}`;

  return {
    timestamp: now.toISOString(),
    healthy,
    criticalIssues,
    warningIssues,
    jobs,
    summary,
  };
}

function countFailStreak(statuses: string[]): number {
  let count = 0;
  for (const s of statuses) {
    if (s === 'FAILED') count++;
    else break;
  }
  return count;
}

// ─── Alerting ──────────────────────────────────────────────────────────────

/**
 * Send alert to Discord/Slack webhook when jobs are unhealthy.
 * Only sends if DISCORD_WEBHOOK_URL or SLACK_WEBHOOK_URL is configured.
 */
export async function sendCronAlert(report: CronHealthReport): Promise<boolean> {
  const discordUrl = process.env.DISCORD_WEBHOOK_URL;
  const slackUrl = process.env.SLACK_WEBHOOK_URL;

  if (!discordUrl && !slackUrl) {
    logger.warn('job-health.no-webhook', {
      message: 'No webhook URL configured for cron alerts',
    });
    return false;
  }

  const problemJobs = report.jobs.filter((j) => j.isOverdue || j.isFailing);
  if (problemJobs.length === 0) return false;

  const lines = problemJobs.map((j) => {
    const issues: string[] = [];
    if (j.isOverdue) issues.push(`overdue (${j.hoursAgo ?? '?'}h ago, max ${j.maxIntervalHours}h)`);
    if (j.isFailing) issues.push(`FAILED (streak: ${j.failStreak})`);
    const icon = j.critical ? '🔴' : '🟡';
    return `${icon} **${j.jobName}**: ${issues.join(', ')}`;
  });

  const message = [
    `⚠️ **PromoSnap Cron Alert**`,
    `${report.criticalIssues} critical, ${report.warningIssues} warnings`,
    '',
    ...lines,
    '',
    `_${new Date().toISOString()}_`,
  ].join('\n');

  try {
    if (discordUrl) {
      await fetch(discordUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message }),
      });
    }

    if (slackUrl) {
      await fetch(slackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message.replace(/\*\*/g, '*'), // Slack uses single * for bold
        }),
      });
    }

    logger.info('job-health.alert-sent', {
      criticalIssues: report.criticalIssues,
      warningIssues: report.warningIssues,
    });
    return true;
  } catch (err) {
    logger.error('job-health.alert-failed', { error: String(err) });
    return false;
  }
}

/**
 * Run health check and send alerts if needed.
 * Designed to be called from the cron endpoint after all jobs complete.
 */
export async function checkAndAlert(): Promise<CronHealthReport> {
  const report = await checkCronHealth();

  if (!report.healthy) {
    await sendCronAlert(report);
  }

  return report;
}
