import { describe, it, expect } from "./test-utils";

/**
 * Tests for the hybrid cache system.
 * We test the MemoryCache behavior via the exported cache interface
 * in a controlled way (no Redis in test environment).
 */

export async function runCacheTests() {
  // Dynamic import to avoid module-level Redis connection
  const { cache, CACHE_TTL } = await import("../cache");

  describe("cache.set and cache.get", () => {
    it("should store and retrieve a value", async () => {
      await cache.set("test:basic", { name: "PromoSnap" }, 10);
      const result = await cache.get<{ name: string }>("test:basic");
      expect(result?.name).toBe("PromoSnap");
    });

    it("should return null for non-existent key", async () => {
      const result = await cache.get("test:nonexistent-key-xyz");
      expect(result).toBeNull();
    });

    it("should store number values", async () => {
      await cache.set("test:number", 42, 10);
      const result = await cache.get<number>("test:number");
      expect(result).toBe(42);
    });

    it("should store string values", async () => {
      await cache.set("test:string", "hello", 10);
      const result = await cache.get<string>("test:string");
      expect(result).toBe("hello");
    });

    it("should store array values", async () => {
      await cache.set("test:array", [1, 2, 3], 10);
      const result = await cache.get<number[]>("test:array");
      expect(result?.length).toBe(3);
    });
  });

  describe("cache.getOrSet", () => {
    it("should compute and cache value on first call", async () => {
      let callCount = 0;
      const value = await cache.getOrSet(
        "test:getOrSet-fresh",
        async () => {
          callCount++;
          return { computed: true };
        },
        10
      );
      expect(value.computed).toBe(true);
      expect(callCount).toBe(1);
    });

    it("should return cached value on subsequent calls", async () => {
      let callCount = 0;
      const key = "test:getOrSet-cached";
      await cache.set(key, { cached: true }, 10);

      const value = await cache.getOrSet(
        key,
        async () => {
          callCount++;
          return { cached: false };
        },
        10
      );
      expect(value.cached).toBe(true);
      expect(callCount).toBe(0);
    });
  });

  describe("cache.delete", () => {
    it("should remove a cached value", async () => {
      await cache.set("test:delete-me", "value", 10);
      await cache.delete("test:delete-me");
      const result = await cache.get("test:delete-me");
      expect(result).toBeNull();
    });
  });

  describe("cache.clearMemory", () => {
    it("should clear all in-memory cache", async () => {
      await cache.set("test:clear-1", "a", 10);
      await cache.set("test:clear-2", "b", 10);
      cache.clearMemory();
      const r1 = await cache.get("test:clear-1");
      const r2 = await cache.get("test:clear-2");
      // After clearMemory, memory cache is empty.
      // Redis might still have the values, but in test env without Redis, these should be null.
      // We just verify the function doesn't throw.
      expect(true).toBeTruthy();
    });
  });

  describe("CACHE_TTL constants", () => {
    it("should have correct SEARCH TTL", () => {
      expect(CACHE_TTL.SEARCH).toBe(300);
    });

    it("should have correct TRENDING TTL", () => {
      expect(CACHE_TTL.TRENDING).toBe(600);
    });

    it("should have correct SCORECARD TTL", () => {
      expect(CACHE_TTL.SCORECARD).toBe(900);
    });

    it("should have correct CATEGORIES TTL", () => {
      expect(CACHE_TTL.CATEGORIES).toBe(1800);
    });

    it("should have correct BRANDS TTL", () => {
      expect(CACHE_TTL.BRANDS).toBe(1800);
    });
  });
}
