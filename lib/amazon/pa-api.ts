/**
 * Amazon Product API Client — Creators API (primary) + PA-API 5.0 (legacy fallback)
 *
 * Creators API (recommended):
 *   - OAuth 2.0 client credentials flow
 *   - Env vars: AMAZON_CREDENTIAL_ID, AMAZON_CREDENTIAL_SECRET
 *   - Endpoint: https://api.amazon.com/paapi5/
 *
 * PA-API 5.0 (deprecated May 2026):
 *   - AWS Signature V4
 *   - Env vars: AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY
 *   - Endpoint: https://webservices.amazon.com.br/paapi5/
 *
 * Both APIs share the same operations: SearchItems, GetItems, GetVariations
 * Creators API uses lowerCamelCase, PA-API uses PascalCase.
 *
 * Rate limit: ~1 request/second (both APIs)
 */

import { createHmac, createHash } from 'crypto'
import { logger } from '@/lib/logger'
import { AMAZON_TRACKING_TAG } from './strategy'

const log = logger.child({ module: 'amazon-api' })

// ─── Configuration ───────────────────────────────────────────────────────────

// Creators API (primary)
const CREATORS_API_ENDPOINT = 'https://api.amazon.com/paapi5'
const CREATORS_TOKEN_URL = 'https://api.amazon.com/auth/o2/token'

// PA-API 5.0 (legacy fallback, deprecated May 2026)
const PA_API_HOST = 'webservices.amazon.com.br'
const PA_API_REGION = 'us-east-1'
const PA_API_SERVICE = 'ProductAdvertisingAPI'
const PA_API_ENDPOINT = `https://${PA_API_HOST}/paapi5`

type ApiMode = 'creators' | 'pa-api' | 'none'

function detectApiMode(): ApiMode {
  if (process.env.AMAZON_CREDENTIAL_ID && process.env.AMAZON_CREDENTIAL_SECRET) {
    return 'creators'
  }
  if (process.env.AMAZON_ACCESS_KEY && process.env.AMAZON_SECRET_KEY) {
    return 'pa-api'
  }
  return 'none'
}

export function isApiConfigured(): boolean {
  return detectApiMode() !== 'none'
}

// Alias for backward compat
export const isPaApiConfigured = isApiConfigured

// ─── OAuth 2.0 Token Cache (Creators API) ────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null

async function getCreatorsToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token
  }

  const credentialId = process.env.AMAZON_CREDENTIAL_ID!
  const credentialSecret = process.env.AMAZON_CREDENTIAL_SECRET!

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: credentialId,
    client_secret: credentialSecret,
    scope: 'paapi::SearchItems paapi::GetItems paapi::GetVariations',
  })

  const res = await fetch(CREATORS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) {
    const errorText = await res.text().catch(() => '')
    log.error('creators.token-failed', { status: res.status, error: errorText.slice(0, 300) })
    throw new Error(`Creators API token failed: ${res.status}`)
  }

  const data = await res.json()
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  }

  log.info('creators.token-refreshed', { expiresIn: data.expires_in })
  return cachedToken.token
}

// ─── AWS Signature V4 (PA-API legacy) ────────────────────────────────────────

function getAmzDate(): { amzDate: string; dateStamp: string } {
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  return { amzDate, dateStamp }
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf-8').digest()
}

function sha256(data: string): string {
  return createHash('sha256').update(data, 'utf-8').digest('hex')
}

function getSignatureKey(secretKey: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmacSha256(`AWS4${secretKey}`, dateStamp)
  const kRegion = hmacSha256(kDate, region)
  const kService = hmacSha256(kRegion, service)
  return hmacSha256(kService, 'aws4_request')
}

