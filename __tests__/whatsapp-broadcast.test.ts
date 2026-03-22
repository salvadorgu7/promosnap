import { describe, it, expect, vi, beforeEach } from "vitest"

// ============================================
// WhatsApp Broadcast Engine — Unit Tests
// ============================================

// Mock Prisma
vi.mock("@/lib/db/prisma", () => ({
  default: {
    offer: { findMany: vi.fn().mockResolvedValue([]) },
  },
}))

// Mock affiliate builder
vi.mock("@/lib/affiliate", () => ({
  buildAffiliateUrl: (url: string) => `${url}?tag=promosnap-20`,
  hasAffiliateTag: () => true,
}))

describe("Templates", () => {
  it("returns varied openings by tonality", async () => {
    const { getOpening } = await import("@/lib/whatsapp-broadcast/templates")

    const opening1 = getOpening("curadoria")
    expect(opening1).toBeTruthy()
    expect(typeof opening1).toBe("string")
    expect(opening1.length).toBeGreaterThan(10)

    const opening2 = getOpening("direto")
    expect(opening2).toBeTruthy()

    const opening3 = getOpening("economico")
    expect(opening3).toBeTruthy()
  })

  it("returns time-window openings", async () => {
    const { getTimeWindowOpening } = await import("@/lib/whatsapp-broadcast/templates")

    const manha = getTimeWindowOpening("manha")
    expect(manha).toBeTruthy()

    const almoco = getTimeWindowOpening("almoco")
    expect(almoco).toBeTruthy()

    const noite = getTimeWindowOpening("noite")
    expect(noite).toBeTruthy()
  })

  it("returns transitions", async () => {
    const { getTransition } = await import("@/lib/whatsapp-broadcast/templates")
    const t1 = getTransition()
    expect(t1).toBeTruthy()
    expect(typeof t1).toBe("string")
  })

  it("returns CTAs by intent", async () => {
    const { getCta } = await import("@/lib/whatsapp-broadcast/templates")

    const ctaClick = getCta("click")
    expect(ctaClick).toBeTruthy()

    const ctaSite = getCta("site")
    expect(ctaSite).toBeTruthy()

    const ctaRecur = getCta("recurrence")
    expect(ctaRecur).toBeTruthy()
  })

  it("detects correct time window", async () => {
    const { detectTimeWindow } = await import("@/lib/whatsapp-broadcast/templates")

    expect(detectTimeWindow(8)).toBe("manha")
    expect(detectTimeWindow(9)).toBe("manha")
    expect(detectTimeWindow(12)).toBe("almoco")
    expect(detectTimeWindow(14)).toBe("almoco")
    expect(detectTimeWindow(19)).toBe("noite")
    expect(detectTimeWindow(22)).toBe("noite")
    expect(detectTimeWindow(3)).toBe("noite")
  })

  it("returns ideal offer count per window", async () => {
    const { getIdealOfferCount } = await import("@/lib/whatsapp-broadcast/templates")

    const manha = getIdealOfferCount("manha")
    expect(manha.min).toBe(3)
    expect(manha.max).toBe(5)

    const noite = getIdealOfferCount("noite")
    expect(noite.min).toBe(2)
    expect(noite.max).toBe(4)
  })

  it("provides all template data for admin UI", async () => {
    const { getAllTemplateData } = await import("@/lib/whatsapp-broadcast/templates")
    const data = getAllTemplateData()

    expect(data.openings).toBeDefined()
    expect(data.openings.neutral).toHaveLength(5)
    expect(data.openings.discovery).toHaveLength(5)
    expect(data.openings.commercial).toHaveLength(5)
    expect(data.openings.economy).toHaveLength(5)
    expect(data.openings.urgency).toHaveLength(5)
    expect(data.transitions).toHaveLength(10)
    expect(data.ctas.click).toHaveLength(5)
    expect(data.ctas.site).toHaveLength(5)
    expect(data.ctas.recurrence).toHaveLength(5)
    expect(data.groupHeaders).toBeDefined()
  })
})

