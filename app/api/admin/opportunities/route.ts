import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { generateOpportunityReport } from '@/lib/discovery'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const denied = validateAdmin(req)
  if (denied) return denied

  try {
    const report = await generateOpportunityReport()

    return NextResponse.json({
      ok: true,
      summary: {
        totalOpportunities: report.opportunities.length,
        critical: report.opportunities.filter(o => o.priority === 'critical').length,
        high: report.opportunities.filter(o => o.priority === 'high').length,
        medium: report.opportunities.filter(o => o.priority === 'medium').length,
        low: report.opportunities.filter(o => o.priority === 'low').length,
        catalogHealth: {
          totalProducts: report.catalogHealth.totalProducts,
          activeProducts: report.catalogHealth.activeProducts,
          withOffers: report.catalogHealth.productsWithOffers,
          stale: report.catalogHealth.productsStale7d,
          noPrice: report.catalogHealth.productsNoPrice,
        },
        processingMs: report.processingMs,
      },
      opportunities: report.opportunities,
      catalogHealth: report.catalogHealth,
      generatedAt: report.generatedAt,
    })
  } catch (err) {
    logger.error("opportunities.failed", { error: err })
    return NextResponse.json({ error: 'Erro ao gerar relatório de oportunidades' }, { status: 500 })
  }
}
