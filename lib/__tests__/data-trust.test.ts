import { describe, it, expect } from "./test-utils";
import { calculateTrust } from "../data-trust";

export function runDataTrustTests() {
  describe("calculateTrust", () => {
    it("should return max score for a perfect product", () => {
      const result = calculateTrust({
        imageUrl: "https://example.com/image.jpg",
        brand: "Samsung",
        category: "Eletronicos",
        currentPrice: 999,
        originalPrice: 1299,
        affiliateUrl: "https://amzn.to/abc123",
        sourceSlug: "amazon",
        hasPriceSnapshots: true,
      });
      // image(20) + brand(15) + category(15) + price(15) + affiliate(15) + source(10*0.95=10) + history(10) = 100
      expect(result.trustScore).toBeGreaterThanOrEqual(95);
      expect(result.issues.length).toBe(0);
    });

    it("should give low score when everything is missing", () => {
      const result = calculateTrust({});
      expect(result.trustScore).toBeLessThan(20);
      expect(result.issues.length).toBeGreaterThan(3);
    });

    it("should penalize missing image", () => {
      const withImage = calculateTrust({
        imageUrl: "https://example.com/img.jpg",
        brand: "Test",
        category: "Cat",
        currentPrice: 100,
        affiliateUrl: "https://link.com",
        sourceSlug: "amazon",
      });
      const withoutImage = calculateTrust({
        brand: "Test",
        category: "Cat",
        currentPrice: 100,
        affiliateUrl: "https://link.com",
        sourceSlug: "amazon",
      });
      expect(withImage.trustScore).toBeGreaterThan(withoutImage.trustScore);
    });

    it("should flag when original price is lower than current", () => {
      const result = calculateTrust({
        currentPrice: 100,
        originalPrice: 50,
      });
      const hasIssue = result.issues.some((i) =>
        i.includes("Original price lower")
      );
      expect(hasIssue).toBeTruthy();
    });

    it("should give partial price score when original < current", () => {
      const result = calculateTrust({
        currentPrice: 100,
        originalPrice: 50,
      });
      expect(result.factors.price).toBe(5);
    });

    it("should give full price score when prices are coherent", () => {
      const result = calculateTrust({
        currentPrice: 100,
        originalPrice: 150,
      });
      expect(result.factors.price).toBe(15);
    });

    it("should give full price score when originalPrice is null", () => {
      const result = calculateTrust({
        currentPrice: 100,
        originalPrice: null,
      });
      expect(result.factors.price).toBe(15);
    });

    it("should score source quality based on known slugs", () => {
      const amazon = calculateTrust({ sourceSlug: "amazon", currentPrice: 10 });
      const shopee = calculateTrust({ sourceSlug: "shopee", currentPrice: 10 });
      const unknown = calculateTrust({ sourceSlug: "random", currentPrice: 10 });
      expect(amazon.factors.sourceQuality).toBeGreaterThan(shopee.factors.sourceQuality);
      expect(shopee.factors.sourceQuality).toBeGreaterThan(unknown.factors.sourceQuality);
    });

    it("should give history points only with price snapshots", () => {
      const with_ = calculateTrust({ hasPriceSnapshots: true });
      const without = calculateTrust({ hasPriceSnapshots: false });
      expect(with_.factors.history).toBe(10);
      expect(without.factors.history).toBe(0);
    });

    it("should return factors that sum to trustScore", () => {
      const result = calculateTrust({
        imageUrl: "https://img.com/a.jpg",
        brand: "Nike",
        category: "Calcados",
        currentPrice: 200,
        originalPrice: 350,
        affiliateUrl: "https://link.com",
        sourceSlug: "mercadolivre",
        hasPriceSnapshots: true,
      });
      const sum = Object.values(result.factors).reduce((a, b) => a + b, 0);
      expect(result.trustScore).toBe(sum);
    });
  });
}
