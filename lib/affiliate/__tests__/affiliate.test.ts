import { describe, it, expect, vi, beforeEach } from "vitest"

// Stub env vars before importing
vi.stubEnv("MERCADOLIVRE_AFFILIATE_ID", "12345")
vi.stubEnv("AMAZON_AFFILIATE_TAG", "promosnap-20")
vi.stubEnv("SHOPEE_AFFILIATE_ID", "shop123")

const { buildAffiliateUrl, hasAffiliateTag, stripAffiliateTag } = await import("../index")

describe("buildAffiliateUrl", () => {
  it("adds matt_tool to ML URLs", () => {
    const result = buildAffiliateUrl("https://www.mercadolivre.com.br/p/MLB12345")
    expect(result).toContain("matt_tool=12345")
  })

  it("adds tag + linkCode to Amazon URLs", () => {
    const result = buildAffiliateUrl("https://www.amazon.com.br/dp/B09XYZ123")
    expect(result).toContain("tag=promosnap-20")
    expect(result).toContain("linkCode=ll1")
  })

  it("adds af_id to Shopee URLs", () => {
    const result = buildAffiliateUrl("https://shopee.com.br/product/123")
    expect(result).toContain("af_id=shop123")
  })

  it("returns original URL for unknown marketplaces", () => {
    const url = "https://example.com/product"
    expect(buildAffiliateUrl(url)).toBe(url)
  })

  it("returns original URL if no env var configured", () => {
    const url = "https://www.shein.com.br/product-123"
    // SHEIN_AFFILIATE_ID not set
    expect(buildAffiliateUrl(url)).toBe(url)
  })

  it("handles empty string", () => {
    expect(buildAffiliateUrl("")).toBe("")
  })
})

describe("hasAffiliateTag", () => {
  it("detects existing ML affiliate tag", () => {
    expect(hasAffiliateTag("https://www.mercadolivre.com.br/p/MLB12345?matt_tool=xxx")).toBe(true)
  })

  it("returns false for clean URL", () => {
    expect(hasAffiliateTag("https://www.mercadolivre.com.br/p/MLB12345")).toBe(false)
  })
})

describe("stripAffiliateTag", () => {
  it("removes ML affiliate params", () => {
    const result = stripAffiliateTag("https://www.mercadolivre.com.br/p/MLB12345?matt_tool=xxx")
    expect(result).not.toContain("matt_tool")
  })

  it("removes Amazon affiliate params", () => {
    const result = stripAffiliateTag("https://www.amazon.com.br/dp/B09XYZ?tag=old-20&linkCode=ll1")
    expect(result).not.toContain("tag=")
    expect(result).not.toContain("linkCode=")
  })
})
