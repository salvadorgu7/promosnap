/**
 * Conversion Tracking — records and reconciles affiliate postback data.
 *
 * Flow:
 * 1. Clickout happens → clickout ID is appended as sub_id to affiliate URL
 * 2. Affiliate network reports sale → calls our postback endpoint
 * 3. We match sub_id → clickout and record the Conversion
 * 4. Revenue attribution uses real conversion data when available
 */

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

// ── Types ───────────────────────────────────────────────────────────────────

export interface PostbackPayload {
  source: string
  subId?: string
  externalTxId?: string
  orderValue?: number
  commission?: number
  currency?: string
  status?: 'pending' | 'confirmed' | 'rejected'
  raw?: Record<string, unknown>
}

export interface ConversionResult {
  success: boolean
  conversionId?: string
  matched: boolean
  error?: string
}

// ── Postback Parsers (per affiliate network) ────────────────────────────────

/**
 * Parse Amazon Associates postback.
 * Amazon typically uses their own reporting API — this handles manual/automated imports.
 */
export function parseAmazonPostback(params: Record<string, string>): PostbackPayload {
  return {
    source: 'amazon',
    subId: params.sub_id || params.clickref || params.subid,
    externalTxId: params.transaction_id || params.order_id,
    orderValue: parseFloat(params.order_value || params.amount || '0') || undefined,
    commission: parseFloat(params.commission || params.earnings || '0') || undefined,
    currency: params.currency || 'BRL',
    status: normalizeStatus(params.status),
    raw: params,
  }
}

/**
 * Parse Mercado Livre affiliate postback.
 */
export function parseMercadoLivrePostback(params: Record<string, string>): PostbackPayload {
  return {
    source: 'mercadolivre',
    subId: params.sub_id || params.subid || params.click_id,
    externalTxId: params.order_id || params.transaction_id,
    orderValue: parseFloat(params.order_amount || params.amount || '0') || undefined,
    commission: parseFloat(params.commission || '0') || undefined,
    currency: 'BRL',
    status: normalizeStatus(params.status || params.event_type),
    raw: params,
  }
}

/**
 * Parse Shopee affiliate postback.
 */
export function parseShopeePostback(params: Record<string, string>): PostbackPayload {
  return {
    source: 'shopee',
    subId: params.sub_id || params.custom_id || params.aff_sub,
    externalTxId: params.order_sn || params.transaction_id,
    orderValue: parseFloat(params.purchase_amount || params.amount || '0') || undefined,
    commission: parseFloat(params.estimated_commission || params.commission || '0') || undefined,
    currency: 'BRL',
    status: normalizeStatus(params.status),
    raw: params,
  }
}

/**
 * Parse Shein affiliate postback.
 */
export function parseSheinPostback(params: Record<string, string>): PostbackPayload {
  return {
    source: 'shein',
    subId: params.sub_id || params.subid || params.click_id,
    externalTxId: params.order_no || params.transaction_id,
    orderValue: parseFloat(params.order_amount || params.amount || '0') || undefined,
    commission: parseFloat(params.commission || '0') || undefined,
    currency: params.currency || 'BRL',
    status: normalizeStatus(params.status),
    raw: params,
  }
}

/**
 * Generic parser for unknown sources.
 */
export function parseGenericPostback(source: string, params: Record<string, string>): PostbackPayload {
  return {
    source,
    subId: params.sub_id || params.subid || params.click_id || params.clickref,
    externalTxId: params.transaction_id || params.order_id || params.tx_id,
    orderValue: parseFloat(params.order_value || params.amount || params.sale_amount || '0') || undefined,
    commission: parseFloat(params.commission || params.payout || '0') || undefined,
    currency: params.currency || 'BRL',
    status: normalizeStatus(params.status || params.event),
    raw: params,
  }
}

// ── Parser Router ───────────────────────────────────────────────────────────

const PARSERS: Record<string, (params: Record<string, string>) => PostbackPayload> = {
  amazon: parseAmazonPostback,
  mercadolivre: parseMercadoLivrePostback,
  shopee: parseShopeePostback,
  shein: parseSheinPostback,
}

export function parsePostback(source: string, params: Record<string, string>): PostbackPayload {
  const parser = PARSERS[source]
  return parser ? parser(params) : parseGenericPostback(source, params)
}

// ── Core Recording ──────────────────────────────────────────────────────────

/**
 * Record a conversion from a postback. Matches to clickout via subId when possible.
 */
