/**
 * AMAZON STRATEGY — PromoSnap
 *
 * promosnap-20 = Affiliate Tracking Tag (Associates Program)
 * NÃO é cupom de desconto para o usuário.
 * É o identificador que atribui comissão ao PromoSnap quando o usuário compra via Amazon.
 *
 * Status Atual: MANUAL / AFFILIATE TAG
 * - Conta Amazon Associates: ATIVA
 * - Tracking Tag: promosnap-20
 * - PA-API 5.0: NÃO CONFIGURADA
 * - Creators API: NÃO VERIFICADA
 * - Feed de produtos: NÃO INTEGRADO
 * - Clickout: FUNCIONAL (via tag=promosnap-20 no URL)
 *
 * Caminhos oficiais possíveis:
 * 1. Amazon Creators API — programa mais recente, ideal para content creators
 * 2. PA-API 5.0 — API clássica de Product Advertising, requer aprovação separada
 * 3. Apenas Associates (manual) — links de afiliado sem API, funciona hoje
 *
 * O que funciona AGORA:
 * 1. Links de afiliado com tag=promosnap-20 geram comissão
 * 2. Clickout pipeline appende tag automaticamente em URLs Amazon
 * 3. Source routing reconhece amazon-br (quality 0.95, revenue 4%)
 * 4. Import manual de produtos Amazon via pipeline
 *
 * O que NÃO funciona ainda:
 * 1. Busca automática de produtos Amazon
 * 2. Sincronização de preços Amazon
 * 3. Feed sync periódico
 * 4. Ingestão automatizada de catálogo
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Canonical affiliate tag for PromoSnap.
 * Used in all Amazon URLs for commission attribution.
 * ENV override: AMAZON_AFFILIATE_TAG or AMAZON_PARTNER_TAG
 */
export const AMAZON_TRACKING_TAG =
  process.env.AMAZON_AFFILIATE_TAG ||
  process.env.AMAZON_PARTNER_TAG ||
  "promosnap-20"

export const AMAZON_BASE_URL = "https://www.amazon.com.br"

// ---------------------------------------------------------------------------
// API Path Detection
// ---------------------------------------------------------------------------

export type AmazonApiPath = "creators" | "pa-api" | "associates-only" | "unknown"

export interface AmazonApiStatus {
  path: AmazonApiPath
  creatorsApi: { configured: boolean; envVars: string[] }
  paApi: { configured: boolean; envVars: string[] }
  affiliateTag: { configured: boolean; value: string }
  description: string
}

/**
 * Detects which Amazon API path is available based on env vars.
 * Does NOT validate credentials — only checks presence.
 */
export function detectAmazonApiPath(): AmazonApiStatus {
  const hasCreatorsToken = !!process.env.AMAZON_CREATORS_TOKEN
  const hasCreatorsSecret = !!process.env.AMAZON_CREATORS_SECRET
  const creatorsConfigured = hasCreatorsToken && hasCreatorsSecret

  const hasAccessKey = !!process.env.AMAZON_ACCESS_KEY
  const hasSecretKey = !!process.env.AMAZON_SECRET_KEY
  const paApiConfigured = hasAccessKey && hasSecretKey

  const tagValue = AMAZON_TRACKING_TAG
  const tagConfigured = tagValue !== ""

  let path: AmazonApiPath = "unknown"
  let description = ""

  if (creatorsConfigured) {
    path = "creators"
    description = "Creators API configurada — caminho recomendado"
  } else if (paApiConfigured) {
    path = "pa-api"
    description = "PA-API 5.0 configurada — ponte temporária, migrar para Creators quando possível"
  } else if (tagConfigured) {
    path = "associates-only"
    description = "Apenas Associates (links de afiliado) — funcional para clickout e campanhas manuais"
  } else {
    path = "unknown"
    description = "Nenhuma configuração Amazon detectada"
  }

  return {
    path,
    creatorsApi: {
      configured: creatorsConfigured,
      envVars: ["AMAZON_CREATORS_TOKEN", "AMAZON_CREATORS_SECRET"],
    },
    paApi: {
      configured: paApiConfigured,
      envVars: ["AMAZON_ACCESS_KEY", "AMAZON_SECRET_KEY"],
    },
    affiliateTag: {
      configured: tagConfigured,
      value: tagValue,
    },
    description,
  }
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

export interface AmazonCampaign {
  id: string
  name: string
  description: string
  startDate: string // ISO
  endDate?: string // ISO, optional for evergreen
  tag: string // affiliate tracking tag
  landingUrl: string
  category?: string
  isActive: boolean
}

export const AMAZON_CAMPAIGNS: AmazonCampaign[] = [
  {
    id: "evergreen-affiliate",
    name: "Link de Afiliado PromoSnap",
    description: "Compras via este link geram comissão para o PromoSnap — sem custo extra para o usuário",
    startDate: "2024-01-01",
    tag: AMAZON_TRACKING_TAG,
    landingUrl: `${AMAZON_BASE_URL}/?tag=${AMAZON_TRACKING_TAG}`,
    isActive: true,
  },
]

export function getActiveCampaigns(): AmazonCampaign[] {
  const now = new Date().toISOString()
  return AMAZON_CAMPAIGNS.filter((c) => {
    if (!c.isActive) return false
    if (c.endDate && c.endDate < now) return false
    return true
  })
}

// ---------------------------------------------------------------------------
// URL Building
// ---------------------------------------------------------------------------

/**
 * Builds an Amazon affiliate URL with the PromoSnap tracking tag.
 * @param url - Any Amazon URL (product, search, category, homepage)
 * @param tag - Override tag (defaults to AMAZON_TRACKING_TAG)
 */
export function buildAmazonAffiliateUrl(url: string, tag = AMAZON_TRACKING_TAG): string {
  try {
    const parsed = new URL(url)
    parsed.searchParams.set("tag", tag)
    return parsed.toString()
  } catch {
    const separator = url.includes("?") ? "&" : "?"
    return `${url}${separator}tag=${tag}`
  }
}

/**
 * Builds an Amazon search URL with affiliate tracking.
 */
export function buildAmazonSearchUrl(query: string, tag = AMAZON_TRACKING_TAG): string {
  return `${AMAZON_BASE_URL}/s?k=${encodeURIComponent(query)}&tag=${tag}`
}

/**
 * Builds an Amazon product URL from ASIN with affiliate tracking.
 */
export function buildAmazonProductUrl(asin: string, tag = AMAZON_TRACKING_TAG): string {
  return `${AMAZON_BASE_URL}/dp/${asin}?tag=${tag}`
}

export function isAmazonUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      parsed.hostname.includes("amazon.com.br") ||
      parsed.hostname.includes("amazon.com") ||
      parsed.hostname.includes("amzn.to")
    )
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Readiness
// ---------------------------------------------------------------------------

