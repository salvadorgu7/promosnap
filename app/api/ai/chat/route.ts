/**
 * POST /api/ai/chat
 *
 * Shopping assistant endpoint. Accepts natural language queries,
 * uses OpenAI + local catalog + marketplace APIs to find and compare products.
 *
 * Body: { message: string, history?: { role: 'user'|'assistant', content: string }[] }
 * Returns: { message: string, products?: AssistantProduct[] }
 *
 * Session memory: conversation history is persisted via ps_session cookie (24h TTL).
 * Client can send history[] for immediate context, but the server also loads
 * persisted history from cache to survive page refreshes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, rateLimitResponse, withRateLimitHeaders } from '@/lib/security/rate-limit'
import { processShoppingQuery, isAIConfigured } from '@/lib/ai/shopping-assistant'
import { loadConversation, appendToConversation } from '@/lib/ai/session-memory'
import { classifyIntent } from '@/lib/ai/intent-classifier'
import { scorePurchaseIntent } from '@/lib/ai/purchase-intent'
import { analyzeConversation } from '@/lib/ai/conversation-intelligence'
import { generateSmartSuggestions } from '@/lib/ai/smart-suggestions'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 30 // Allow up to 30s for AI + tool calls

export async function POST(req: NextRequest) {
  // Rate limit: 20 req/min (AI is expensive)
  const rl = rateLimit(req, 'search')
  if (!rl.success) return rateLimitResponse(rl)

  if (!isAIConfigured()) {
    return withRateLimitHeaders(
      NextResponse.json(
        { error: 'Shopping assistant not configured. Set OPENAI_API_KEY.' },
        { status: 503 }
      ),
      rl
    )
  }

  try {
    const body = await req.json()
    const message = body.message?.trim()

    if (!message || message.length < 2 || message.length > 500) {
      return withRateLimitHeaders(
        NextResponse.json({ error: 'Message must be 2-500 characters' }, { status: 400 }),
        rl
      )
    }

    // ── Session memory: merge client history with persisted history ──
    const sessionId = req.cookies.get('ps_session')?.value || null
    const clientHistory = Array.isArray(body.history) ? body.history.slice(-6) : []

    // Load persisted conversation (survives page refresh)
    const persistedHistory = await loadConversation(sessionId)

    // Use client history if provided (freshest), fall back to persisted
    const history = clientHistory.length > 0
      ? clientHistory
      : persistedHistory.slice(-6)

    const result = await processShoppingQuery(message, history)

    // ── Purchase intent + conversation intelligence (non-blocking) ──
    const intent = classifyIntent(message)
    const purchaseIntent = scorePurchaseIntent({
      query: message,
      conversationHistory: history,
      classifiedIntent: intent,
    })

    // Generate smart follow-up suggestions based on context
    const smartSuggestions = generateSmartSuggestions({
      conversationHistory: [...history, { role: 'user', content: message }],
      purchasePhase: purchaseIntent.phase,
      lastProducts: result.products?.slice(0, 3).map(p => ({
        name: p.name,
        price: p.price || 0,
        category: intent.categories?.[0],
      })),
    })

    // Conversation intelligence (fire-and-forget analytics)
    analyzeConversation(
      [...history, { role: 'user', content: message }, { role: 'assistant', content: result.message }],
      intent,
      result.products?.length || 0
    ) // just compute, no await needed — pure function for now

    // Persist conversation (fire-and-forget)
    if (sessionId) {
      appendToConversation(sessionId, message, result.message).catch(() => {})
    }

    logger.info('ai.chat', {
      queryLength: message.length,
      hasProducts: !!result.products?.length,
      productCount: result.products?.length || 0,
      purchasePhase: purchaseIntent.phase,
      purchaseIntentScore: purchaseIntent.score,
      sessionId: sessionId ? sessionId.slice(0, 8) + '...' : null,
      historySource: clientHistory.length > 0 ? 'client' : persistedHistory.length > 0 ? 'persisted' : 'none',
    })

    // Enrich response with smart suggestions + purchase context
    const enrichedResult = {
      ...result,
      purchaseIntent: {
        score: purchaseIntent.score,
        phase: purchaseIntent.phase,
        recommendedAction: purchaseIntent.recommendedAction,
      },
      smartSuggestions: smartSuggestions.slice(0, 4).map(s => ({
        text: s.text,
        query: s.query,
        icon: s.icon,
      })),
    }

    return withRateLimitHeaders(NextResponse.json(enrichedResult), rl)
  } catch (error) {
    logger.error('ai.chat.failed', { error })
    return withRateLimitHeaders(
      NextResponse.json(
        { message: 'Erro ao processar. Tente a busca tradicional em /busca.' },
        { status: 500 }
      ),
      rl
    )
  }
}
