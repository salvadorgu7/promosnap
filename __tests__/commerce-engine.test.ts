/**
 * UNIFIED COMMERCE ENGINE — Tests
 *
 * Testa os modulos do nucleo unico de comercio:
 *   - quality-gates: validacao e filtragem de ofertas
 *   - scoring: pontuacao com presets por contexto
 *   - comparison: comparacao lado a lado
 *   - affiliate-manager: URLs de afiliado e clickout
 *   - memory: sessoes conversacionais
 *   - site-adapter: conversao para blocos do site
 *   - whatsapp-adapter: conversao para mensagem WhatsApp
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db/prisma", () => ({
  default: {
    offer: {
      findMany: vi.fn().mockRejectedValue(new Error("mock")),
    },
  },
}))

vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}))

vi.mock("@/lib/affiliate", () => ({
  buildAffiliateUrl: (url: string) => url || "",
  hasAffiliateTag: (url: string) => url.includes("tag="),
}))

// ── Imports pos-mock ─────────────────────────────────────────────────────────

import {
  DEFAULT_QUALITY_GATES,
  failsQualityGate,
  applyQualityGates,
  resolveQualityGates,
  applyQualityGatesWithStats,
} from "@/lib/commerce/quality-gates"

import {
  scoreOffer,
  rankOffers,
  listPresets,
  getPresetWeights,
  presetFromIntentMode,
} from "@/lib/commerce/scoring"

import { compareOffers } from "@/lib/commerce/comparison"

import {
  buildAffiliateUrl,
  buildClickoutUrl,
  hasAffiliateTracking,
  validateAffiliateIntegrity,
} from "@/lib/commerce/affiliate-manager"

import {
  getOrCreateSession,
  recordInteraction,
  getSessionContext,
  enrichIntentFromMemory,
  cleanExpiredSessions,
  getActiveSessionCount,
} from "@/lib/commerce/memory"

import { adaptForSite } from "@/lib/commerce/site-adapter"
import { adaptForWhatsApp } from "@/lib/commerce/whatsapp-adapter"

import type { ScoredOffer, CommerceResponse, CommerceIntent } from "@/lib/commerce/types"
import type { CommercialSignals } from "@/lib/ranking/commercial"

// ── Factories ──────────────────────────────────────────────────────────────────

function makeScoredOffer(overrides: Partial<ScoredOffer> = {}): ScoredOffer {
  return {
    offerId: "offer-1",
    productId: "prod-1",
    productName: "iPhone 15 Pro 128GB",
    productSlug: "iphone-15-pro-128gb",
    currentPrice: 5499,
    originalPrice: 6999,
    discount: 21,
    sourceSlug: "amazon",
    sourceName: "Amazon",
    imageUrl: "https://img.test/iphone.jpg",
    affiliateUrl: "https://amazon.com.br/dp/B123?tag=promosnap-20",
    clickoutUrl: "/api/clickout/offer-1?page=site",
    isFreeShipping: true,
    rating: 4.7,
    reviewsCount: 1250,
    couponText: null,
    commercialScore: 85,
    scoreBreakdown: { relevance: 22, dealQuality: 25, demand: 18, trust: 12, commercial: 8 },
    boosts: ["has_affiliate", "has_image"],
    position: 0,
    ...overrides,
  }
}

function makeSignals(overrides: Partial<CommercialSignals> = {}): CommercialSignals {
  return {
    currentPrice: 1500,
    originalPrice: 2000,
    hasImage: true,
    hasDescription: true,
    hasAffiliate: true,
    rating: 4.5,
    reviewsCount: 100,
    isFreeShipping: true,
    hasCoupon: false,
    originType: "imported",
    ...overrides,
  }
}

function makeResponse(overrides: Partial<CommerceResponse> = {}): CommerceResponse {
  return {
    intent: {
      type: "cheapest",
      mode: "decisional",
      urgency: "medium",
      priceKeywords: true,
      comparisonKeywords: false,
      confidence: 0.8,
    },
    offers: [makeScoredOffer(), makeScoredOffer({ offerId: "offer-2", productSlug: "galaxy-s24", productName: "Galaxy S24", currentPrice: 3999, commercialScore: 72, position: 1 })],
    comparison: undefined,
    totalFound: 15,
    internalCount: 2,
    externalCount: 0,
    channel: "site",
    suggestAlert: false,
    suggestExternalSearch: false,
    timing: { intentMs: 1, retrievalMs: 50, scoringMs: 10, totalMs: 61 },
    retrievalSources: ["amazon", "mercadolivre"],
    ...overrides,
  }
}

// ============================================================================
// Quality Gates
// ============================================================================

describe("Quality Gates", () => {
  it("aprova oferta valida", () => {
    const result = failsQualityGate({
      currentPrice: 100,
      originalPrice: 150,
      rating: 4.5,
      imageUrl: "https://img.test/a.jpg",
      affiliateUrl: "https://amazon.com.br/dp/B123",
    })
    expect(result.passes).toBe(true)
  })

  it("rejeita preco abaixo do minimo", () => {
    const result = failsQualityGate({ currentPrice: 2 })
    expect(result.passes).toBe(false)
    expect(result.reason).toContain("minimo")
  })

  it("rejeita desconto acima de 85%", () => {
    const result = failsQualityGate({ currentPrice: 10, originalPrice: 100 })
    expect(result.passes).toBe(false)
    expect(result.reason).toContain("maximo")
  })

  it("rejeita nota baixa", () => {
    const result = failsQualityGate({ currentPrice: 50, rating: 1.5 })
    expect(result.passes).toBe(false)
    expect(result.reason).toContain("Nota")
  })

  it("aceita rating null (sem avaliacao)", () => {
    const result = failsQualityGate({ currentPrice: 50, rating: null })
    expect(result.passes).toBe(true)
  })

  it("rejeita sem imagem quando requireImage=true", () => {
    const result = failsQualityGate(
      { currentPrice: 50 },
      { ...DEFAULT_QUALITY_GATES, requireImage: true }
    )
    expect(result.passes).toBe(false)
    expect(result.reason).toContain("Imagem")
  })

  it("rejeita sem afiliado quando requireAffiliate=true", () => {
    const result = failsQualityGate(
      { currentPrice: 50 },
      { ...DEFAULT_QUALITY_GATES, requireAffiliate: true }
    )
    expect(result.passes).toBe(false)
    expect(result.reason).toContain("afiliado")
  })

  it("resolve gates para WhatsApp com requireImage", () => {
    const config = resolveQualityGates("whatsapp")
    expect(config.requireImage).toBe(true)
    // requireAffiliate e maxPerMarketplace sao controlados pelo offer-selector, nao pelo quality gate
    expect(config.requireAffiliate).toBe(false)
    expect(config.maxPerMarketplace).toBe(0)
  })

  it("applyQualityGates filtra lista corretamente", () => {
    const offers = [
      { currentPrice: 100, sourceSlug: "amazon" },
      { currentPrice: 2, sourceSlug: "amazon" },   // preco baixo
      { currentPrice: 50, rating: 1.0, sourceSlug: "ml" }, // nota baixa
      { currentPrice: 200, sourceSlug: "shopee" },
    ]
    const passed = applyQualityGates(offers)
    expect(passed).toHaveLength(2) // 100 e 200
    expect(passed[0].currentPrice).toBe(100)
    expect(passed[1].currentPrice).toBe(200)
  })

  it("applyQualityGatesWithStats retorna estatisticas", () => {
    const offers = [
      { currentPrice: 100, sourceSlug: "a" },
      { currentPrice: 1, sourceSlug: "b" },
    ]
    const { offers: passed, stats } = applyQualityGatesWithStats(offers)
    expect(passed).toHaveLength(1)
    expect(stats.total).toBe(2)
    expect(stats.passed).toBe(1)
    expect(stats.rejected).toBe(1)
    expect(Object.keys(stats.rejectionReasons).length).toBeGreaterThan(0)
  })
})

// ============================================================================
// Scoring
// ============================================================================

describe("Scoring", () => {
  it("pontua oferta com sinais completos", () => {
    const result = scoreOffer(makeSignals())
    expect(result.total).toBeGreaterThan(0)
    expect(result.total).toBeLessThanOrEqual(100)
    expect(result.presetUsed).toBe("default")
  })

  it("aplica boosts para imported + affiliate + image", () => {
    const result = scoreOffer(makeSignals({
      originType: "imported",
      hasAffiliate: true,
      hasImage: true,
    }))
    expect(result.boosts).toContain("originType_imported")
    expect(result.boosts).toContain("has_affiliate")
    expect(result.boosts).toContain("has_image")
  })

  it("usa preset whatsapp com pesos diferentes", () => {
    const defResult = scoreOffer(makeSignals(), { preset: "default" })
    const waResult = scoreOffer(makeSignals(), { preset: "whatsapp" })
    // WhatsApp deve pontuar dealQuality mais alto
    expect(waResult.breakdown.dealQuality).toBeGreaterThanOrEqual(defResult.breakdown.dealQuality - 5)
    expect(waResult.presetUsed).toBe("whatsapp")
  })

  it("fallback para default se preset invalido", () => {
    const result = scoreOffer(makeSignals(), { preset: "nao_existe" })
    expect(result.presetUsed).toBe("default")
  })

  it("rankOffers ordena por score decrescente", () => {
    const items = [
      makeSignals({ currentPrice: 50, hasAffiliate: false, hasImage: false }),
      makeSignals({ currentPrice: 500, hasAffiliate: true, hasImage: true, rating: 4.8 }),
      makeSignals({ currentPrice: 200, hasAffiliate: true }),
    ]
    const ranked = rankOffers(items, (s) => s)
    expect(ranked[0].score.total).toBeGreaterThanOrEqual(ranked[1].score.total)
    expect(ranked[1].score.total).toBeGreaterThanOrEqual(ranked[2].score.total)
    expect(ranked[0].position).toBe(0)
    expect(ranked[2].position).toBe(2)
  })

  it("listPresets retorna todos os 13 presets", () => {
    const presets = listPresets()
    expect(Object.keys(presets).length).toBe(13)
    expect(presets).toHaveProperty("default")
    expect(presets).toHaveProperty("whatsapp")
    expect(presets).toHaveProperty("assistant")
    expect(presets).toHaveProperty("comparison")
  })

  it("getPresetWeights retorna pesos corretos", () => {
    const weights = getPresetWeights("whatsapp")
    expect(weights.dealQuality).toBe(35)
    expect(weights.trust).toBe(25)
  })

  it("presetFromIntentMode mapeia corretamente", () => {
    expect(presetFromIntentMode("exploratory")).toBe("exploratory")
    expect(presetFromIntentMode("comparative")).toBe("comparison")
    expect(presetFromIntentMode("decisional")).toBe("deal")
    expect(presetFromIntentMode("urgent")).toBe("deal")
    expect(presetFromIntentMode("desconhecido")).toBe("default")
  })
})

// ============================================================================
// Comparison
// ============================================================================

describe("Comparison", () => {
  it("retorna null com menos de 2 ofertas", () => {
    const result = compareOffers([makeScoredOffer()])
    expect(result).toBeNull()
  })

  it("compara 2 ofertas e gera dimensoes", () => {
    const offers = [
      makeScoredOffer({ currentPrice: 5000, productSlug: "a", commercialScore: 85 }),
      makeScoredOffer({ currentPrice: 4000, productSlug: "b", sourceName: "ML", commercialScore: 70 }),
    ]
    const result = compareOffers(offers)
    expect(result).not.toBeNull()
    expect(result!.dimensions.length).toBeGreaterThanOrEqual(3) // Preco, Desconto, Loja, Frete, Score
    expect(result!.cheapest).toBe("b")
    expect(result!.bestValue).toBe("a")
    expect(result!.verdict).toBeTruthy()
  })

  it("identifica mesmo produto como cheapest e bestValue quando merece", () => {
    const offers = [
      makeScoredOffer({ currentPrice: 3000, productSlug: "winner", commercialScore: 90 }),
      makeScoredOffer({ currentPrice: 5000, productSlug: "loser", commercialScore: 60 }),
    ]
    const result = compareOffers(offers)
    expect(result!.cheapest).toBe("winner")
    expect(result!.bestValue).toBe("winner")
    expect(result!.verdict).toContain("melhor opcao")
  })

  it("limita produtos ao maxProducts", () => {
    const offers = Array.from({ length: 10 }, (_, i) =>
      makeScoredOffer({ productSlug: `prod-${i}`, commercialScore: 90 - i * 5 })
    )
    const result = compareOffers(offers, { maxProducts: 3 })
    expect(result!.products).toHaveLength(3)
  })
})

// ============================================================================
// Affiliate Manager
// ============================================================================

describe("Affiliate Manager", () => {
  it("buildAffiliateUrl com 2 argumentos", () => {
    const url = buildAffiliateUrl("https://amazon.com.br/dp/B123", { channel: "site" })
    expect(url).toContain("utm_source=promosnap")
    expect(url).toContain("utm_medium=site")
  })

  it("buildAffiliateUrl com 3 argumentos (overload)", () => {
    const url = buildAffiliateUrl("https://amazon.com.br/dp/B123", "iphone-15", { channel: "whatsapp" })
    expect(url).toContain("utm_source=whatsapp")
    expect(url).toContain("utm_medium=broadcast")
  })

  it("buildAffiliateUrl sem URL usa fallback para pagina do produto", () => {
    const url = buildAffiliateUrl(null, "iphone-15", { channel: "site" })
    expect(url).toContain("/produto/iphone-15")
  })

  it("buildClickoutUrl gera path correto", () => {
    const url = buildClickoutUrl("offer-123", { channel: "whatsapp", position: 0, block: "hero" })
    expect(url).toContain("/api/clickout/offer-123")
    expect(url).toContain("channel=whatsapp")
    expect(url).toContain("pos=0")
    expect(url).toContain("block=hero")
  })

  it("hasAffiliateTracking detecta tag", () => {
    expect(hasAffiliateTracking("https://amazon.com.br/dp/B123?tag=promosnap-20")).toBe(true)
    expect(hasAffiliateTracking("https://amazon.com.br/dp/B123?utm_source=promosnap")).toBe(true)
  })

  it("validateAffiliateIntegrity retorna resultado detalhado", () => {
    const result = validateAffiliateIntegrity("https://amazon.com.br/dp/B123?tag=promosnap-20&utm_source=promosnap")
    expect(result.valid).toBe(true)
    expect(result.marketplace).toBe("Amazon")
    expect(result.hasUtm).toBe(true)
  })

  it("validateAffiliateIntegrity detecta URL vazia", () => {
    const result = validateAffiliateIntegrity("")
    expect(result.valid).toBe(false)
    expect(result.issues).toContain("URL vazia")
  })
})

// ============================================================================
// Memory
// ============================================================================

describe("Memory", () => {
  beforeEach(() => {
    cleanExpiredSessions()
  })

  it("cria e recupera sessao", () => {
    const session = getOrCreateSession("test-1", "site")
    expect(session.sessionId).toBe("test-1")
    expect(session.channel).toBe("site")
    expect(session.entries).toHaveLength(0)
  })

  it("registra interacao e recupera contexto", () => {
    getOrCreateSession("test-2", "whatsapp")
    recordInteraction("test-2", {
      query: "celular barato",
      intent: {
        type: "cheapest",
        mode: "exploratory",
        urgency: "low",
        priceKeywords: true,
        comparisonKeywords: false,
        confidence: 0.7,
      },
      selectedProducts: ["galaxy-a54"],
      categories: ["celulares"],
      brands: ["Samsung"],
      budget: { max: 2000 },
    })

    const ctx = getSessionContext("test-2")
    expect(ctx).not.toBeNull()
    expect(ctx!.recentCategories).toContain("celulares")
    expect(ctx!.recentBrands).toContain("Samsung")
    expect(ctx!.recentProducts).toContain("galaxy-a54")
    expect(ctx!.recentBudget?.max).toBe(2000)
  })

  it("enrichIntentFromMemory herda categorias e brands", () => {
    getOrCreateSession("test-3", "site")
    recordInteraction("test-3", {
      query: "notebook gamer",
      intent: {
        type: "discovery",
        mode: "exploratory",
        urgency: "low",
        priceKeywords: false,
        comparisonKeywords: false,
        confidence: 0.5,
      },
      selectedProducts: ["acer-nitro-5"],
      categories: ["notebooks"],
      brands: ["Acer"],
    })

    const newIntent: CommerceIntent = {
      type: "cheapest",
      mode: "decisional",
      urgency: "medium",
      priceKeywords: true,
      comparisonKeywords: false,
      confidence: 0.8,
      // Nao especifica categorias ou marcas
    }

    const enriched = enrichIntentFromMemory(newIntent, "test-3")
    expect(enriched.categories).toContain("notebooks")
    expect(enriched.brands).toContain("Acer")
  })

  it("getActiveSessionCount conta sessoes", () => {
    getOrCreateSession("count-1", "site")
    getOrCreateSession("count-2", "whatsapp")
    expect(getActiveSessionCount()).toBeGreaterThanOrEqual(2)
  })
})

// ============================================================================
// Site Adapter
// ============================================================================

describe("Site Adapter", () => {
  it("gera blocos para resposta com ofertas", () => {
    const response = makeResponse()
    const siteResp = adaptForSite(response)
    expect(siteResp.blocks.length).toBeGreaterThan(0)
    expect(siteResp.blocks[0].type).toBe("offer_cards")
    expect(siteResp.summary).toBeTruthy()
  })

  it("gera bloco verdict para intent decisional", () => {
    const response = makeResponse({
      intent: {
        type: "worth_it",
        mode: "decisional",
        urgency: "medium",
        priceKeywords: true,
        comparisonKeywords: false,
        confidence: 0.9,
      },
    })
    const siteResp = adaptForSite(response)
    const verdictBlock = siteResp.blocks.find(b => b.type === "verdict")
    expect(verdictBlock).toBeDefined()
  })

  it("gera summary mesmo sem ofertas", () => {
    const response = makeResponse({ offers: [] })
    const siteResp = adaptForSite(response)
    expect(siteResp.summary).toContain("Nao encontramos")
  })

  it("gera refinamentos", () => {
    const response = makeResponse()
    const siteResp = adaptForSite(response)
    expect(siteResp.refinements.length).toBeGreaterThan(0)
  })
})

// ============================================================================
// WhatsApp Adapter
// ============================================================================

describe("WhatsApp Adapter", () => {
  it("gera mensagem shortlist para 2+ ofertas", () => {
    const response = makeResponse()
    const waResp = adaptForWhatsApp(response)
    expect(waResp.structure).toBe("shortlist")
    expect(waResp.offerCount).toBe(2)
    expect(waResp.text).toContain("R$")
  })

  it("gera mensagem single para 1 oferta", () => {
    const response = makeResponse({ offers: [makeScoredOffer()] })
    const waResp = adaptForWhatsApp(response)
    expect(waResp.structure).toBe("single")
    expect(waResp.offerCount).toBe(1)
    expect(waResp.text).toContain("iPhone 15 Pro")
  })

  it("gera mensagem hero para best_under_budget", () => {
    const response = makeResponse({
      intent: {
        type: "best_under_budget",
        mode: "decisional",
        urgency: "medium",
        priceKeywords: true,
        comparisonKeywords: false,
        confidence: 0.9,
        budget: { max: 6000 },
      },
    })
    const waResp = adaptForWhatsApp(response)
    expect(waResp.structure).toBe("hero")
    expect(waResp.text).toContain("recomendacao")
  })

  it("gera mensagem comparativa", () => {
    const response = makeResponse({
      intent: {
        type: "compare_models",
        mode: "comparative",
        urgency: "medium",
        priceKeywords: false,
        comparisonKeywords: true,
        confidence: 0.85,
      },
      comparison: {
        products: [makeScoredOffer(), makeScoredOffer({ productSlug: "b" })],
        dimensions: [],
        verdict: "iPhone ganha em tudo",
        bestValue: "iphone-15-pro-128gb",
        cheapest: "iphone-15-pro-128gb",
      },
    })
    const waResp = adaptForWhatsApp(response)
    expect(waResp.structure).toBe("comparativo")
    expect(waResp.text).toContain("Comparacao")
  })

  it("respeita limite de 3000 caracteres", () => {
    const lotsOfOffers = Array.from({ length: 20 }, (_, i) =>
      makeScoredOffer({
        offerId: `o-${i}`,
        productName: `Produto com nome longo para testar limite de caracteres numero ${i}`,
        productSlug: `prod-${i}`,
        position: i,
      })
    )
    const response = makeResponse({ offers: lotsOfOffers })
    const waResp = adaptForWhatsApp(response)
    expect(waResp.text.length).toBeLessThanOrEqual(3000)
  })

  it("gera mensagem vazia quando sem resultados", () => {
    const response = makeResponse({ offers: [] })
    const waResp = adaptForWhatsApp(response)
    expect(waResp.offerCount).toBe(0)
    expect(waResp.text).toContain("Nao encontrei")
  })
})
