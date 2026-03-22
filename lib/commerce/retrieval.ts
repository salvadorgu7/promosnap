// ============================================================================
// UNIFIED COMMERCE ENGINE — Retrieval Layer
// Camada unificada de recuperacao de ofertas para TODOS os canais:
//   - Busca do site (/busca)
//   - Assistente IA (/assistente)
//   - Distribuicao (email, telegram, homepage)
//   - WhatsApp Broadcast
//
// Substitui a logica duplicada em:
//   - lib/whatsapp-broadcast/offer-selector.ts (selectOffers)
//   - lib/distribution/engine.ts (getReadyOffers, getReadyOffersBySegment)
//
// Pipeline: query builder → Prisma fetch → quality gates → dedup → affiliate → map
// ============================================================================

import prisma from "@/lib/db/prisma"
import { logger } from "@/lib/logger"
import type { CommerceIntent, CommerceChannel, QualityGatesConfig, ScoredOffer } from "./types"
import { DEFAULT_QUALITY_GATES, resolveQualityGates, applyQualityGates } from "./quality-gates"
import type { QualityGateInput } from "./quality-gates"
import { buildAffiliateUrl, buildClickoutUrl } from "./affiliate-manager"

const log = logger.child({ module: "commerce.retrieval" })

// ── Opcoes de recuperacao ───────────────────────────────────────────────────

export interface RetrievalOptions {
  intent?: CommerceIntent
  channel: CommerceChannel
  campaignId?: string
  limit?: number
  excludeOfferIds?: string[]
  // Filtros
  categories?: string[]
  marketplaces?: string[]
  brands?: string[]
  budget?: { min?: number; max?: number }
  minScore?: number
  minDiscount?: number
  // Qualidade
  qualityGates?: Partial<QualityGatesConfig>
  requireAffiliate?: boolean
  requireImage?: boolean
  // Diversidade
  maxPerMarketplace?: number  // default 0 = ilimitado
}

// ── Oferta recuperada (antes de scoring final) ──────────────────────────────

export interface RetrievedOffer {
  offerId: string
  productId: string
  productName: string
  productSlug: string
  currentPrice: number
  originalPrice: number | null
  discount: number
  offerScore: number
  sourceSlug: string
  sourceName: string
  imageUrl: string | null
  affiliateUrl: string
  clickoutUrl: string
  isFreeShipping: boolean
  rating: number | null
  reviewsCount: number | null
  couponText: string | null
  categorySlug: string | null
  brandSlug: string | null
  originType: string | null
  popularityScore: number
  // Sinais brutos para scoring posterior
  hasImage: boolean
  hasAffiliate: boolean
  hasDescription: boolean
}

// ── Interface da linha bruta do Prisma ──────────────────────────────────────

interface RawOfferRow {
  id: string
  currentPrice: number
  originalPrice: number | null
  offerScore: number
  affiliateUrl: string | null
  isFreeShipping: boolean
  couponText: string | null
  listing: {
    rating: number | null
    reviewsCount: number | null
    imageUrl: string | null
    rawDescription: string | null
    product: {
      id: string
      name: string
      slug: string
      imageUrl: string | null
      description: string | null
      categoryId: string | null
      brandId: string | null
      originType: string
      popularityScore: number
      category?: { slug: string } | null
      brand?: { slug: string } | null
    } | null
    source: {
      name: string
      slug: string
    }
  }
}

// ── Constantes ──────────────────────────────────────────────────────────────

/** Multiplicador de fetch: busca N vezes o limite para dar margem a quality gates */
const FETCH_MULTIPLIER = 4

/** Score minimo padrao para ofertas */
const DEFAULT_MIN_SCORE = 30

// ── Funcao principal ─────────────────────────────────────────────────────────

/**
 * Recupera ofertas do banco aplicando filtros, quality gates, dedup e affiliate URLs.
 *
 * Fluxo:
 * 1. Monta condicoes Prisma a partir das opcoes (categorias, marketplaces, budget, etc.)
 * 2. Faz fetch com joins (Listing → Product + Source + Category + Brand)
 * 3. Aplica quality gates (preco, desconto, nota, imagem, afiliado)
 * 4. Aplica diversidade por marketplace (maxPerMarketplace)
 * 5. Remove duplicatas por nome normalizado do produto
 * 6. Constroi URLs de afiliado e clickout
 * 7. Retorna RetrievedOffer[]
 */
