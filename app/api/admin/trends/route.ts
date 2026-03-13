import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { fetchTrendingSignals } from '@/lib/ml-discovery'
import prisma from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const denied = validateAdmin(req)
  if (denied) return denied

  try {
    const trends = await fetchTrendingSignals()

    if (trends.length === 0) {
      return NextResponse.json({
        count: 0,
        keywords: [],
        message: 'Nenhuma tendencia retornada pelo ML. Verifique credenciais em /admin/integrations/ml',
      })
    }

    // Persist trends to DB for public use (fire-and-forget)
    try {
      const now = new Date()
      await prisma.trendingKeyword.createMany({
        data: trends.map((t, i) => ({
          keyword: t.keyword,
          url: t.url,
          position: i + 1,
          fetchedAt: now,
        })),
        skipDuplicates: true,
      })
    } catch {
      // Non-critical — don't fail the response
    }

    return NextResponse.json({
      count: trends.length,
      keywords: trends.map(t => t.keyword),
      trends: trends.map(t => ({
        keyword: t.keyword,
        url: t.url,
        category: t.resolvedCategory?.name || null,
        categoryId: t.resolvedCategory?.id || null,
      })),
      hint: 'Use GET /api/admin/ml/discovery?q={keyword} para descobrir produtos de cada tendencia.',
    })
  } catch (err) {
    console.error('[admin/trends] Error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Erro ao buscar tendencias' }, { status: 500 })
  }
}
