import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { getAllCategories } from '@/lib/ml-discovery'
import { getMLToken, mlTokenStore, getMLAppToken } from '@/lib/ml-auth'
import type { MLAuditReport } from '@/lib/ml-discovery'

export const dynamic = 'force-dynamic'

/**
 * GET /api/system/audit/ml
 *
 * ML integration health report.
 * Tests all endpoints, token status, and capability readiness.
 */
export async function GET(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  const report: MLAuditReport = {
    timestamp: new Date().toISOString(),
    endpoints: [],
    tokenStatus: { userToken: false, appToken: false },
    categories: { total: 0, covered: [] },
    capabilities: { cronReady: false, autoImportReady: false, fallbackActive: false },
  }

  // ── Token Status ──────────────────────────────────────────────────────
  try {
    const userToken = await mlTokenStore.get()
    if (userToken) {
      const ageMs = Date.now() - userToken.obtained_at
      const expiresMs = userToken.expires_in * 1000
      report.tokenStatus.userToken = ageMs < expiresMs
      report.tokenStatus.expiresIn = Math.max(0, Math.round((expiresMs - ageMs) / 1000))
    }
  } catch { /* ignore */ }

  try {
    await getMLAppToken()
    report.tokenStatus.appToken = true
  } catch { /* ignore */ }

  // ── Test Endpoints ────────────────────────────────────────────────────
  const ML_API = 'https://api.mercadolibre.com'

  const endpointTests = [
    { name: 'trends', url: `${ML_API}/trends/MLB` },
    { name: 'highlights', url: `${ML_API}/highlights/MLB/category/MLB1055` },
    { name: 'items', url: `${ML_API}/items/MLB3765842735` },
    { name: 'users/me', url: `${ML_API}/users/me` },
    { name: 'search (geo-blocked)', url: `${ML_API}/sites/MLB/search?q=celular&limit=1` },
  ]

  let tokenHeader: Record<string, string> = {}
  try {
    const token = await getMLToken()
    tokenHeader = { Authorization: `Bearer ${token}` }
  } catch { /* proceed without */ }

  for (const test of endpointTests) {
    const start = Date.now()
    try {
      const res = await fetch(test.url, {
        headers: { ...tokenHeader, Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      })
      const latencyMs = Date.now() - start

      let status: 'operational' | 'blocked' | 'degraded' | 'unknown' = 'unknown'
      if (res.ok) status = 'operational'
      else if (res.status === 403) status = 'blocked'
      else if (res.status >= 400 && res.status < 500) status = 'degraded'
      else if (res.status >= 500) status = 'degraded'

      report.endpoints.push({
        name: test.name,
        url: test.url,
        status,
        lastChecked: new Date().toISOString(),
        latencyMs,
      })
    } catch (err) {
      report.endpoints.push({
        name: test.name,
        url: test.url,
        status: 'unknown',
        lastChecked: new Date().toISOString(),
        latencyMs: Date.now() - start,
      })
    }
  }

  // ── Categories ────────────────────────────────────────────────────────
  const allCats = getAllCategories()
  report.categories.total = allCats.length
  report.categories.covered = allCats.map(c => c.name)

  // ── Capabilities ──────────────────────────────────────────────────────
  const hasWorkingEndpoints = report.endpoints.some(e => e.name === 'highlights' && e.status === 'operational')
  const hasToken = report.tokenStatus.userToken || report.tokenStatus.appToken
  const hasCredentials = !!(process.env.MERCADOLIVRE_APP_ID && process.env.MERCADOLIVRE_SECRET)
  const hasCronSecret = !!process.env.CRON_SECRET

  report.capabilities.cronReady = hasToken && hasWorkingEndpoints && hasCronSecret
  report.capabilities.autoImportReady = hasToken && hasWorkingEndpoints
  report.capabilities.fallbackActive = report.tokenStatus.appToken && !report.tokenStatus.userToken

  return NextResponse.json(report)
}