export async function retrieveOffers(options: RetrievalOptions): Promise<RetrievedOffer[]> {
  const {
    channel,
    campaignId,
    excludeOfferIds = [],
    categories = [],
    marketplaces = [],
    brands = [],
    budget,
    minDiscount,
  } = options

  const limit = options.limit || 10
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE

  const startMs = Date.now()

  // ── 1. Montar condicoes do Prisma ───────────────────────────────────────

  const where = buildWhereClause({
    minScore,
    excludeOfferIds,
    categories,
    marketplaces,
    brands,
    budget,
    requireAffiliate: options.requireAffiliate,
    requireImage: options.requireImage,
  })

  // ── 2. Fetch do banco ─────────────────────────────────────────────────

  const fetchLimit = limit * FETCH_MULTIPLIER
  let rawOffers: RawOfferRow[]

  try {
    rawOffers = await prisma.offer.findMany({
      where,
      orderBy: [
        { offerScore: "desc" },
        { currentPrice: "asc" },
      ],
      take: fetchLimit,
      include: {
        listing: {
          include: {
            product: {
              include: {
                category: true,
                brand: true,
              },
            },
            source: true,
          },
        },
      },
    }) as unknown as RawOfferRow[]
  } catch (error) {
    log.error("retrieval.query-falhou", { error, channel })
    return []
  }

  log.debug("retrieval.fetch-completo", {
    channel,
    fetchLimit,
    retornados: rawOffers.length,
  })

  // ── 3. Filtrar ofertas sem product/source (integridade) ────────────────

  let filtered = rawOffers.filter(
    o => o.listing.product !== null && o.listing.source !== null
  )

  // ── 4. Aplicar quality gates ──────────────────────────────────────────

  const gatesConfig = resolveQualityGates(channel, options.qualityGates)

  // Converter para QualityGateInput para o applyQualityGates generico
  const gateInputs: (QualityGateInput & { _raw: RawOfferRow })[] = filtered.map(o => ({
    currentPrice: o.currentPrice,
    originalPrice: o.originalPrice,
    rating: o.listing.rating,
    imageUrl: o.listing.product?.imageUrl ?? null,
    affiliateUrl: o.affiliateUrl,
    sourceSlug: o.listing.source.slug,
    _raw: o,
  }))

  const gatesPassed = applyQualityGates(gateInputs, gatesConfig)
  filtered = gatesPassed.map(g => g._raw)

  // ── 5. Filtrar por desconto minimo (se especificado) ──────────────────

  if (minDiscount && minDiscount > 0) {
    filtered = filtered.filter(o => {
      if (!o.originalPrice || o.originalPrice <= o.currentPrice) return false
      const discount = Math.round(
        ((o.originalPrice - o.currentPrice) / o.originalPrice) * 100
      )
      return discount >= minDiscount
    })
  }

  // ── 6. Diversidade por marketplace ────────────────────────────────────

  const maxPerMp = options.maxPerMarketplace ?? gatesConfig.maxPerMarketplace
  if (maxPerMp > 0) {
    const mpCounts: Record<string, number> = {}
    filtered = filtered.filter(o => {
      const slug = o.listing.source.slug
      mpCounts[slug] = (mpCounts[slug] || 0) + 1
      return mpCounts[slug] <= maxPerMp
    })
  }

  // ── 7. Dedup por nome normalizado do produto ──────────────────────────

  const seenProducts = new Set<string>()
  filtered = filtered.filter(o => {
    const key = normalizeProductKey(o.listing.product!.name)
    if (seenProducts.has(key)) return false
    seenProducts.add(key)
    return true
  })

  // ── 8. Cortar no limite final ─────────────────────────────────────────

  const finalSlice = filtered.slice(0, limit)

  // ── 9. Mapear para RetrievedOffer com URLs ────────────────────────────

  const result = finalSlice.map((o, i) => mapToRetrievedOffer(o, i, channel, campaignId))

  const elapsedMs = Date.now() - startMs
  log.info("retrieval.completo", {
    channel,
    limit,
    retornados: result.length,
    fetchados: rawOffers.length,
    tempoMs: elapsedMs,
  })

  return result
}

// ── Build where clause ──────────────────────────────────────────────────────