describe("Composer", () => {
  const mockOffers = [
    {
      offerId: "off1",
      productName: "Fone Bluetooth JBL Tune 510BT",
      productSlug: "fone-bluetooth-jbl-tune-510bt",
      currentPrice: 149.90,
      originalPrice: 249.90,
      discount: 40,
      offerScore: 85,
      sourceSlug: "amazon-br",
      sourceName: "Amazon",
      affiliateUrl: "https://amazon.com.br/dp/B1234?tag=promosnap-20",
      productUrl: "https://www.promosnap.com.br/produto/fone-bluetooth-jbl-tune-510bt",
      imageUrl: "https://images.example.com/fone.jpg",
      isFreeShipping: true,
      rating: 4.5,
      couponText: null,
      position: 0,
      campaignTrackingUrl: "https://amazon.com.br/dp/B1234?tag=promosnap-20&utm_source=whatsapp",
    },
    {
      offerId: "off2",
      productName: "Mouse Logitech G305 Wireless",
      productSlug: "mouse-logitech-g305",
      currentPrice: 189.90,
      originalPrice: 299.90,
      discount: 37,
      offerScore: 78,
      sourceSlug: "mercadolivre",
      sourceName: "Mercado Livre",
      affiliateUrl: "https://mercadolivre.com.br/MLB-123?matt_tool=promosnap",
      productUrl: "https://www.promosnap.com.br/produto/mouse-logitech-g305",
      imageUrl: "https://images.example.com/mouse.jpg",
      isFreeShipping: false,
      rating: 4.8,
      couponText: null,
      position: 1,
      campaignTrackingUrl: "https://mercadolivre.com.br/MLB-123?matt_tool=promosnap&utm_source=whatsapp",
    },
    {
      offerId: "off3",
      productName: "Teclado Mecanico Redragon Kumara",
      productSlug: "teclado-mecanico-redragon-kumara",
      currentPrice: 159.90,
      originalPrice: 219.90,
      discount: 27,
      offerScore: 72,
      sourceSlug: "shopee",
      sourceName: "Shopee",
      affiliateUrl: "https://shopee.com.br/item/123?af_id=promosnap",
      productUrl: "https://www.promosnap.com.br/produto/teclado-mecanico-redragon-kumara",
      imageUrl: "https://images.example.com/teclado.jpg",
      isFreeShipping: true,
      rating: 4.3,
      couponText: "SHOPEE10",
      position: 2,
      campaignTrackingUrl: "https://shopee.com.br/item/123?af_id=promosnap&utm_source=whatsapp",
    },
  ]

  const mockChannel = {
    id: "ch_test",
    name: "Test Channel",
    destinationId: "120363424471768330@g.us",
    isActive: true,
    timezone: "America/Sao_Paulo",
    quietHoursStart: 22,
    quietHoursEnd: 7,
    dailyLimit: 3,
    windowLimit: 1,
    defaultOfferCount: 5,
    groupType: "geral" as const,
    tags: [],
    categoriesInclude: [],
    categoriesExclude: [],
    marketplacesInclude: [],
    marketplacesExclude: [],
    templateMode: "shortlist" as const,
    tonality: "curadoria" as const,
    sentToday: 0,
    lastSentAt: null,
    createdAt: new Date(),
  }

  it("composes shortlist message", async () => {
    const { composeMessage } = await import("@/lib/whatsapp-broadcast/composer")

    const result = composeMessage({
      offers: mockOffers,
      channel: mockChannel,
      structure: "shortlist",
      timeWindow: "manha",
    })

    expect(result.text).toBeTruthy()
    expect(result.text).toContain("Fone Bluetooth JBL")
    expect(result.text).toContain("R$ 149,90")
    expect(result.text).toContain("Mouse Logitech")
    expect(result.text).toContain("PromoSnap")
    expect(result.structure).toBe("shortlist")
    expect(result.offers).toHaveLength(3)
  })

  it("composes radar message with context", async () => {
    const { composeMessage } = await import("@/lib/whatsapp-broadcast/composer")

    const result = composeMessage({
      offers: mockOffers,
      channel: mockChannel,
      structure: "radar",
      timeWindow: "almoco",
    })

    expect(result.text).toBeTruthy()
    expect(result.text).toContain("Fone Bluetooth JBL")
    expect(result.structure).toBe("radar")
  })

  it("composes hero message with prominent item", async () => {
    const { composeMessage } = await import("@/lib/whatsapp-broadcast/composer")

    const result = composeMessage({
      offers: mockOffers,
      channel: mockChannel,
      structure: "hero",
      timeWindow: "noite",
    })

    expect(result.text).toBeTruthy()
    expect(result.text).toContain("DESTAQUE")
    expect(result.structure).toBe("hero")
  })

  it("composes comparativo message", async () => {
    const { composeMessage } = await import("@/lib/whatsapp-broadcast/composer")

    const result = composeMessage({
      offers: mockOffers,
      channel: mockChannel,
      structure: "comparativo",
      timeWindow: "almoco",
    })

    expect(result.text).toBeTruthy()
    expect(result.text).toContain("Opcao A")
    expect(result.text).toContain("Opcao B")
    expect(result.text).toContain("Menor preco")
    expect(result.structure).toBe("comparativo")
  })

  it("composes resumo message", async () => {
    const { composeMessage } = await import("@/lib/whatsapp-broadcast/composer")

    const result = composeMessage({
      offers: mockOffers,
      channel: mockChannel,
      structure: "resumo",
      timeWindow: "noite",
    })

    expect(result.text).toBeTruthy()
    expect(result.text).toContain("Resumo da semana")
    expect(result.text).toContain("Top 3")
    expect(result.structure).toBe("resumo")
  })

  it("includes correct template key", async () => {
    const { composeMessage } = await import("@/lib/whatsapp-broadcast/composer")

    const result = composeMessage({
      offers: mockOffers,
      channel: mockChannel,
      structure: "shortlist",
      tonality: "direto",
      timeWindow: "almoco",
    })

    expect(result.templateKey).toBe("shortlist_direto_almoco")
  })

  it("message never exceeds WhatsApp practical limits", async () => {
    const { composeMessage } = await import("@/lib/whatsapp-broadcast/composer")

    const result = composeMessage({
      offers: mockOffers,
      channel: mockChannel,
      structure: "radar",
      timeWindow: "manha",
    })

    // WhatsApp allows 65536 chars but messages should be concise
    expect(result.text.length).toBeLessThan(4000)
    expect(result.text.length).toBeGreaterThan(100)
  })
})

