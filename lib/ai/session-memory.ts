/**
 * Assistant Session Memory — persists conversation history across page refreshes.
 *
 * Uses the existing hybrid cache (Redis → memory fallback) to store
 * conversation history per session ID with 24h TTL.
 *
 * The session ID comes from the `ps_session` cookie (set by middleware).
 * Without a session ID, conversations are ephemeral (client-side only).
 */

import { cache } from '@/lib/cache'
import { logger } from '@/lib/logger'
import type { AssistantMessage } from './shopping-assistant'

const log = logger.child({ module: 'session-memory' })

const SESSION_TTL = 86400 // 24 hours
const MAX_MESSAGES = 20 // Keep last 20 messages per session

function sessionKey(sessionId: string): string {
  return `assistant:session:${sessionId}`
}

/**
 * Load conversation history for a session.
 */
export async function loadConversation(sessionId: string | null): Promise<AssistantMessage[]> {
  if (!sessionId) return []

  try {
    const history = await cache.get<AssistantMessage[]>(sessionKey(sessionId))
    return history || []
  } catch (err) {
    log.debug('session.load.failed', { sessionId, error: String(err) })
    return []
  }
}

/**
 * Save conversation history for a session.
 * Appends new messages and keeps only the last MAX_MESSAGES.
 */
export async function saveConversation(
  sessionId: string | null,
  messages: AssistantMessage[]
): Promise<void> {
  if (!sessionId || messages.length === 0) return

  try {
    // Keep only last N messages to avoid unbounded growth
    const trimmed = messages.slice(-MAX_MESSAGES)
    await cache.set(sessionKey(sessionId), trimmed, SESSION_TTL)
  } catch (err) {
    log.debug('session.save.failed', { sessionId, error: String(err) })
  }
}

/**
 * Append a user message + assistant response to the session.
 */
export async function appendToConversation(
  sessionId: string | null,
  userMessage: string,
  assistantMessage: string
): Promise<void> {
  if (!sessionId) return

  try {
    const existing = await loadConversation(sessionId)
    existing.push(
      { role: 'user', content: userMessage },
      { role: 'assistant', content: assistantMessage },
    )
    await saveConversation(sessionId, existing)
  } catch (err) {
    log.debug('session.append.failed', { sessionId, error: String(err) })
  }
}

/**
 * Clear conversation history for a session.
 */
export async function clearConversation(sessionId: string | null): Promise<void> {
  if (!sessionId) return
  try {
    await cache.delete(sessionKey(sessionId))
  } catch {
    // Non-blocking
  }
}