interface WhereClauseOptions {
  minScore: number
  excludeOfferIds: string[]
  categories: string[]
  marketplaces: string[]
  brands: string[]
  budget?: { min?: number; max?: number }
  requireAffiliate?: boolean
  requireImage?: boolean
}

function buildWhereClause(opts: WhereClauseOptions): any {
  const where: any = {
    isActive: true,
    offerScore: { gte: opts.minScore },
    currentPrice: { gte: DEFAULT_QUALITY_GATES.minPrice },
    listing: {
      status: "ACTIVE",
      // Excluir notas ruins no nivel do DB (fast path)
      OR: [
        { rating: null },
        { rating: { gt: DEFAULT_QUALITY_GATES.minRating } },
      ],
      product: {
        status: "ACTIVE",
        hidden: false,
      },
    },
  }

  // Excluir ofertas ja enviadas/vistas
  if (opts.excludeOfferIds.length > 0) {
    where.id = { notIn: opts.excludeOfferIds }
  }

  // Filtro de categorias
  if (opts.categories.length > 0) {
    where.listing.product.category = { slug: { in: opts.categories } }
  }

  // Filtro de marketplaces (sources)
  if (opts.marketplaces.length > 0) {
    where.listing.source = { slug: { in: opts.marketplaces } }
  }

  // Filtro de marcas
  if (opts.brands.length > 0) {
    where.listing.product.brand = { slug: { in: opts.brands } }
  }

  // Filtro de orcamento
  if (opts.budget) {
    if (opts.budget.min) {
      where.currentPrice = {
        ...where.currentPrice,
        gte: Math.max(DEFAULT_QUALITY_GATES.minPrice, opts.budget.min),
      }
    }
    if (opts.budget.max) {
      where.currentPrice = {
        ...where.currentPrice,
        lte: opts.budget.max,
      }
    }
  }

  // Exigir URL de afiliado
  if (opts.requireAffiliate) {
    where.affiliateUrl = { not: null }
  }

  // Exigir imagem no produto
  if (opts.requireImage) {
    where.listing.product.imageUrl = { not: null }
  }

  return where
}

// ── Mapeamento para RetrievedOffer ──────────────────────────────────────────

function mapToRetrievedOffer(
  raw: RawOfferRow,
  position: number,
  channel: CommerceChannel,
  campaignId?: string
): RetrievedOffer {
  const product = raw.listing.product!
  const source = raw.listing.source
  const originalPrice = raw.originalPrice ?? null

  // Calcular desconto
  const discount =
    originalPrice && originalPrice > raw.currentPrice
      ? Math.round(((originalPrice - raw.currentPrice) / originalPrice) * 100)
      : 0

  // Construir URLs
  const affiliateUrl = buildAffiliateUrl(raw.affiliateUrl, product.slug, {
    channel,
    campaignId,
    position,
  })

  const clickoutUrl = buildClickoutUrl(raw.id, {
    channel,
    page: channel,
    block: "commerce-engine",
    position,
    campaignId,
  })

  return {
    offerId: raw.id,
    productId: product.id,
    productName: product.name,
    productSlug: product.slug,
    currentPrice: raw.currentPrice,
    originalPrice,
    discount,
    offerScore: raw.offerScore,
    sourceSlug: source.slug,
    sourceName: source.name,
    imageUrl: product.imageUrl,
    affiliateUrl,
    clickoutUrl,
    isFreeShipping: raw.isFreeShipping,
    rating: raw.listing.rating,
    reviewsCount: raw.listing.reviewsCount,
    couponText: raw.couponText,
    categorySlug: product.category?.slug ?? null,
    brandSlug: product.brand?.slug ?? null,
    originType: product.originType,
    popularityScore: product.popularityScore,
    // Sinais brutos
    hasImage: !!product.imageUrl,
    hasAffiliate: !!raw.affiliateUrl,
    hasDescription: !!(product.description || raw.listing.rawDescription),
  }
}

// ── Normalizacao para dedup ─────────────────────────────────────────────────

/**
 * Normaliza nome do produto para deduplicacao.
 * Remove acentos, caracteres especiais e trunca em 40 chars.
 * Mesmo criterio usado em offer-selector.ts e distribution/engine.ts.
 */
function normalizeProductKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 40)
}