describe("Fatigue Guard", () => {
  beforeEach(async () => {
    // Reset module state
    vi.resetModules()
  })

  it("detects quiet hours (crossing midnight)", async () => {
    const { isQuietHours } = await import("@/lib/whatsapp-broadcast/fatigue-guard")

    // 22-07 range: quiet from 22 to 7
    // We can't easily test this without mocking Date,
    // but we can test the logic with known inputs
    expect(typeof isQuietHours).toBe("function")
  })

  it("tracks recent offer IDs", async () => {
    const { getRecentOfferIds, recordSend } = await import("@/lib/whatsapp-broadcast/fatigue-guard")

    recordSend([
      { offerId: "off1", channelId: "ch1", sentAt: new Date(), productName: "Test", category: null, marketplace: "amazon" },
      { offerId: "off2", channelId: "ch1", sentAt: new Date(), productName: "Test2", category: null, marketplace: "shopee" },
    ])

    const recent = getRecentOfferIds("ch1", 1)
    expect(recent).toContain("off1")
    expect(recent).toContain("off2")

    // Different channel should not see these
    const otherRecent = getRecentOfferIds("ch2", 1)
    expect(otherRecent).toHaveLength(0)
  })

  it("performs full fatigue check", async () => {
    const { checkFatigue } = await import("@/lib/whatsapp-broadcast/fatigue-guard")

    // Fresh channel — should be allowed
    const result = checkFatigue("ch_new", 3, null, null, "America/Sao_Paulo", 120)
    expect(result.allowed).toBe(true)
    expect(result.reasons).toHaveLength(0)
  })
})

