import { describe, it, expect } from "./test-utils";

/**
 * Tests for lib/security/rate-limit.ts — the production sliding-window rate limiter.
 *
 * We import the module and create minimal request mocks with just enough
 * of the NextRequest shape to exercise getClientIp + rateLimit logic.
 */

// Minimal mock that satisfies getClientIp's req.headers.get() calls
function mockRequest(ip: string): any {
  return {
    headers: {
      get(name: string): string | null {
        if (name === "x-forwarded-for") return ip;
        return null;
      },
    },
  };
}

export function runSecurityRateLimitTests() {
  // We need a fresh import each test run but the module has global state.
  // We'll use unique IPs per test to avoid interference.
  const { rateLimit, getRateLimitStats } = require("../security/rate-limit");

  describe("security/rate-limit — rateLimit()", () => {
    it("should allow requests within the limit", () => {
      const req = mockRequest("10.0.0.1");
      const result = rateLimit(req, "public");
      expect(result.success).toBe(true);
      expect(result.limit).toBe(60);
      expect(result.remaining).toBeLessThan(60);
    });

    it("should return correct remaining count after multiple requests", () => {
      const req = mockRequest("10.0.0.2");
      rateLimit(req, "search"); // 1
      rateLimit(req, "search"); // 2
      const result = rateLimit(req, "search"); // 3
      expect(result.success).toBe(true);
      expect(result.remaining).toBe(27); // 30 - 3
    });

    it("should block requests once limit is exceeded", () => {
      const req = mockRequest("10.0.0.3");
      // Newsletter limit is 10 req/min — exhaust it
      for (let i = 0; i < 10; i++) {
        const r = rateLimit(req, "newsletter");
        expect(r.success).toBe(true);
      }
      const blocked = rateLimit(req, "newsletter");
      expect(blocked.success).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it("should track different IPs independently", () => {
      const req1 = mockRequest("10.0.0.4");
      const req2 = mockRequest("10.0.0.5");

      // Exhaust newsletter limit for IP 1
      for (let i = 0; i < 10; i++) {
        rateLimit(req1, "newsletter");
      }

      // IP 2 should still be allowed
      const result = rateLimit(req2, "newsletter");
      expect(result.success).toBe(true);
    });

    it("should track different route types independently", () => {
      const req = mockRequest("10.0.0.6");

      // Exhaust newsletter limit (10)
      for (let i = 0; i < 10; i++) {
        rateLimit(req, "newsletter");
      }
      const blocked = rateLimit(req, "newsletter");
      expect(blocked.success).toBe(false);

      // Public should still work for the same IP
      const publicResult = rateLimit(req, "public");
      expect(publicResult.success).toBe(true);
    });

    it("should return a valid reset timestamp", () => {
      const req = mockRequest("10.0.0.7");
      const now = Math.floor(Date.now() / 1000);
      const result = rateLimit(req, "public");
      expect(result.reset).toBeGreaterThan(now);
    });

    it("should use x-forwarded-for header for IP detection", () => {
      const req = mockRequest("192.168.1.100");
      const result = rateLimit(req, "alerts");
      expect(result.success).toBe(true);
      // Second call from same IP
      const result2 = rateLimit(req, "alerts");
      expect(result2.remaining).toBeLessThan(result.remaining);
    });

    it("should fallback to 127.0.0.1 when no IP headers present", () => {
      const req = {
        headers: {
          get(): null {
            return null;
          },
        },
      };
      const result = rateLimit(req, "public");
      expect(result.success).toBe(true);
    });
  });

  describe("security/rate-limit — getRateLimitStats()", () => {
    it("should return stats for all route types", () => {
      const stats = getRateLimitStats();
      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBeGreaterThan(0);

      const types = stats.map((s: any) => s.type);
      expect(types.includes("public")).toBe(true);
      expect(types.includes("search")).toBe(true);
      expect(types.includes("newsletter")).toBe(true);
    });

    it("should have valid config in each stat entry", () => {
      const stats = getRateLimitStats();
      for (const stat of stats) {
        expect(stat.config.maxRequests).toBeGreaterThan(0);
        expect(stat.config.windowMs).toBeGreaterThan(0);
        expect(stat.activeKeys >= 0).toBe(true);
        expect(stat.totalRequestsInWindow >= 0).toBe(true);
      }
    });
  });
}
