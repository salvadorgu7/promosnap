import { describe, it, expect } from "./test-utils";
import { RateLimiter } from "../rate-limit";

export function runRateLimitTests() {
  describe("RateLimiter", () => {
    it("should allow requests within limit", () => {
      const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 5 });
      const result = limiter.check("user-1");
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      limiter.destroy();
    });

    it("should block requests exceeding limit", () => {
      const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 3 });
      limiter.check("user-2");
      limiter.check("user-2");
      limiter.check("user-2");
      const result = limiter.check("user-2");
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      limiter.destroy();
    });

    it("should track different keys independently", () => {
      const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 2 });
      limiter.check("user-a");
      limiter.check("user-a");
      const resultA = limiter.check("user-a");
      const resultB = limiter.check("user-b");
      expect(resultA.allowed).toBe(false);
      expect(resultB.allowed).toBe(true);
      limiter.destroy();
    });

    it("should reset a specific key", () => {
      const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 2 });
      limiter.check("user-r");
      limiter.check("user-r");
      const blocked = limiter.check("user-r");
      expect(blocked.allowed).toBe(false);

      limiter.reset("user-r");
      const afterReset = limiter.check("user-r");
      expect(afterReset.allowed).toBe(true);
      expect(afterReset.remaining).toBe(1);
      limiter.destroy();
    });

    it("should report correct totalHits", () => {
      const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 10 });
      limiter.check("user-h");
      limiter.check("user-h");
      limiter.check("user-h");
      const result = limiter.check("user-h");
      expect(result.totalHits).toBe(4);
      expect(result.remaining).toBe(6);
      limiter.destroy();
    });

    it("should provide a valid resetAt timestamp", () => {
      const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 5 });
      const now = Date.now();
      const result = limiter.check("user-t");
      expect(result.resetAt).toBeGreaterThan(now);
      expect(result.resetAt).toBeLessThanOrEqual(now + 60_000 + 100);
      limiter.destroy();
    });

    it("should track store size", () => {
      const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 10 });
      expect(limiter.size).toBe(0);
      limiter.check("a");
      limiter.check("b");
      expect(limiter.size).toBe(2);
      limiter.destroy();
    });

    it("should clean up expired entries", () => {
      const limiter = new RateLimiter({ windowMs: 1, maxRequests: 10 });
      limiter.check("expired-key");
      // Wait a tiny bit to let the window expire
      const start = Date.now();
      while (Date.now() - start < 5) {
        // busy wait 5ms
      }
      limiter.cleanup();
      expect(limiter.size).toBe(0);
      limiter.destroy();
    });
  });
}
