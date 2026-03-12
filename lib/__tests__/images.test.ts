import { describe, it, expect } from "./test-utils";
import { getImageUrl, getFallbackImage, isValidImageUrl } from "../images";

/**
 * Tests for lib/images/index.ts — CDN URL building, fallbacks, and URL validation.
 */

export function runImagesTests() {
  describe("images — isValidImageUrl()", () => {
    it("should accept valid https URLs", () => {
      expect(isValidImageUrl("https://example.com/photo.jpg")).toBe(true);
    });

    it("should accept valid http URLs", () => {
      expect(isValidImageUrl("http://cdn.example.com/img.png")).toBe(true);
    });

    it("should accept data:image URIs", () => {
      expect(isValidImageUrl("data:image/svg+xml,%3Csvg%3E%3C/svg%3E")).toBe(true);
    });

    it("should reject null/undefined/empty", () => {
      expect(isValidImageUrl(null)).toBe(false);
      expect(isValidImageUrl(undefined)).toBe(false);
      expect(isValidImageUrl("")).toBe(false);
    });

    it("should reject non-http protocols", () => {
      expect(isValidImageUrl("ftp://example.com/file.jpg")).toBe(false);
      expect(isValidImageUrl("javascript:alert(1)")).toBe(false);
    });

    it("should reject executable file extensions", () => {
      expect(isValidImageUrl("https://example.com/virus.exe")).toBe(false);
      expect(isValidImageUrl("https://example.com/script.bat")).toBe(false);
      expect(isValidImageUrl("https://example.com/install.msi")).toBe(false);
      expect(isValidImageUrl("https://example.com/run.sh")).toBe(false);
      expect(isValidImageUrl("https://example.com/do.cmd")).toBe(false);
    });

    it("should reject URLs with very short hostnames", () => {
      expect(isValidImageUrl("https://ab/img.jpg")).toBe(false);
    });

    it("should reject invalid URL strings", () => {
      expect(isValidImageUrl("not-a-url")).toBe(false);
      expect(isValidImageUrl("://missing-protocol")).toBe(false);
    });

    it("should accept URLs without common image extensions", () => {
      // The validator doesn't require image extensions, just valid URLs
      expect(isValidImageUrl("https://cdn.example.com/api/resize?src=img")).toBe(true);
    });
  });

  describe("images — getFallbackImage()", () => {
    it("should return an SVG data URI for 'product'", () => {
      const fallback = getFallbackImage("product");
      expect(fallback).toStartWith("data:image/svg+xml,");
    });

    it("should return an SVG data URI for 'brand'", () => {
      const fallback = getFallbackImage("brand");
      expect(fallback).toStartWith("data:image/svg+xml,");
    });

    it("should return an SVG data URI for 'category'", () => {
      const fallback = getFallbackImage("category");
      expect(fallback).toStartWith("data:image/svg+xml,");
    });

    it("should return an SVG data URI for 'article'", () => {
      const fallback = getFallbackImage("article");
      expect(fallback).toStartWith("data:image/svg+xml,");
    });

    it("should return product fallback for unknown types", () => {
      const unknown = getFallbackImage("unknown" as any);
      const product = getFallbackImage("product");
      expect(unknown).toBe(product);
    });

    it("should return different SVGs for different types", () => {
      const product = getFallbackImage("product");
      const brand = getFallbackImage("brand");
      const category = getFallbackImage("category");
      expect(product !== brand).toBe(true);
      expect(brand !== category).toBe(true);
    });
  });

  describe("images — getImageUrl()", () => {
    it("should return fallback when URL is null", () => {
      const result = getImageUrl(null);
      expect(result).toStartWith("data:image/svg+xml,");
    });

    it("should return fallback when URL is undefined", () => {
      const result = getImageUrl(undefined);
      expect(result).toStartWith("data:image/svg+xml,");
    });

    it("should return original URL when no CDN is configured", () => {
      // IMAGE_CDN_URL is not set in test environment
      const url = "https://example.com/photo.jpg";
      const result = getImageUrl(url);
      expect(result).toBe(url);
    });

    it("should return original URL with options when no CDN", () => {
      const url = "https://example.com/photo.jpg";
      const result = getImageUrl(url, { width: 300, height: 300 });
      expect(result).toBe(url);
    });
  });
}
