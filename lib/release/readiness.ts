import fs from 'fs'
import path from 'path'
import prisma from '@/lib/db/prisma'
import type { ReadinessCheck, ReadinessReport } from './types'

// ─── Helpers ─────────────────────────────────────────────────

function fileExists(relativePath: string): boolean {
  try {
    const fullPath = path.join(process.cwd(), relativePath)
    return fs.existsSync(fullPath)
  } catch {
    return false
  }
}

// ─── Infrastructure checks ──────────────────────────────────

function checkBuildStatus(): ReadinessCheck {
  const nodeEnv = process.env.NODE_ENV || 'unknown'
  const isProduction = nodeEnv === 'production'

  return {
    name: 'Build Status',
    status: isProduction ? 'ready' : 'warning',
    message: isProduction
      ? `NODE_ENV=production`
      : `NODE_ENV=${nodeEnv} (not production)`,
    category: 'infra',
  }
}

function checkCriticalEnvVars(): ReadinessCheck {
  const vars: Record<string, boolean> = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    ADMIN_SECRET: !!process.env.ADMIN_SECRET,
    CRON_SECRET: !!process.env.CRON_SECRET,
  }

  const missing = Object.entries(vars)
    .filter(([, present]) => !present)
    .map(([key]) => key)

  if (missing.length > 0) {
    return {
      name: 'Critical Env Vars',
      status: 'blocked',
      message: `Missing: ${missing.join(', ')}`,
      category: 'infra',
    }
  }

  return {
    name: 'Critical Env Vars',
    status: 'ready',
    message: 'DATABASE_URL, ADMIN_SECRET, CRON_SECRET all present',
    category: 'infra',
  }
}

async function checkDatabaseHealth(): Promise<ReadinessCheck> {
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const latencyMs = Date.now() - start

    return {
      name: 'Database Health',
      status: latencyMs > 3000 ? 'warning' : 'ready',
      message: `Connected (${latencyMs}ms)`,
      category: 'infra',
    }
  } catch (error) {
    return {
      name: 'Database Health',
      status: 'blocked',
      message: `Connection failed: ${error instanceof Error ? error.message : 'unknown'}`,
      category: 'infra',
    }
  }
}

// ─── Data checks ─────────────────────────────────────────────

async function checkSourceHealth(): Promise<ReadinessCheck> {
  try {
    const activeSources = await prisma.source.count({ where: { status: 'ACTIVE' } })
    const totalSources = await prisma.source.count()

    if (activeSources === 0) {
      return {
        name: 'Active Sources',
        status: totalSources === 0 ? 'blocked' : 'warning',
        message: totalSources === 0
          ? 'No sources configured'
          : `0 active of ${totalSources} total`,
        category: 'data',
      }
    }

    return {
      name: 'Active Sources',
      status: 'ready',
      message: `${activeSources} active of ${totalSources} total`,
      category: 'data',
    }
  } catch (error) {
    return {
      name: 'Active Sources',
      status: 'blocked',
      message: `Query failed: ${error instanceof Error ? error.message : 'unknown'}`,
      category: 'data',
    }
  }
}

// ─── Route checks ────────────────────────────────────────────

function checkSitemapRoute(): ReadinessCheck {
  const exists = fileExists('app/sitemap.ts')
  return {
    name: 'Sitemap Route',
    status: exists ? 'ready' : 'warning',
    message: exists ? 'app/sitemap.ts exists' : 'app/sitemap.ts not found',
    category: 'routes',
  }
}

function checkRobotsRoute(): ReadinessCheck {
  const exists = fileExists('app/robots.ts')
  return {
    name: 'Robots Route',
    status: exists ? 'ready' : 'warning',
    message: exists ? 'app/robots.ts exists' : 'app/robots.ts not found',
    category: 'routes',
  }
}

function checkHomePageRoute(): ReadinessCheck {
  const exists = fileExists('app/(site)/page.tsx')
  return {
    name: 'Home Page',
    status: exists ? 'ready' : 'blocked',
    message: exists ? 'app/(site)/page.tsx exists' : 'Home page route not found',
    category: 'routes',
  }
}

