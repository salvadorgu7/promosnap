/**
 * Affiliate Conversion Postback Endpoint
 *
 * Receives conversion notifications from affiliate networks.
 * Each affiliate program calls: GET/POST /api/postback/{source}?sub_id=xxx&...
 *
 * Security: validated by POSTBACK_SECRET or source-specific tokens.
 * Supports: Amazon, Mercado Livre, Shopee, Shein, and generic sources.
 */

import { NextRequest, NextResponse } from 'next/server'
import { parsePostback, recordConversion } from '@/lib/conversions'
import { logger } from '@/lib/logger'

const VALID_SOURCES = ['amazon', 'mercadolivre', 'shopee', 'shein'] as const

function validatePostbackAuth(request: NextRequest, source: string): boolean {
  // Check source-specific token first
  const sourceTokenEnv = `POSTBACK_SECRET_${source.toUpperCase()}`
  const sourceToken = process.env[sourceTokenEnv]
  const genericToken = process.env.POSTBACK_SECRET

  const authHeader = request.headers.get('authorization')
  const tokenParam = request.nextUrl.searchParams.get('token') || request.nextUrl.searchParams.get('secret')

  const providedToken = authHeader?.replace('Bearer ', '') || tokenParam

  // If no secrets configured, allow all postbacks (development mode)
  if (!sourceToken && !genericToken) {
    return true
  }

  if (providedToken && (providedToken === sourceToken || providedToken === genericToken)) {
    return true
  }

  return false
}

// Support both GET and POST — different affiliate networks use different methods
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ source: string }> },
) {
  return handlePostback(request, params)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ source: string }> },
) {
  return handlePostback(request, params)
}

async function handlePostback(
  request: NextRequest,
  paramsPromise: Promise<{ source: string }>,
) {
  const { source } = await paramsPromise

  // Validate source
  if (!VALID_SOURCES.includes(source as any) && !source.match(/^[a-z0-9-]+$/)) {
    return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
  }

  // Validate auth
  if (!validatePostbackAuth(request, source)) {
    logger.warn('[Postback] Unauthorized attempt', { source, ip: request.headers.get('x-forwarded-for') })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Collect all params from URL + body
    const urlParams: Record<string, string> = {}
    request.nextUrl.searchParams.forEach((value, key) => {
      if (key !== 'token' && key !== 'secret') {
        urlParams[key] = value
      }
    })

    // Merge body params if POST
    if (request.method === 'POST') {
      try {
        const contentType = request.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          const body = await request.json()
          Object.assign(urlParams, flattenObject(body))
        } else if (contentType.includes('form')) {
          const formData = await request.formData()
          formData.forEach((value, key) => {
            urlParams[key] = String(value)
          })
        }
      } catch {
        // Body parsing failed — use URL params only
      }
    }

    // Parse and record
    const payload = parsePostback(source, urlParams)
    const result = await recordConversion(payload)

    logger.info('[Postback] Processed', {
      source,
      success: result.success,
      matched: result.matched,
      conversionId: result.conversionId,
    })

    // Return 200 with minimal info (affiliate networks expect simple OK)
    return NextResponse.json({
      ok: result.success,
      matched: result.matched,
    })
  } catch (err) {
    logger.error('[Postback] Error', { source, err })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// Flatten nested JSON body to flat key-value pairs
function flattenObject(obj: Record<string, any>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}_${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, fullKey))
    } else {
      result[fullKey] = String(value)
    }
  }
  return result
}