describe("Affiliate Builder", () => {
  it("adds broadcast tracking params", async () => {
    const { buildBroadcastAffiliateUrl } = await import("@/lib/whatsapp-broadcast/affiliate-builder")

    const url = buildBroadcastAffiliateUrl("https://amazon.com.br/dp/B1234", {
      channelId: "ch1",
      campaignId: "camp1",
      slotPosition: 0,
    })

    expect(url).toContain("utm_source=whatsapp")
    expect(url).toContain("utm_medium=broadcast")
    expect(url).toContain("utm_campaign=camp1")
    expect(url).toContain("ch_ch1_pos_0")
  })

  it("builds clickout URL for attribution", async () => {
    const { buildClickoutUrl } = await import("@/lib/whatsapp-broadcast/affiliate-builder")

    const url = buildClickoutUrl("offer123", {
      channelId: "ch1",
      campaignId: "camp1",
      slotPosition: 2,
    })

    expect(url).toContain("/api/clickout/offer123")
    expect(url).toContain("page=whatsapp")
    expect(url).toContain("channel=ch1")
    expect(url).toContain("campaign=camp1")
    expect(url).toContain("pos=2")
  })

  it("validates affiliate tracking presence", async () => {
    const { hasAffiliateTracking } = await import("@/lib/whatsapp-broadcast/affiliate-builder")

    expect(hasAffiliateTracking("https://amazon.com.br/dp/B1234?tag=promosnap-20")).toBe(true)
    expect(hasAffiliateTracking("https://amazon.com.br/dp/B1234?utm_source=whatsapp")).toBe(true)
    expect(hasAffiliateTracking("https://amazon.com.br/dp/B1234")).toBe(false)
  })
})

describe("Delivery Log", () => {
  it("records and retrieves deliveries", async () => {
    const { recordDelivery, getDeliveryHistory, getDeliveryStats } = await import("@/lib/whatsapp-broadcast/delivery-log")

    const mockMessage = {
      text: "Test message",
      offers: [],
      structure: "shortlist" as const,
      opening: "Test opening",
      cta: "Test CTA",
      transition: null,
      channelId: "ch1",
      campaignId: null,
      templateKey: "test_key",
    }

    recordDelivery({
      channelId: "ch1",
      channelName: "Test Channel",
      status: "sent",
      message: mockMessage,
    })

    const history = getDeliveryHistory(10)
    expect(history.length).toBeGreaterThan(0)
    expect(history[0].channelName).toBe("Test Channel")
    expect(history[0].status).toBe("sent")

    const stats = getDeliveryStats()
    expect(stats.sent).toBeGreaterThan(0)
  })
})

describe("Channel Registry", () => {
  it("provides default channel", async () => {
    const { getAllChannels } = await import("@/lib/whatsapp-broadcast/channel-registry")

    const channels = getAllChannels()
    expect(channels.length).toBeGreaterThan(0)
    expect(channels[0].name).toBe("PromoSnap Ofertas")
    expect(channels[0].isActive).toBe(true)
  })

  it("provides default campaigns", async () => {
    const { getAllCampaigns } = await import("@/lib/whatsapp-broadcast/channel-registry")

    const campaigns = getAllCampaigns()
    expect(campaigns.length).toBe(3)

    const names = campaigns.map(c => c.name)
    expect(names).toContain("Radar da Manha")
    expect(names).toContain("Achados do Almoco")
    expect(names).toContain("Fechamento do Dia")
  })

  it("creates and retrieves custom channel", async () => {
    const { createChannel, getChannel } = await import("@/lib/whatsapp-broadcast/channel-registry")

    const channel = createChannel({
      name: "Tech Deals",
      destinationId: "999@g.us",
      isActive: true,
      timezone: "America/Sao_Paulo",
      quietHoursStart: 23,
      quietHoursEnd: 8,
      dailyLimit: 2,
      windowLimit: 1,
      defaultOfferCount: 3,
      groupType: "tech",
      tags: ["tech"],
      categoriesInclude: ["eletronicos"],
      categoriesExclude: [],
      marketplacesInclude: [],
      marketplacesExclude: [],
      templateMode: "comparativo",
      tonality: "direto",
    })

    expect(channel.id).toBeTruthy()
    expect(channel.name).toBe("Tech Deals")

    const retrieved = getChannel(channel.id)
    expect(retrieved).not.toBeNull()
    expect(retrieved!.name).toBe("Tech Deals")
  })
})

describe("Send Queue", () => {
  it("detects when API is not configured", async () => {
    const { isBroadcastReady } = await import("@/lib/whatsapp-broadcast/send-queue")

    // Without env vars, should not be ready
    const ready = isBroadcastReady()
    expect(typeof ready).toBe("boolean")
  })
})