function checkProductPageRoute(): ReadinessCheck {
  const exists = fileExists('app/(site)/produto/[slug]/page.tsx')
  return {
    name: 'Product Page',
    status: exists ? 'ready' : 'blocked',
    message: exists
      ? 'app/(site)/produto/[slug]/page.tsx exists'
      : 'Product page route not found',
    category: 'routes',
  }
}

function checkSearchPageRoute(): ReadinessCheck {
  const exists = fileExists('app/(site)/busca/page.tsx')
  return {
    name: 'Search Page',
    status: exists ? 'ready' : 'blocked',
    message: exists ? 'app/(site)/busca/page.tsx exists' : 'Search page route not found',
    category: 'routes',
  }
}

function checkAdminEssentialPages(): ReadinessCheck {
  const essentialPages = [
    'app/admin/page.tsx',
    'app/admin/jobs/page.tsx',
    'app/admin/health/page.tsx',
    'app/admin/produtos/page.tsx',
    'app/admin/fontes/page.tsx',
  ]

  const missing = essentialPages.filter((p) => !fileExists(p))

  if (missing.length > 0) {
    return {
      name: 'Admin Essential Pages',
      status: 'warning',
      message: `Missing ${missing.length}: ${missing.map((p) => p.replace('app/admin/', '').replace('/page.tsx', '')).join(', ')}`,
      category: 'routes',
    }
  }

  return {
    name: 'Admin Essential Pages',
    status: 'ready',
    message: `All ${essentialPages.length} essential admin pages present`,
    category: 'routes',
  }
}

// ─── Security checks ─────────────────────────────────────────

function checkSensitiveRoutesProtected(): ReadinessCheck {
  const hasAdminSecret = !!process.env.ADMIN_SECRET

  if (!hasAdminSecret) {
    return {
      name: 'Sensitive Routes Protected',
      status: 'blocked',
      message: 'ADMIN_SECRET not set — admin API routes unprotected',
      category: 'security',
    }
  }

  const adminApiRoutes = [
    'app/api/admin/sources/route.ts',
    'app/api/admin/revenue/route.ts',
    'app/api/admin/articles/route.ts',
    'app/api/admin/health/route.ts',
  ]

  const existing = adminApiRoutes.filter((r) => fileExists(r))

  return {
    name: 'Sensitive Routes Protected',
    status: 'ready',
    message: `ADMIN_SECRET set, ${existing.length} admin API routes found`,
    category: 'security',
  }
}

// ─── Aggregate ───────────────────────────────────────────────

export async function runReadinessChecks(): Promise<ReadinessReport> {
  const checks: ReadinessCheck[] = await Promise.all([
    // Infra
    Promise.resolve(checkBuildStatus()),
    Promise.resolve(checkCriticalEnvVars()),
    checkDatabaseHealth(),
    // Data
    checkSourceHealth(),
    // Routes (sync wrapped in Promise.resolve for consistency)
    Promise.resolve(checkSitemapRoute()),
    Promise.resolve(checkRobotsRoute()),
    Promise.resolve(checkHomePageRoute()),
    Promise.resolve(checkProductPageRoute()),
    Promise.resolve(checkSearchPageRoute()),
    Promise.resolve(checkAdminEssentialPages()),
    // Security
    Promise.resolve(checkSensitiveRoutesProtected()),
  ])

  const readyCount = checks.filter((c) => c.status === 'ready').length
  const warningCount = checks.filter((c) => c.status === 'warning').length
  const blockedCount = checks.filter((c) => c.status === 'blocked').length

  let overallStatus: ReadinessReport['overallStatus'] = 'ready'
  if (blockedCount > 0) overallStatus = 'blocked'
  else if (warningCount > 0) overallStatus = 'warning'

  return {
    checks,
    overallStatus,
    readyCount,
    warningCount,
    blockedCount,
  }
}
