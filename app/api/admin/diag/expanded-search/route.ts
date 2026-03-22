/**
 * Expanded Search Diagnostic Endpoint
 *
 * GET /api/admin/diag/expanded-search
 * Protected by x-admin-secret header.
 *
 * Returns: connector status, feature flag state, test query results,
 * coverage analysis, and experiment assignments.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { getFlag } from '@/lib/config/feature-flags'
import { EXPERIMENTS, getUserExperiments } from '@/lib/search/expanded/experiments'

export const dynamic = 'force-dynamic'

function checkAdminSecret(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return false
  return req.headers.get('x-admin-secret') === secret
}

export async function GET(req: NextRequest) {
  if (!checkAdminSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const testQuery = req.nextUrl.searchParams.get('q') || 'iPhone 15'
  const startTime = Date.now()

  // 1. Feature flag status
  const flagEnabled = getFlag('expandedSearch')

  // 2. Connector readiness
  let connectorStatus: Record<string, boolean> = {}
  try {
    const { connectorRegistry } = await import('@/lib/ai/candidate-resolver')
    const slugs = ['google-shopping', 'mercadolivre-search', 'shopee-search', 'magalu-search']
    for (const slug of slugs) {
      const conn = connectorRegistry.get(slug)
      connectorStatus[slug] = !!conn && conn.isReady()
    }
  } catch {
    connectorStatus = { error: true } as any
  }

  // 3. Test query (only if flag is enabled or forced)
  let testResult: any = null
  if (flagEnabled || req.nextUrl.searchParams.has('force')) {
    try {
      const { expandedSearch } = await import('@/lib/search/expanded')
      const result = await expandedSearch({
        query: testQuery,
        page: 1,
        limit: 8,
        isAdmin: true,
        forceExpand: true,
      })

      testResult = {
        query: testQuery,
        internalCount: result.internalResults.length,
        expandedCount: result.expandedResults.length,
        blendedCount: result.blendedResults.length,
        coverage: result.coverage,
        expanded: result.expanded,
        framing: result.expandedFraming,
        trace: result.trace,
        durationMs: Date.now() - startTime,
        // Sample results
        sampleInternal: result.internalResults.slice(0, 2).map(r => ({
          title: r.title.slice(0, 60),
          price: r.price,
          store: r.storeName,
          quality: r.qualityScore,
          monetizable: r.isMonetizable,
        })),
        sampleExpanded: result.expandedResults.slice(0, 4).map(r => ({
          title: r.title.slice(0, 60),
          price: r.price,
          store: r.storeName,
          marketplace: r.marketplace,
          quality: r.qualityScore,
          affiliateStatus: r.affiliateStatus,
          monetizable: r.isMonetizable,
        })),
      }
    } catch (err) {
      testResult = { error: String(err), durationMs: Date.now() - startTime }
    }
  }

  // 4. Experiment config
  const experiments = Object.values(EXPERIMENTS).map(exp => ({
    id: exp.id,
    name: exp.name,
    active: exp.active,
    variants: exp.variants,
  }))
  const sampleAssignments = getUserExperiments('sample-user-123')

  // 5. Env vars presence check (never expose values)
  const envCheck = {
    SEARCHAPI_KEY: !!process.env.SEARCHAPI_KEY,
    SERPAPI_KEY: !!process.env.SERPAPI_KEY,
    ML_CLIENT_ID: !!process.env.ML_CLIENT_ID,
    SHOPEE_AFFILIATE_ID: !!process.env.SHOPEE_AFFILIATE_ID,
    AMAZON_CREDENTIAL_ID: !!process.env.AMAZON_CREDENTIAL_ID,
    FF_EXPANDED_SEARCH: process.env.FF_EXPANDED_SEARCH || 'not set',
  }

  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    featureFlag: flagEnabled,
    connectors: connectorStatus,
    envCheck,
    experiments,
    sampleAssignments,
    testResult,
    totalDiagMs: Date.now() - startTime,
  })
}