export type AmazonReadinessLevel = "not-configured" | "affiliate-only" | "api-partial" | "api-full"

export interface AmazonReadiness {
  level: AmazonReadinessLevel
  apiPath: AmazonApiPath
  affiliateTag: { ok: boolean; value: string }
  creatorsApi: { ok: boolean; missing: string[] }
  paApi: { ok: boolean; missing: string[] }
  feedSync: boolean
  nextStep: string
  capabilities: string[]
}

export function checkAmazonReadiness(): AmazonReadiness {
  const apiStatus = detectAmazonApiPath()
  const feedSync = false // Not yet implemented

  const creatorsConfigured = apiStatus.creatorsApi.configured
  const paApiConfigured = apiStatus.paApi.configured
  const tagOk = apiStatus.affiliateTag.configured

  // Determine missing env vars
  const creatorsMissing = creatorsConfigured
    ? []
    : apiStatus.creatorsApi.envVars.filter((v) => !process.env[v])
  const paApiMissing = paApiConfigured
    ? []
    : apiStatus.paApi.envVars.filter((v) => !process.env[v])

  // Determine level
  let level: AmazonReadinessLevel = "not-configured"
  if (creatorsConfigured && feedSync) level = "api-full"
  else if (creatorsConfigured || paApiConfigured) level = "api-partial"
  else if (tagOk) level = "affiliate-only"

  // Capabilities
  const capabilities: string[] = []
  if (tagOk) {
    capabilities.push("clickout-tracking", "affiliate-links", "manual-campaigns")
  }
  if (paApiConfigured) {
    capabilities.push("product-search", "price-lookup")
  }
  if (creatorsConfigured) {
    capabilities.push("creators-content", "product-recommendations")
  }
  if (feedSync) {
    capabilities.push("feed-sync", "auto-import")
  }

  // Next step
  let nextStep = ""
  if (!tagOk) {
    nextStep = "Configurar AMAZON_AFFILIATE_TAG no .env com o valor 'promosnap-20'"
  } else if (!creatorsConfigured && !paApiConfigured) {
    nextStep = "Verificar acesso à Creators API (recomendado) ou PA-API 5.0 no Amazon Associates"
  } else if (creatorsConfigured && !feedSync) {
    nextStep = "Implementar feed sync com Creators API"
  } else if (paApiConfigured && !feedSync) {
    nextStep = "Implementar feed sync com PA-API 5.0 (considerar migração para Creators API)"
  } else {
    nextStep = "Amazon totalmente integrada — monitorar performance"
  }

  return {
    level,
    apiPath: apiStatus.path,
    affiliateTag: { ok: tagOk, value: apiStatus.affiliateTag.value },
    creatorsApi: { ok: creatorsConfigured, missing: creatorsMissing },
    paApi: { ok: paApiConfigured, missing: paApiMissing },
    feedSync,
    nextStep,
    capabilities,
  }
}
