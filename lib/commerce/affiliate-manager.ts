// ============================================================================
// Affiliate Manager Unificado — gestao centralizada de links de afiliado
//
// Unifica a logica duplicada em:
//   - lib/affiliate/index.ts          (deteccao de marketplace + injecao de tag)
//   - lib/whatsapp-broadcast/affiliate-builder.ts (UTM tracking + clickout URL)
//
// REGRA: TODO canal usa o mesmo builder. WhatsApp passa channel='whatsapp',
// site passa channel='site'. UTM params sao sempre adicionados com base no canal.
//
// Logica de marketplace (deteccao de dominio, env vars, params) e DELEGADA
// para lib/affiliate/index.ts — nao reescrevemos aqui.
// ============================================================================

import { logger } from '@/lib/logger'
import {
  buildAffiliateUrl as injectAffiliateTag,
  hasAffiliateTag,
} from '@/lib/affiliate'
import type { CommerceChannel } from './types'

const log = logger.child({ module: 'commerce.affiliate-manager' })

// ── Opcoes do builder de afiliado ─────────────────────────────────────────

export interface AffiliateUrlOptions {
  /** Canal de origem (determina utm_source e utm_medium) */
  channel?: CommerceChannel
  /** ID da campanha (determina utm_campaign) */
  campaignId?: string
  /** Posicao da oferta no resultado (determina utm_content) */
  position?: number
  /** Contexto adicional para utm_term */
  term?: string
}

// ── Opcoes do builder de clickout ─────────────────────────────────────────

export interface ClickoutUrlOptions {
  /** Canal de origem */
  channel?: CommerceChannel
  /** ID da campanha */
  campaignId?: string
  /** Posicao da oferta no resultado */
  position?: number
  /** Tipo de pagina onde o click aconteceu (alias: page) */
  pageType?: string
  /** Alias para pageType — compatibilidade retroativa */
  page?: string
  /** Bloco/secao da UI (ex: 'hero', 'price-comparison') */
  block?: string
}

// ── Mapeamento canal -> UTM source/medium ─────────────────────────────────

interface UtmMapping {
  source: string
  medium: string
}

const CHANNEL_UTM_MAP: Record<CommerceChannel, UtmMapping> = {
  site:     { source: 'promosnap', medium: 'site' },
  whatsapp: { source: 'whatsapp',  medium: 'broadcast' },
  telegram: { source: 'telegram',  medium: 'broadcast' },
  email:    { source: 'promosnap', medium: 'email' },
  api:      { source: 'promosnap', medium: 'api' },
}

// ============================================================================
// Builder de URL de afiliado
// ============================================================================

/**
 * Constroi URL de afiliado completa com tag do marketplace + UTM tracking.
 *
 * Fluxo:
 *   1. Se affiliateUrl estiver vazia, usa fallback para pagina do produto
 *   2. Delega injecao da tag de afiliado para lib/affiliate/index.ts
 *   3. Adiciona parametros UTM baseados no canal
 *
 * Aceita duas formas de chamada (overload por compatibilidade):
 *   - buildAffiliateUrl(url, options?)
 *   - buildAffiliateUrl(affiliateUrl, productSlug, options)
 *
 * @returns URL completa com tag de afiliado e UTMs
 */
export function buildAffiliateUrl(
  urlOrAffiliateUrl: string | null,
  optionsOrSlug?: AffiliateUrlOptions | string,
  maybeOptions?: AffiliateUrlOptions,
): string {
  // Resolver overload: 3 args = (affiliateUrl | null, productSlug, options)
  let url: string
  let options: AffiliateUrlOptions | undefined

  if (typeof optionsOrSlug === 'string') {
    // Chamada com 3 args: buildAffiliateUrl(affiliateUrl, productSlug, options)
    const productSlug = optionsOrSlug
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.promosnap.com.br'
    url = urlOrAffiliateUrl || `${appUrl}/produto/${productSlug}`
    options = maybeOptions
  } else {
    // Chamada com 2 args: buildAffiliateUrl(url, options?)
    url = urlOrAffiliateUrl || ''
    options = optionsOrSlug
  }

  if (!url) return ''

  // Passo 1: injetar tag de afiliado do marketplace (delega para lib/affiliate)
  let result = injectAffiliateTag(url)

  // Passo 2: adicionar UTMs se canal foi especificado
  if (options?.channel) {
    result = appendUtmParams(result, options)
  }

  return result
}

