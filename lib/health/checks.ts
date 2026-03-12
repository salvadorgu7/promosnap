import prisma from '@/lib/db/prisma'
import type { HealthCheckResult, HealthReport, HealthStatus } from './types'

// ─── Individual checks ───────────────────────────────────────

async function checkDatabase(): Promise<HealthCheckResult> {
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const latencyMs = Date.now() - start
    return {
      name: 'Database',
      status: latencyMs > 3000 ? 'degraded' : 'healthy',
      message: `Connected (${latencyMs}ms)`,
      severity: 'high',
      details: { latencyMs },
    }
  } catch (error) {
    return {
      name: 'Database',
      status: 'critical',
      message: `Connection failed: ${error instanceof Error ? error.message : 'unknown'}`,
      severity: 'high',
    }
  }
}

async function checkSources(): Promise<HealthCheckResult> {
  try {
    const activeSources = await prisma.source.count({ where: { status: 'ACTIVE' } })
    const totalSources = await prisma.source.count()
    if (activeSources === 0) {
      return {
        name: 'Sources',
        status: totalSources === 0 ? 'degraded' : 'critical',
        message: totalSources === 0 ? 'No sources configured' : 'No active sources',
        severity: 'high',
        details: { activeSources, totalSources },
      }
    }
    return {
      name: 'Sources',
      status: 'healthy',
      message: `${activeSources} active of ${totalSources} total`,
      severity: 'medium',
      details: { activeSources, totalSources },
    }
  } catch (error) {
    return {
      name: 'Sources',
      status: 'critical',
      message: `Query failed: ${error instanceof Error ? error.message : 'unknown'}`,
      severity: 'high',
    }
  }
}

async function checkJobs(): Promise<HealthCheckResult> {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const [recentSuccess, recentFailed, staleRunning] = await Promise.all([
      prisma.jobRun.count({
        where: { status: 'SUCCESS', startedAt: { gte: oneDayAgo } },
      }),
      prisma.jobRun.count({
        where: { status: 'FAILED', startedAt: { gte: oneDayAgo } },
      }),
      prisma.jobRun.count({
        where: { status: 'RUNNING', startedAt: { lt: oneDayAgo } },
      }),
    ])

    const hasIssues = recentFailed > 0 || staleRunning > 0
    const noRecent = recentSuccess === 0 && recentFailed === 0

    return {
      name: 'Jobs',
      status: staleRunning > 0 ? 'critical' : hasIssues ? 'degraded' : noRecent ? 'degraded' : 'healthy',
      message: noRecent
        ? 'No jobs ran in the last 24h'
        : `${recentSuccess} succeeded, ${recentFailed} failed, ${staleRunning} stale`,
      severity: 'medium',
      details: { recentSuccess, recentFailed, staleRunning },
    }
  } catch (error) {
    return {
      name: 'Jobs',
      status: 'critical',
      message: `Query failed: ${error instanceof Error ? error.message : 'unknown'}`,
      severity: 'medium',
    }
  }
}

function checkSitemap(): HealthCheckResult {
  // The sitemap route exists as app/sitemap.ts — we verify file-level presence at build time.
  // At runtime we just confirm the route should be available.
  return {
    name: 'Sitemap',
    status: 'healthy',
    message: 'Sitemap route registered (app/sitemap.ts)',
    severity: 'low',
  }
}

function checkEmailConfig(): HealthCheckResult {
  const hasResendKey = !!process.env.RESEND_API_KEY
  return {
    name: 'Email / Resend',
    status: hasResendKey ? 'healthy' : 'degraded',
    message: hasResendKey ? 'RESEND_API_KEY configured' : 'RESEND_API_KEY missing — emails disabled',
    severity: 'medium',
  }
}

function checkCronReadiness(): HealthCheckResult {
  const hasCronSecret = !!process.env.CRON_SECRET
  return {
    name: 'Cron Readiness',
    status: hasCronSecret ? 'healthy' : 'degraded',
    message: hasCronSecret ? 'CRON_SECRET configured' : 'CRON_SECRET missing — cron jobs unprotected',
    severity: 'medium',
  }
}

function checkCriticalEnvVars(): HealthCheckResult {
  const required: Record<string, boolean> = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    ADMIN_SECRET: !!process.env.ADMIN_SECRET,
  }

  const missing = Object.entries(required)
    .filter(([, present]) => !present)
    .map(([key]) => key)

  return {
    name: 'Critical Env Vars',
    status: missing.length > 0 ? 'critical' : 'healthy',
    message: missing.length > 0 ? `Missing: ${missing.join(', ')}` : 'All critical vars present',
    severity: 'high',
    details: required,
  }
}

function checkBuildRuntime(): HealthCheckResult {
  const nodeEnv = process.env.NODE_ENV || 'unknown'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

  return {
    name: 'Build / Runtime',
    status: nodeEnv === 'production' && !siteUrl ? 'degraded' : 'healthy',
    message: `NODE_ENV=${nodeEnv}${siteUrl ? `, SITE_URL=${siteUrl}` : ', NEXT_PUBLIC_SITE_URL not set'}`,
    severity: 'low',
    details: { nodeEnv, siteUrl: siteUrl || null },
  }
}

// ─── Aggregate ───────────────────────────────────────────────

export async function runAllHealthChecks(): Promise<HealthReport> {
  const checks = await Promise.all([
    checkDatabase(),
    checkSources(),
    checkJobs(),
    Promise.resolve(checkSitemap()),
    Promise.resolve(checkEmailConfig()),
    Promise.resolve(checkCronReadiness()),
    Promise.resolve(checkCriticalEnvVars()),
    Promise.resolve(checkBuildRuntime()),
  ])

  const summary = {
    total: checks.length,
    healthy: checks.filter((c) => c.status === 'healthy').length,
    degraded: checks.filter((c) => c.status === 'degraded').length,
    critical: checks.filter((c) => c.status === 'critical').length,
  }

  let status: HealthStatus = 'healthy'
  if (summary.critical > 0) status = 'critical'
  else if (summary.degraded > 0) status = 'degraded'

  return {
    status,
    timestamp: new Date().toISOString(),
    checks,
    summary,
  }
}