function signPaApiRequest(operation: string, payload: string): Record<string, string> {
  const accessKey = process.env.AMAZON_ACCESS_KEY!
  const secretKey = process.env.AMAZON_SECRET_KEY!
  const { amzDate, dateStamp } = getAmzDate()
  const path = `/paapi5/${operation.toLowerCase()}`
  const contentType = 'application/json; charset=UTF-8'
  const target = `com.amazon.paapi5.v1.ProductAdvertisingAPIv1.${operation}`

  const canonicalHeaders = [
    `content-encoding:amz-1.0`,
    `content-type:${contentType}`,
    `host:${PA_API_HOST}`,
    `x-amz-date:${amzDate}`,
    `x-amz-target:${target}`,
  ].join('\n')

  const signedHeaders = 'content-encoding;content-type;host;x-amz-date;x-amz-target'
  const payloadHash = sha256(payload)

  const canonicalRequest = [
    'POST', path, '', canonicalHeaders, '', signedHeaders, payloadHash,
  ].join('\n')

  const credentialScope = `${dateStamp}/${PA_API_REGION}/${PA_API_SERVICE}/aws4_request`
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256(canonicalRequest)].join('\n')

  const signingKey = getSignatureKey(secretKey, dateStamp, PA_API_REGION, PA_API_SERVICE)
  const signature = createHmac('sha256', signingKey).update(stringToSign, 'utf-8').digest('hex')

  return {
    'Content-Encoding': 'amz-1.0',
    'Content-Type': contentType,
    'Host': PA_API_HOST,
    'X-Amz-Date': amzDate,
    'X-Amz-Target': target,
    'Authorization': `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  }
}

// ─── Unified API Call ────────────────────────────────────────────────────────

async function callApi(operation: string, payload: object): Promise<any> {
  const mode = detectApiMode()
  if (mode === 'none') throw new Error('Amazon API not configured')

  const body = JSON.stringify(payload)

  let url: string
  let headers: Record<string, string>

  if (mode === 'creators') {
    const token = await getCreatorsToken()
    url = `${CREATORS_API_ENDPOINT}/${operation.toLowerCase()}`
    headers = {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': `Bearer ${token}`,
    }
  } else {
    // PA-API legacy
    url = `${PA_API_ENDPOINT}/${operation.toLowerCase()}`
    headers = signPaApiRequest(operation, body)
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body,
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '')
    log.error('amazon-api.request-failed', {
      mode,
      operation,
      status: res.status,
      error: errorBody.slice(0, 500),
    })
    throw new Error(`Amazon API ${operation} failed: ${res.status}`)
  }

  return res.json()
}

// ─── Result Types ────────────────────────────────────────────────────────────

const ITEM_RESOURCES = [
  'Images.Primary.Large',
  'ItemInfo.Title',
  'ItemInfo.ByLineInfo',
  'ItemInfo.Features',
  'ItemInfo.ProductInfo',
  'ItemInfo.TechnicalInfo',
  'Offers.Listings.Price',
  'Offers.Listings.SavingBasis',
  'Offers.Listings.Availability.Type',
  'Offers.Listings.DeliveryInfo.IsFreeShippingEligible',
  'Offers.Listings.MerchantInfo',
  'BrowseNodeInfo.BrowseNodes.SalesRank',
]

export interface AmazonProduct {
  asin: string
  title: string
  brand?: string
  imageUrl?: string
  currentPrice?: number
  originalPrice?: number
  currency: string
  availability: 'in_stock' | 'out_of_stock' | 'unknown'
  isFreeShipping: boolean
  sellerName?: string
  salesRank?: number
  features?: string[]
  detailPageUrl: string
}

function parseItem(item: any): AmazonProduct | null {
  try {
    const asin = item.ASIN
    if (!asin) return null

    const title = item.ItemInfo?.Title?.DisplayValue || `Amazon ${asin}`
    const brand = item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue
    const imageUrl = item.Images?.Primary?.Large?.URL

    const listing = item.Offers?.Listings?.[0]
    const currentPrice = listing?.Price?.Amount
    const originalPrice = listing?.SavingBasis?.Amount
    const currency = listing?.Price?.Currency || 'BRL'

    const availType = listing?.Availability?.Type || ''
    let availability: AmazonProduct['availability'] = 'unknown'
    if (availType === 'Now') availability = 'in_stock'
    else if (availType === 'OutOfStock') availability = 'out_of_stock'

    const isFreeShipping = listing?.DeliveryInfo?.IsFreeShippingEligible === true
    const sellerName = listing?.MerchantInfo?.Name
    const features = item.ItemInfo?.Features?.DisplayValues
    const salesRank = item.BrowseNodeInfo?.BrowseNodes?.[0]?.SalesRank
    const detailPageUrl = item.DetailPageURL || `https://www.amazon.com.br/dp/${asin}`

    return {
      asin, title, brand, imageUrl, currentPrice, originalPrice, currency,
      availability, isFreeShipping, sellerName, salesRank, features, detailPageUrl,
    }
  } catch (err) {
    log.warn('amazon-api.parse-item-failed', { error: String(err) })
    return null
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function searchItems(
  query: string,
  options?: { category?: string; minPrice?: number; maxPrice?: number; limit?: number }
): Promise<AmazonProduct[]> {
  const payload: any = {
    Keywords: query,
    Resources: ITEM_RESOURCES,
    PartnerTag: AMAZON_TRACKING_TAG,
    PartnerType: 'Associates',
    Marketplace: 'www.amazon.com.br',
    ItemCount: Math.min(options?.limit || 10, 10),
  }

  if (options?.category) {
    payload.SearchIndex = mapCategory(options.category)
  }
  if (options?.minPrice) payload.MinPrice = Math.round(options.minPrice * 100)
  if (options?.maxPrice) payload.MaxPrice = Math.round(options.maxPrice * 100)

  try {
    const data = await callApi('SearchItems', payload)
    const items = data.SearchResult?.Items || []
    return items.map(parseItem).filter(Boolean) as AmazonProduct[]
  } catch (err) {
    log.error('amazon-api.search-failed', { query, error: String(err) })
    return []
  }
}

export async function getItems(asins: string[]): Promise<AmazonProduct[]> {
  const batch = asins.slice(0, 10)
  const payload = {
    ItemIds: batch,
    Resources: ITEM_RESOURCES,
    PartnerTag: AMAZON_TRACKING_TAG,
    PartnerType: 'Associates',
    Marketplace: 'www.amazon.com.br',
  }

  try {
    const data = await callApi('GetItems', payload)
    const items = data.ItemsResult?.Items || []
    return items.map(parseItem).filter(Boolean) as AmazonProduct[]
  } catch (err) {
    log.error('amazon-api.get-items-failed', { asins: batch, error: String(err) })
    return []
  }
}

export async function getItem(asin: string): Promise<AmazonProduct | null> {
  const results = await getItems([asin])
  return results[0] || null
}

// ─── Category Mapping ────────────────────────────────────────────────────────

function mapCategory(slug: string): string {
  const map: Record<string, string> = {
    celulares: 'Electronics', smartphones: 'Electronics', notebooks: 'Computers',
    laptops: 'Computers', tvs: 'Electronics', fones: 'Electronics', audio: 'Electronics',
    games: 'VideoGames', 'video-games': 'VideoGames', livros: 'Books',
    eletrodomesticos: 'Kitchen', 'air-fryer': 'Kitchen', perfumes: 'Beauty',
    beleza: 'Beauty', moda: 'Fashion', esportes: 'SportingGoods', brinquedos: 'Toys',
    ferramentas: 'Tools', casa: 'HomeAndGarden', automotivo: 'Automotive',
    informatica: 'Computers', acessorios: 'Electronics',
  }
  return map[slug] || 'All'
}
