import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { createHash } from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/diag/shopee — Test Shopee Affiliate API connectivity.
 * Protected by admin auth.
 */
export async function GET(req: NextRequest) {
  const denied = validateAdmin(req)
  if (denied) return denied

  const appId = process.env.SHOPEE_APP_ID
  const appSecret = process.env.SHOPEE_APP_SECRET
  const affiliateId = process.env.SHOPEE_AFFILIATE_ID

  if (!appId || !appSecret) {
    return NextResponse.json({
      ok: false,
      error: 'SHOPEE_APP_ID ou SHOPEE_APP_SECRET ausente',
      env: {
        SHOPEE_APP_ID: appId ? `${appId.slice(0, 4)}...` : 'MISSING',
        SHOPEE_APP_SECRET: appSecret ? `${appSecret.slice(0, 4)}...` : 'MISSING',
        SHOPEE_AFFILIATE_ID: affiliateId ? `${affiliateId.slice(0, 4)}...` : 'MISSING',
      },
    })
  }

  // Build test request
  const timestamp = Math.floor(Date.now() / 1000)
  const query = 'celular'
  const payload = {
    query: `query { productOfferV2(keyword: "${query}", limit: 3, sortType: 2) { nodes { productName itemId shopId priceMin priceMax sales offerLink } } }`,
  }
  const payloadStr = JSON.stringify(payload)

  // Sign: SHA256(AppId + Timestamp + Payload + Secret)
  const factor = `${appId}${timestamp}${payloadStr}${appSecret}`
  const signature = createHash('sha256').update(factor).digest('hex')

  const authHeader = `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`

  try {
    const start = Date.now()
    const res = await fetch('https://open-api.affiliate.shopee.com.br/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: payloadStr,
      signal: AbortSignal.timeout(15000),
    })

    const latencyMs = Date.now() - start
    const body = await res.text()

    let parsed: any = null
    try { parsed = JSON.parse(body) } catch {}

    const products = parsed?.data?.productOfferV2?.nodes || []
    const errors = parsed?.errors || []

    return NextResponse.json({
      ok: res.ok && products.length > 0,
      status: res.status,
      latencyMs,
      productsFound: products.length,
      sampleProduct: products[0] ? {
        name: products[0].productName,
        price: products[0].priceMin ? (products[0].priceMin / 100000).toFixed(2) : null,
        sales: products[0].sales,
        hasOfferLink: !!products[0].offerLink,
      } : null,
      errors: errors.length > 0 ? errors : undefined,
      debug: {
        endpoint: 'https://open-api.affiliate.shopee.com.br/graphql',
        authHeader: authHeader.slice(0, 60) + '...',
        signatureFactor: `AppId(${appId.slice(0, 4)}...) + Timestamp(${timestamp}) + Payload(${payloadStr.length}chars) + Secret(${appSecret.slice(0, 4)}...)`,
        responsePreview: body.slice(0, 500),
      },
      env: {
        SHOPEE_APP_ID: `${appId.slice(0, 6)}...`,
        SHOPEE_APP_SECRET: `${appSecret.slice(0, 4)}...${appSecret.slice(-4)}`,
        SHOPEE_AFFILIATE_ID: affiliateId || 'NOT SET',
      },
    })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: String(err),
      env: {
        SHOPEE_APP_ID: `${appId.slice(0, 6)}...`,
        SHOPEE_APP_SECRET: `${appSecret.slice(0, 4)}...`,
      },
    })
  }
}
