import { describe, it, expect } from "./test-utils";
import {
  validateTitle,
  validateImage,
  validatePrice,
  validateProduct,
  validateAffiliateUrl,
} from "../catalog/validation";

/**
 * Tests for lib/catalog/validation.ts — product ingest quality gates.
 */

export function runCatalogValidationTests() {
  describe("catalog/validation — validateTitle()", () => {
    it("should accept valid titles", () => {
      expect(validateTitle("iPhone 15 Pro Max 256GB").valid).toBe(true);
    });

    it("should reject empty string", () => {
      const result = validateTitle("");
      expect(result.valid).toBe(false);
      expect(result.issue).toBeDefined();
    });

    it("should reject null/undefined", () => {
      expect(validateTitle(null).valid).toBe(false);
      expect(validateTitle(undefined).valid).toBe(false);
    });

    it("should reject non-string types", () => {
      expect(validateTitle(123).valid).toBe(false);
      expect(validateTitle(true).valid).toBe(false);
    });

    it("should reject titles shorter than 5 chars", () => {
      expect(validateTitle("abcd").valid).toBe(false);
      expect(validateTitle("abcde").valid).toBe(true);
    });

    it("should reject titles longer than 500 chars", () => {
      // Use real-looking text to avoid garbage pattern detection
      const longTitle = "Samsung Galaxy ".repeat(34); // 510 chars
      expect(validateTitle(longTitle).valid).toBe(false);
      const okTitle = "Samsung Galaxy ".repeat(33); // 495 chars
      expect(validateTitle(okTitle).valid).toBe(true);
    });

    it("should reject garbage/placeholder titles", () => {
      expect(validateTitle("test").valid).toBe(false);
      expect(validateTitle("asdf").valid).toBe(false);
      expect(validateTitle("null").valid).toBe(false);
      expect(validateTitle("undefined").valid).toBe(false);
      expect(validateTitle("n/a").valid).toBe(false);
      expect(validateTitle("12345").valid).toBe(false);
    });

    it("should reject symbol-only titles", () => {
      expect(validateTitle("$$$$$").valid).toBe(false);
      expect(validateTitle("-----").valid).toBe(false);
    });

    it("should reject repeated character titles", () => {
      expect(validateTitle("aaaaa").valid).toBe(false);
    });

    it("should accept titles with mixed content", () => {
      expect(validateTitle("Samsung Galaxy S24 Ultra 512GB Preto").valid).toBe(true);
      expect(validateTitle("Cabo USB-C 2m 60W").valid).toBe(true);
    });
  });

  describe("catalog/validation — validateImage()", () => {
    it("should accept null/undefined/empty (image is optional)", () => {
      expect(validateImage(null).valid).toBe(true);
      expect(validateImage(undefined).valid).toBe(true);
      expect(validateImage("").valid).toBe(true);
    });

    it("should accept valid http/https URLs", () => {
      expect(validateImage("https://cdn.example.com/img.jpg").valid).toBe(true);
      expect(validateImage("http://example.com/photo.png").valid).toBe(true);
    });

    it("should reject non-string types", () => {
      expect(validateImage(123).valid).toBe(false);
    });

    it("should reject invalid URLs", () => {
      expect(validateImage("not-a-url").valid).toBe(false);
    });

    it("should reject non-http protocols", () => {
      expect(validateImage("ftp://example.com/img.jpg").valid).toBe(false);
    });
  });

  describe("catalog/validation — validateAffiliateUrl()", () => {
    it("should accept valid affiliate URLs", () => {
      expect(validateAffiliateUrl("https://amazon.com.br/dp/B0123?tag=promosnap").valid).toBe(true);
    });

    it("should reject empty/null/undefined", () => {
      expect(validateAffiliateUrl("").valid).toBe(false);
      expect(validateAffiliateUrl(null).valid).toBe(false);
      expect(validateAffiliateUrl(undefined).valid).toBe(false);
    });

    it("should reject non-string types", () => {
      expect(validateAffiliateUrl(123).valid).toBe(false);
    });

    it("should reject invalid URLs", () => {
      expect(validateAffiliateUrl("not-a-url").valid).toBe(false);
    });

    it("should reject non-http protocols", () => {
      expect(validateAffiliateUrl("ftp://example.com").valid).toBe(false);
    });
  });

  describe("catalog/validation — validatePrice()", () => {
    it("should accept valid current price", () => {
      expect(validatePrice(99.90, null).valid).toBe(true);
    });

    it("should accept valid current + original price", () => {
      expect(validatePrice(79.90, 129.90).valid).toBe(true);
    });

    it("should reject non-number current price", () => {
      expect(validatePrice("99.90" as any, null).valid).toBe(false);
      expect(validatePrice(null, null).valid).toBe(false);
    });

    it("should reject NaN", () => {
      expect(validatePrice(NaN, null).valid).toBe(false);
    });

    it("should reject zero or negative prices", () => {
      expect(validatePrice(0, null).valid).toBe(false);
      expect(validatePrice(-10, null).valid).toBe(false);
    });

    it("should reject excessively high prices (> 1M)", () => {
      expect(validatePrice(1_000_001, null).valid).toBe(false);
      expect(validatePrice(1_000_000, null).valid).toBe(true);
    });

    it("should reject original price lower than current", () => {
      const result = validatePrice(100, 50);
      expect(result.valid).toBe(false);
      expect(result.issue).toBeDefined();
    });

    it("should accept null/undefined original price", () => {
      expect(validatePrice(50, null).valid).toBe(true);
      expect(validatePrice(50, undefined).valid).toBe(true);
    });

    it("should reject non-number original price", () => {
      expect(validatePrice(50, "100" as any).valid).toBe(false);
    });
  });

  describe("catalog/validation — validateProduct()", () => {
    it("should validate a complete high-quality product", () => {
      const result = validateProduct({
        title: "iPhone 15 Pro Max 256GB Preto",
        imageUrl: "https://cdn.example.com/iphone.jpg",
        affiliateUrl: "https://amazon.com.br/dp/B0123?tag=promosnap",
        currentPrice: 7999.00,
        originalPrice: 9999.00,
      });
      expect(result.valid).toBe(true);
      expect(result.quality).toBe("high");
      expect(result.issues).toHaveLength(0);
    });

    it("should flag a product with missing fields as low quality", () => {
      const result = validateProduct({
        title: "",
        imageUrl: null,
        affiliateUrl: "",
        currentPrice: -5,
        originalPrice: null,
      });
      expect(result.valid).toBe(false);
      expect(result.quality).toBe("low");
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it("should classify product without image as medium quality", () => {
      const result = validateProduct({
        title: "Valid Product Title Here",
        imageUrl: null,
        affiliateUrl: "https://example.com/aff",
        currentPrice: 99.90,
        originalPrice: null,
      });
      expect(result.valid).toBe(true);
      expect(result.quality).toBe("medium");
    });

    it("should collect multiple issues", () => {
      const result = validateProduct({
        title: "ab",               // too short
        imageUrl: "not-a-url",     // invalid
        affiliateUrl: "",          // empty
        currentPrice: -1,          // negative
        originalPrice: null,
      });
      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThanOrEqual(3);
    });
  });
}
