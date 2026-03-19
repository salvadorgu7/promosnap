/**
 * POST /api/ai/chat
 *
 * Shopping assistant endpoint. Accepts natural language queries,
 * uses OpenAI + local catalog to find and compare products.
 *
 * Body: { message: string, history?: { role: 'user'|'assistant', content: string }[] }
 * Returns: { message: string, products?: AssistantProduct[] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, rateLimitResponse, withRateLimitHeaders } from '@/lib/security/rate-limit'
import { processShoppingQuery, isAIConfigured } from '@/lib/ai/shopping-assistant'
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

    const history = Array.isArray(body.history)
      ? body.history.slice(-6) // Keep last 6 messages for context
      : []

    const result = await processShoppingQuery(message, history)

    logger.info('ai.chat', {
      queryLength: message.length,
      hasProducts: !!result.products?.length,
      productCount: result.products?.length || 0,
    })

    return withRateLimitHeaders(NextResponse.json(result), rl)
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