// ============================================================================
// Builder de URL de clickout
// ============================================================================

/**
 * Constroi URL de clickout do PromoSnap para rastreamento de cliques.
 * Usa /api/clickout/[offerId] para registrar o click antes de redirecionar.
 *
 * Cada canal gera params de tracking ligeiramente diferentes para atribuicao.
 *
 * @param offerId - ID da oferta no banco
 * @param options - Configuracao do canal, campanha e posicao
 * @returns URL de clickout (path relativo: /api/clickout/xxx?page=...&...)
 */
export function buildClickoutUrl(
  offerId: string,
  options?: ClickoutUrlOptions,
): string {
  const base = `/api/clickout/${offerId}`
  const params = new URLSearchParams()

  // Pagina de origem (aceita pageType ou page por compatibilidade)
  const pageType = options?.pageType || options?.page || channelToPageType(options?.channel)
  params.set('page', pageType)

  // Canal
  if (options?.channel) {
    params.set('channel', options.channel)
  }

  // Bloco/secao
  if (options?.block) {
    params.set('block', options.block)
  }

  // Campanha
  if (options?.campaignId) {
    params.set('campaign', options.campaignId)
  }

  // Posicao
  if (options?.position !== undefined) {
    params.set('pos', String(options.position))
  }

  return `${base}?${params.toString()}`
}

// ============================================================================
// Validacao e verificacao
// ============================================================================

/**
 * Verifica se uma URL ja possui tracking de afiliado.
 * Checa tanto tags de marketplace quanto UTMs.
 *
 * @param url - URL para verificar
 * @returns true se ja tem algum tipo de tracking
 */
export function hasAffiliateTracking(url: string): boolean {
  if (!url) return false

  // Verificar tag de marketplace via lib/affiliate
  if (hasAffiliateTag(url)) return true

  // Verificar UTMs do PromoSnap
  try {
    const parsed = new URL(url)
    return parsed.searchParams.has('utm_source')
  } catch {
    return false
  }
}

/**
 * Valida a integridade do link de afiliado.
 * Retorna detalhes sobre marketplace detectado, tag presente e UTMs.
 *
 * Util para dashboards de saude e diagnostico de links quebrados.
 *
 * @param url - URL para validar
 * @returns Resultado detalhado da validacao
 */
export function validateAffiliateIntegrity(url: string): {
  valid: boolean
  marketplace?: string
  tag?: string
  hasUtm: boolean
  issues: string[]
} {
  const issues: string[] = []
  let marketplace: string | undefined
  let tag: string | undefined
  let hasUtm = false

  if (!url) {
    return { valid: false, hasUtm: false, issues: ['URL vazia'] }
  }

  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()

    // Detectar marketplace
    marketplace = detectMarketplaceName(hostname)

    // Verificar tag de afiliado
    const hasTag = hasAffiliateTag(url)
    if (!hasTag && marketplace) {
      issues.push(`Marketplace ${marketplace} detectado mas sem tag de afiliado`)
    }

    // Extrair tag se presente
    if (hasTag) {
      tag = extractAffiliateTag(parsed, marketplace)
    }

    // Verificar UTMs
    hasUtm = parsed.searchParams.has('utm_source')
    if (!hasUtm) {
      issues.push('UTM params ausentes — atribuicao de canal limitada')
    }

    return {
      valid: issues.length === 0,
      marketplace,
      tag,
      hasUtm,
      issues,
    }
  } catch {
    return {
      valid: false,
      hasUtm: false,
      issues: ['URL invalida — nao foi possivel parsear'],
    }
  }
}

// ============================================================================
// Helpers internos
// ============================================================================