export async function recordConversion(payload: PostbackPayload): Promise<ConversionResult> {
  try {
    // Try to match to existing clickout
    let clickoutId: string | undefined

    if (payload.subId) {
      const clickout = await prisma.clickout.findUnique({
        where: { id: payload.subId },
        select: { id: true },
      })
      if (clickout) {
        clickoutId = clickout.id
      }
    }

    const statusMap = {
      pending: 'PENDING' as const,
      confirmed: 'CONFIRMED' as const,
      rejected: 'REJECTED' as const,
    }

    const conversion = await prisma.conversion.upsert({
      where: {
        source_externalTxId: {
          source: payload.source,
          externalTxId: payload.externalTxId || `unknown-${Date.now()}`,
        },
      },
      create: {
        clickoutId,
        source: payload.source,
        externalTxId: payload.externalTxId,
        subId: payload.subId,
        orderValue: payload.orderValue,
        commission: payload.commission,
        currency: payload.currency || 'BRL',
        status: statusMap[payload.status || 'pending'] || 'PENDING',
        postbackRaw: payload.raw as any,
        confirmedAt: payload.status === 'confirmed' ? new Date() : undefined,
      },
      update: {
        orderValue: payload.orderValue,
        commission: payload.commission,
        status: statusMap[payload.status || 'pending'] || undefined,
        postbackRaw: payload.raw as any,
        confirmedAt: payload.status === 'confirmed' ? new Date() : undefined,
      },
    })

    logger.info('[Conversion] Recorded', {
      conversionId: conversion.id,
      source: payload.source,
      matched: !!clickoutId,
      status: payload.status,
      commission: payload.commission,
    })

    return {
      success: true,
      conversionId: conversion.id,
      matched: !!clickoutId,
    }
  } catch (err) {
    logger.error('[Conversion] Recording failed', { source: payload.source, err })
    return {
      success: false,
      matched: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

// ── Metrics ─────────────────────────────────────────────────────────────────

export interface ConversionMetrics {
  totalConversions: number
  confirmedConversions: number
  pendingConversions: number
  rejectedConversions: number
  totalGMV: number
  totalCommission: number
  matchRate: number
  bySource: Array<{
    source: string
    conversions: number
    gmv: number
    commission: number
  }>
}

export async function getConversionMetrics(days = 30): Promise<ConversionMetrics> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  try {
    const conversions = await prisma.conversion.findMany({
      where: { createdAt: { gte: since } },
      select: {
        source: true,
        orderValue: true,
        commission: true,
        status: true,
        clickoutId: true,
      },
    })

    const bySourceMap = new Map<string, { conversions: number; gmv: number; commission: number }>()

    let confirmed = 0
    let pending = 0
    let rejected = 0
    let matched = 0
    let totalGMV = 0
    let totalCommission = 0

    for (const c of conversions) {
      if (c.status === 'CONFIRMED') confirmed++
      else if (c.status === 'PENDING') pending++
      else rejected++

      if (c.clickoutId) matched++
      totalGMV += c.orderValue || 0
      totalCommission += c.commission || 0

      const existing = bySourceMap.get(c.source) || { conversions: 0, gmv: 0, commission: 0 }
      existing.conversions++
      existing.gmv += c.orderValue || 0
      existing.commission += c.commission || 0
      bySourceMap.set(c.source, existing)
    }

    return {
      totalConversions: conversions.length,
      confirmedConversions: confirmed,
      pendingConversions: pending,
      rejectedConversions: rejected,
      totalGMV,
      totalCommission,
      matchRate: conversions.length > 0 ? matched / conversions.length : 0,
      bySource: Array.from(bySourceMap.entries()).map(([source, data]) => ({
        source,
        ...data,
      })),
    }
  } catch (err) {
    logger.error('[Conversion] Metrics failed', { err })
    return {
      totalConversions: 0,
      confirmedConversions: 0,
      pendingConversions: 0,
      rejectedConversions: 0,
      totalGMV: 0,
      totalCommission: 0,
      matchRate: 0,
      bySource: [],
    }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function normalizeStatus(raw?: string): 'pending' | 'confirmed' | 'rejected' {
  if (!raw) return 'pending'
  const lower = raw.toLowerCase()
  if (lower.includes('confirm') || lower.includes('approved') || lower === 'sale') return 'confirmed'
  if (lower.includes('reject') || lower.includes('cancel') || lower.includes('refund')) return 'rejected'
  return 'pending'
}
