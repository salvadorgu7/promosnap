// ─── Smoke Test Surface ────────────────────────────────────────
// Defines the critical paths that should be smoke-tested after
// every deploy, and provides a lightweight fetch-based runner.

export interface SmokePath {
  path: string
  method: 'GET' | 'POST'
  expectedStatus: number
  description: string
  critical: boolean
}

export interface SmokeRunResult {
  path: string
  method: string
  expectedStatus: number
  actualStatus: number | null
  ok: boolean
  latencyMs: number
  error?: string
}

export interface SmokeSurfaceReport {
  results: SmokeRunResult[]
  passCount: number
  failCount: number
  totalMs: number
  ranAt: string
}

// ─── Critical paths definition ─────────────────────────────────

export function getSmokeTestSurface(): SmokePath[] {
  return [
    {
      path: '/',
      method: 'GET',
      expectedStatus: 200,
      description: 'Homepage loads',
      critical: true,
    },
    {
      path: '/api/search?q=teste',
      method: 'GET',
      expectedStatus: 200,
      description: 'Search works',
      critical: true,
    },
    {
      path: '/ofertas',
      method: 'GET',
      expectedStatus: 200,
      description: 'Offers page loads',
      critical: true,
    },
    {
      path: '/api/health',
      method: 'GET',
      expectedStatus: 200,
      description: 'API health endpoint',
      critical: true,
    },
    {
      path: '/api/cron/health',
      method: 'GET',
      expectedStatus: 200,
      description: 'Cron endpoint responds',
      critical: false,
    },
    {
      path: '/admin',
      method: 'GET',
      expectedStatus: 200,
      description: 'Admin loads',
      critical: true,
    },
    {
      path: '/categorias',
      method: 'GET',
      expectedStatus: 200,
      description: 'Categories page loads',
      critical: false,
    },
  ]
}

// ─── Quick smoke runner ────────────────────────────────────────

/**
 * Runs basic fetch checks against all critical paths.
 * Requires APP_URL to be set (e.g. "https://promosnap.com.br").
 * Returns null if APP_URL is not configured.
 */
export async function runQuickSmoke(): Promise<SmokeSurfaceReport | null> {
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL
  if (!baseUrl) return null

  const surface = getSmokeTestSurface()
  const results: SmokeRunResult[] = []
  const startAll = Date.now()

  for (const item of surface) {
    const url = `${baseUrl.replace(/\/$/, '')}${item.path}`
    const start = Date.now()

    try {
      const res = await fetch(url, {
        method: item.method,
        headers: { 'User-Agent': 'PromoSnap-SmokeTest/1.0' },
        redirect: 'follow',
        signal: AbortSignal.timeout(10_000),
      })

      const latencyMs = Date.now() - start
      results.push({
        path: item.path,
        method: item.method,
        expectedStatus: item.expectedStatus,
        actualStatus: res.status,
        ok: res.status === item.expectedStatus,
        latencyMs,
      })
    } catch (err) {
      const latencyMs = Date.now() - start
      results.push({
        path: item.path,
        method: item.method,
        expectedStatus: item.expectedStatus,
        actualStatus: null,
        ok: false,
        latencyMs,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  return {
    results,
    passCount: results.filter((r) => r.ok).length,
    failCount: results.filter((r) => !r.ok).length,
    totalMs: Date.now() - startAll,
    ranAt: new Date().toISOString(),
  }
}