/**
 * Adiciona parametros UTM a uma URL com base no canal e opcoes.
 */
function appendUtmParams(url: string, options: AffiliateUrlOptions): string {
  try {
    const parsed = new URL(url)
    const utm = CHANNEL_UTM_MAP[options.channel || 'site']

    parsed.searchParams.set('utm_source', utm.source)
    parsed.searchParams.set('utm_medium', utm.medium)

    if (options.campaignId) {
      parsed.searchParams.set('utm_campaign', options.campaignId)
    }

    if (options.position !== undefined) {
      parsed.searchParams.set('utm_content', `pos_${options.position}`)
    }

    if (options.term) {
      parsed.searchParams.set('utm_term', options.term)
    }

    return parsed.toString()
  } catch (err) {
    log.debug('affiliate-manager.utm-fallback', { url, error: err })
    // Fallback: append como query string simples
    const utm = CHANNEL_UTM_MAP[options.channel || 'site']
    const sep = url.includes('?') ? '&' : '?'
    let result = `${url}${sep}utm_source=${utm.source}&utm_medium=${utm.medium}`
    if (options.campaignId) {
      result += `&utm_campaign=${options.campaignId}`
    }
    return result
  }
}

/**
 * Mapeia canal para o valor do parametro 'page' no clickout.
 */
function channelToPageType(channel?: CommerceChannel): string {
  const map: Record<CommerceChannel, string> = {
    site: 'site',
    whatsapp: 'whatsapp',
    telegram: 'telegram',
    email: 'email',
    api: 'api',
  }
  return channel ? (map[channel] || 'site') : 'site'
}

// ── Deteccao de marketplace por hostname ──────────────────────────────────

/** Dominios conhecidos e seus nomes amigaveis */
const MARKETPLACE_DOMAINS: [string, string][] = [
  ['amazon.com.br', 'Amazon'],
  ['mercadolivre.com.br', 'Mercado Livre'],
  ['mercadolibre.com', 'Mercado Livre'],
  ['produto.mercadolivre.com.br', 'Mercado Livre'],
  ['shopee.com.br', 'Shopee'],
  ['shein.com', 'Shein'],
  ['shein.com.br', 'Shein'],
  ['sheingsp.com', 'Shein'],
  ['shein.top', 'Shein'],
  ['magazineluiza.com.br', 'Magazine Luiza'],
  ['magalu.com', 'Magazine Luiza'],
  ['kabum.com.br', 'KaBuM'],
]

/**
 * Detecta o nome amigavel do marketplace pelo hostname.
 */
function detectMarketplaceName(hostname: string): string | undefined {
  for (const [domain, name] of MARKETPLACE_DOMAINS) {
    if (hostname.includes(domain)) {
      return name
    }
  }
  return undefined
}

// ── Extracao de tag de afiliado ───────────────────────────────────────────

/** Mapa marketplace -> parametro que contem a tag */
const MARKETPLACE_TAG_PARAMS: Record<string, string> = {
  'Amazon': 'tag',
  'Mercado Livre': 'matt_tool',
  'Shopee': 'af_id',
  'Shein': 'aff_id',
  'Magazine Luiza': 'partner_id',
  'KaBuM': 'tag',
}

/**
 * Extrai o valor da tag de afiliado de uma URL parseada.
 * Usa o parametro correto para cada marketplace.
 */
function extractAffiliateTag(parsed: URL, marketplace?: string): string | undefined {
  // Tentar pelo marketplace especifico
  if (marketplace && MARKETPLACE_TAG_PARAMS[marketplace]) {
    const value = parsed.searchParams.get(MARKETPLACE_TAG_PARAMS[marketplace])
    if (value) return value
  }

  // Fallback: tentar todos os params conhecidos
  const allParams = Object.values(MARKETPLACE_TAG_PARAMS)
  const uniqueParams = Array.from(new Set(allParams))
  for (const param of uniqueParams) {
    const value = parsed.searchParams.get(param)
    if (value) return value
  }

  return undefined
}
