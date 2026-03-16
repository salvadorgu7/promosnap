import { describe, it, expect } from "vitest"
import {
  formatPrice,
  formatDiscount,
  formatNumber,
  slugify,
  truncate,
  normalizeText,
} from "../index"

describe("formatPrice", () => {
  it("formats BRL currency", () => {
    const result = formatPrice(199.9)
    expect(result).toContain("199")
    expect(result).toContain("R$")
  })

  it("formats zero", () => {
    const result = formatPrice(0)
    expect(result).toContain("0")
  })

  it("formats large values with thousands separator", () => {
    const result = formatPrice(1299.99)
    expect(result).toContain("1.299") // pt-BR uses . as thousands sep
  })
})

describe("formatDiscount", () => {
  it("calculates discount percentage", () => {
    expect(formatDiscount(90, 100)).toBe("-10%")
  })

  it("returns empty string when no discount", () => {
    expect(formatDiscount(100, 100)).toBe("")
    expect(formatDiscount(100, 80)).toBe("")
  })

  it("handles zero original", () => {
    expect(formatDiscount(50, 0)).toBe("")
  })

  it("rounds correctly", () => {
    expect(formatDiscount(67, 100)).toBe("-33%")
  })
})

describe("formatNumber", () => {
  it("formats millions", () => {
    expect(formatNumber(1_500_000)).toBe("1.5M")
  })

  it("formats thousands", () => {
    expect(formatNumber(2_500)).toBe("2.5K")
  })

  it("returns plain number under 1000", () => {
    expect(formatNumber(999)).toBe("999")
  })
})

describe("slugify", () => {
  it("converts to kebab-case", () => {
    expect(slugify("iPhone 15 Pro Max")).toBe("iphone-15-pro-max")
  })

  it("removes accents", () => {
    expect(slugify("Café com Leão")).toBe("cafe-com-leao")
  })

  it("strips leading/trailing hyphens", () => {
    expect(slugify("  --hello world--  ")).toBe("hello-world")
  })

  it("handles empty string", () => {
    expect(slugify("")).toBe("")
  })
})

describe("truncate", () => {
  it("truncates long strings with ellipsis", () => {
    expect(truncate("Hello World", 6)).toBe("Hello…")
  })

  it("returns short strings unchanged", () => {
    expect(truncate("Hi", 10)).toBe("Hi")
  })

  it("handles exact length", () => {
    expect(truncate("Hello", 5)).toBe("Hello")
  })
})

describe("normalizeText", () => {
  it("lowercases and removes accents", () => {
    expect(normalizeText("Café COM Leite")).toBe("cafe com leite")
  })

  it("collapses whitespace", () => {
    expect(normalizeText("  hello   world  ")).toBe("hello world")
  })
})
