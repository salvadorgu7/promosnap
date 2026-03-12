import { describe, it, expect } from "./test-utils";
import {
  getBaseUrl,
  absoluteUrl,
  canonicalUrl,
  shareUrl,
  APP_NAME,
  APP_DESCRIPTION,
  OG_IMAGE,
} from "../seo/url";

export function runUrlTests() {
  // Save original env
  const origAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const origUrl = process.env.APP_URL;

  describe("getBaseUrl", () => {
    it("should return canonical domain when no env is set", () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.APP_URL;
      const url = getBaseUrl();
      expect(url).toBe("https://www.promosnap.com.br");
    });

    it("should respect NEXT_PUBLIC_APP_URL env", () => {
      process.env.NEXT_PUBLIC_APP_URL = "https://staging.promosnap.com.br";
      const url = getBaseUrl();
      expect(url).toBe("https://staging.promosnap.com.br");
      delete process.env.NEXT_PUBLIC_APP_URL;
    });

    it("should fall back to APP_URL when NEXT_PUBLIC is not set", () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      process.env.APP_URL = "https://custom.example.com";
      const url = getBaseUrl();
      expect(url).toBe("https://custom.example.com");
      delete process.env.APP_URL;
    });
  });

  describe("absoluteUrl", () => {
    it("should return base URL for empty path", () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.APP_URL;
      const url = absoluteUrl("");
      expect(url).toBe("https://www.promosnap.com.br");
    });

    it("should return base URL for root path", () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.APP_URL;
      const url = absoluteUrl("/");
      expect(url).toBe("https://www.promosnap.com.br");
    });

    it("should prepend slash if missing", () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.APP_URL;
      const url = absoluteUrl("ofertas");
      expect(url).toBe("https://www.promosnap.com.br/ofertas");
    });

    it("should handle path with leading slash", () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.APP_URL;
      const url = absoluteUrl("/categorias/eletronicos");
      expect(url).toBe("https://www.promosnap.com.br/categorias/eletronicos");
    });
  });

  describe("canonicalUrl", () => {
    it("should be same as absoluteUrl", () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.APP_URL;
      expect(canonicalUrl("/test")).toBe(absoluteUrl("/test"));
    });
  });

  describe("shareUrl", () => {
    it("should generate share URL", () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.APP_URL;
      const url = shareUrl("/produto/iphone-15");
      expect(url).toContain("promosnap.com.br");
      expect(url).toContain("/produto/iphone-15");
    });
  });

  describe("constants", () => {
    it("should have correct APP_NAME", () => {
      expect(APP_NAME).toBe("PromoSnap");
    });

    it("should have a non-empty APP_DESCRIPTION", () => {
      expect(APP_DESCRIPTION.length).toBeGreaterThan(10);
    });

    it("should have a valid OG_IMAGE path", () => {
      expect(OG_IMAGE).toStartWith("/");
    });
  });

  // Restore env
  if (origAppUrl !== undefined) process.env.NEXT_PUBLIC_APP_URL = origAppUrl;
  else delete process.env.NEXT_PUBLIC_APP_URL;
  if (origUrl !== undefined) process.env.APP_URL = origUrl;
  else delete process.env.APP_URL;
}
