import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { serpApiShoppingConnector } from '@/lib/ai/connectors/serpapi-shopping'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  const ready = serpApiShoppingConnector.isReady()
  if (!ready) {
    return NextResponse.json({
      ready: false,
      key_configured: false,
      message: 'SERPAPI_KEY nao configurada',
    })
  }

  const start = Date.now()
  try {
    const results = await serpApiShoppingConnector.search('iPhone 15', { limit: 3 })
    const latencyMs = Date.now() - start

    return NextResponse.json({
      ready: true,
      key_configured: true,
      test_query: 'iPhone 15',
      results_count: results.length,
      sample_result: results[0] ?? null,
      latency_ms: latencyMs,
    })
  } catch (err) {
    const latencyMs = Date.now() - start
    return NextResponse.json({
      ready: true,
      key_configured: true,
      test_query: 'iPhone 15',
      results_count: 0,
      sample_result: null,
      latency_ms: latencyMs,
      error: err instanceof Error ? err.message : 'Erro desconhecido',
    })
  }
}
