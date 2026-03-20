/**
 * CRM Event Collector — captures user behaviour signals for the retention engine.
 *
 * Events are stored in crm_events and drive segmentation, journey triggers,
 * and message personalisation.
 */

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

// ============================================
// EVENT TYPES
// ============================================

export type CrmEventType =
  | 'search'
  | 'view_product'
  | 'clickout'
  | 'favorite'
  | 'unfavorite'
  | 'alert_create'
  | 'alert_delete'
  | 'compare'
  | 'view_category'
  | 'view_brand'
  | 'subscribe'
  | 'unsubscribe'
  | 'email_open'
  | 'email_click'
  | 'whatsapp_click'
  | 'return_visit'
  | 'zero_result'
  | 'repeated_search'
  | 'product_revisit'

export interface CrmEventPayload {
  productId?: string
  productSlug?: string
  query?: string
  categorySlug?: string
  brandSlug?: string
  sourceSlug?: string
  price?: number
  offerId?: string
  channel?: string
  page?: string
  device?: string
  [key: string]: unknown
}

// ============================================
// TRACK EVENT
// ============================================

export async function trackCrmEvent(
  eventType: CrmEventType,
  payload: CrmEventPayload = {},
  options: { email?: string; sessionId?: string } = {},
): Promise<void> {
  try {
    await prisma.crmEvent.create({
      data: {
        eventType,
        email: options.email ?? null,
        sessionId: options.sessionId ?? null,
        payload: payload as any,
      },
    })
  } catch (err) {
    // Non-blocking — never fail the user request for telemetry
    logger.warn('[CRM] Failed to track event', { eventType, err })
  }
}

// ============================================
// QUERY HELPERS
// ============================================

/** Get recent events for a subscriber (for personalisation) */
export async function getRecentEvents(email: string, days = 30, limit = 100) {
  const since = new Date(Date.now() - days * 86_400_000)
  return prisma.crmEvent.findMany({
    where: { email, createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/** Count events by type for a subscriber */
export async function getEventCounts(email: string, days = 30) {
  const since = new Date(Date.now() - days * 86_400_000)
  const events = await prisma.crmEvent.groupBy({
    by: ['eventType'],
    where: { email, createdAt: { gte: since } },
    _count: true,
  })
  return Object.fromEntries(events.map(e => [e.eventType, e._count]))
}

/** Detect repeated searches (same query 2+ times in 7 days) */
export async function getRepeatedSearches(email: string) {
  const since = new Date(Date.now() - 7 * 86_400_000)
  const events = await prisma.crmEvent.findMany({
    where: { email, eventType: 'search', createdAt: { gte: since } },
    select: { payload: true },
  })
  const queries = new Map<string, number>()
  for (const e of events) {
    const q = (e.payload as any)?.query?.toLowerCase()
    if (q) queries.set(q, (queries.get(q) || 0) + 1)
  }
  return [...queries.entries()]
    .filter(([, count]) => count >= 2)
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
}

/** Get products viewed multiple times (intent signals) */
export async function getRevisitedProducts(email: string, days = 14) {
  const since = new Date(Date.now() - days * 86_400_000)
  const events = await prisma.crmEvent.findMany({
    where: { email, eventType: 'view_product', createdAt: { gte: since } },
    select: { payload: true },
  })
  const products = new Map<string, number>()
  for (const e of events) {
    const pid = (e.payload as any)?.productId
    if (pid) products.set(pid, (products.get(pid) || 0) + 1)
  }
  return [...products.entries()]
    .filter(([, count]) => count >= 2)
    .map(([productId, views]) => ({ productId, views }))
    .sort((a, b) => b.views - a.views)
}
