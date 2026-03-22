/**
 * GET /api/admin/diag/ai-intelligence
 *
 * Admin diagnostic endpoint for AI intelligence modules.
 * Returns: module status, sample outputs, integration health.
 * Protected by x-admin-secret header.
 */

import { NextRequest, NextResponse } from 'next/server'
import { classifyIntent } from '@/lib/ai/intent-classifier'
import { scorePurchaseIntent } from '@/lib/ai/purchase-intent'
import { generateSmartSuggestions } from '@/lib/ai/smart-suggestions'
import { computeTrustScore } from '@/lib/ai/review-intelligence'
import { categorize } from '@/lib/ai/smart-categorizer'
import { analyzeConversation } from '@/lib/ai/conversation-intelligence'
import { validateAdmin } from '@/lib/auth/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  const testQuery = req.nextUrl.searchParams.get('q') || 'melhor celular até R$ 2000'

  try {
    // 1. Intent classification
    const intent = classifyIntent(testQuery)

    // 2. Purchase intent
    const purchaseIntent = scorePurchaseIntent({
      query: testQuery,
      conversationHistory: [],
      classifiedIntent: intent,
    })

    // 3. Smart suggestions
    const suggestions = generateSmartSuggestions({
      conversationHistory: [{ role: 'user', content: testQuery }],
      purchasePhase: purchaseIntent.phase,
    })

    // 4. Smart categorization
    const categorization = categorize('Samsung Galaxy S24 Ultra 256GB Preto')
    const categorization2 = categorize('Air Fryer Philco 4.4L Digital')

    // 5. Review intelligence (sample)
    const trustScore = computeTrustScore({
      productId: 'sample',
      productName: 'Samsung Galaxy S24 Ultra',
      categorySlug: 'celulares',
      offers: [
        { source: 'amazon-br', rating: 4.7, reviewCount: 1250, price: 5999 },
        { source: 'mercadolivre', rating: 4.5, reviewCount: 890, price: 6199 },
      ],
      favoritesCount: 15,
      alertsCount: 8,
      clickoutCount: 45,
      firstSeenAt: new Date(Date.now() - 90 * 86400000),
      offerCount: 5,
    })

    // 6. Conversation intelligence (sample)
    const convoInsight = analyzeConversation(
      [
        { role: 'user', content: testQuery },
        { role: 'assistant', content: 'Encontrei ótimas opções para você...' },
      ],
      intent,
      3
    )

    return NextResponse.json({
      query: testQuery,
      modules: {
        intentClassifier: {
          status: 'ok',
          result: intent,
        },
        purchaseIntent: {
          status: 'ok',
          result: {
            score: purchaseIntent.score,
            phase: purchaseIntent.phase,
            confidence: purchaseIntent.confidence,
            recommendedAction: purchaseIntent.recommendedAction,
            urgencyMultiplier: purchaseIntent.urgencyMultiplier,
            signalCount: purchaseIntent.signals.length,
          },
        },
        smartSuggestions: {
          status: 'ok',
          count: suggestions.length,
          samples: suggestions.slice(0, 4).map(s => ({ text: s.text, type: s.type, icon: s.icon })),
        },
        smartCategorizer: {
          status: 'ok',
          samples: [
            { input: 'Samsung Galaxy S24 Ultra 256GB', result: categorization },
            { input: 'Air Fryer Philco 4.4L Digital', result: categorization2 },
          ],
        },
        reviewIntelligence: {
          status: 'ok',
          result: {
            score: trustScore.score,
            level: trustScore.level,
            label: trustScore.label,
            buyerConfidence: trustScore.buyerConfidence,
            prosCount: trustScore.topPros.length,
            consCount: trustScore.topCons.length,
          },
        },
        conversationIntelligence: {
          status: 'ok',
          result: {
            sentiment: convoInsight.sentiment,
            entityCount: convoInsight.extractedEntities.length,
            catalogGap: convoInsight.catalogGap,
            objections: convoInsight.objections,
          },
        },
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Diagnostic failed',
      detail: String(error),
    }, { status: 500 })
  }
}
