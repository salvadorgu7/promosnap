import { describe, it, expect } from "./test-utils";
import type { ProductionCheck, ProductionReport, CheckGroup, CheckStatus } from "../production/types";

/**
 * Tests for production checks types and scoring logic.
 *
 * Since the main runProductionChecks() function requires a database connection,
 * we test the helper patterns and the scoring formula used by the production
 * report independently.
 */

// Reproduce the scoring formula from checks.ts to validate it
function computeScore(checks: ProductionCheck[]): number {
  const total = checks.length;
  if (total === 0) return 0;
  return Math.round(
    (checks.reduce((acc, c) => {
      if (c.status === "pass") return acc + 1;
      if (c.status === "warn") return acc + 0.5;
      return acc;
    }, 0) / total) * 100
  );
}

function computeReady(checks: ProductionCheck[], score: number): boolean {
  const hasFail = checks.some((c) => c.status === "fail");
  return !hasFail && score >= 70;
}

// Helper to create check objects (mirrors pass/warn/fail in checks.ts)
function makeCheck(
  name: string,
  group: CheckGroup,
  status: CheckStatus,
  message: string
): ProductionCheck {
  return { name, group, status, message };
}

export function runProductionChecksTests() {
  describe("production/checks — scoring formula", () => {
    it("should return 100 when all checks pass", () => {
      const checks = [
        makeCheck("A", "infrastructure", "pass", "ok"),
        makeCheck("B", "security", "pass", "ok"),
        makeCheck("C", "data", "pass", "ok"),
      ];
      expect(computeScore(checks)).toBe(100);
    });

    it("should return 50 when all checks warn", () => {
      const checks = [
        makeCheck("A", "infrastructure", "warn", "degraded"),
        makeCheck("B", "security", "warn", "degraded"),
      ];
      expect(computeScore(checks)).toBe(50);
    });

    it("should return 0 when all checks fail", () => {
      const checks = [
        makeCheck("A", "infrastructure", "fail", "down"),
        makeCheck("B", "data", "fail", "down"),
      ];
      expect(computeScore(checks)).toBe(0);
    });

    it("should return 0 for empty checks array", () => {
      expect(computeScore([])).toBe(0);
    });

    it("should calculate mixed scores correctly", () => {
      const checks = [
        makeCheck("A", "infrastructure", "pass", "ok"),      // 1
        makeCheck("B", "security", "warn", "degraded"),       // 0.5
        makeCheck("C", "data", "fail", "down"),               // 0
        makeCheck("D", "integrations", "pass", "ok"),         // 1
      ];
      // (1 + 0.5 + 0 + 1) / 4 = 0.625 -> 63
      expect(computeScore(checks)).toBe(63);
    });

    it("should round scores correctly", () => {
      const checks = [
        makeCheck("A", "infrastructure", "pass", "ok"),
        makeCheck("B", "security", "pass", "ok"),
        makeCheck("C", "data", "warn", "degraded"),
      ];
      // (1 + 1 + 0.5) / 3 = 0.8333 -> 83
      expect(computeScore(checks)).toBe(83);
    });
  });

  describe("production/checks — readiness logic", () => {
    it("should be ready when score >= 70 and no failures", () => {
      const checks = [
        makeCheck("A", "infrastructure", "pass", "ok"),
        makeCheck("B", "security", "pass", "ok"),
        makeCheck("C", "seo", "warn", "degraded"),
      ];
      const score = computeScore(checks); // 83
      expect(computeReady(checks, score)).toBe(true);
    });

    it("should NOT be ready when any check fails", () => {
      const checks = [
        makeCheck("A", "infrastructure", "pass", "ok"),
        makeCheck("B", "security", "fail", "missing"),
        makeCheck("C", "data", "pass", "ok"),
      ];
      const score = computeScore(checks); // 67
      expect(computeReady(checks, score)).toBe(false);
    });

    it("should NOT be ready when score < 70 even with no failures", () => {
      const checks = [
        makeCheck("A", "infrastructure", "warn", "slow"),
        makeCheck("B", "security", "warn", "incomplete"),
      ];
      const score = computeScore(checks); // 50
      expect(computeReady(checks, score)).toBe(false);
    });
  });

  describe("production/checks — helper patterns", () => {
    it("should create pass check objects correctly", () => {
      const check = makeCheck("DB", "infrastructure", "pass", "Connected");
      expect(check.status).toBe("pass");
      expect(check.group).toBe("infrastructure");
      expect(check.name).toBe("DB");
    });

    it("should create warn check objects correctly", () => {
      const check = makeCheck("Email", "integrations", "warn", "Not configured");
      expect(check.status).toBe("warn");
      expect(check.group).toBe("integrations");
    });

    it("should create fail check objects correctly", () => {
      const check = makeCheck("DB", "infrastructure", "fail", "Connection refused");
      expect(check.status).toBe("fail");
    });

    it("should support all CheckGroup values", () => {
      const groups: CheckGroup[] = ["infrastructure", "data", "security", "seo", "integrations"];
      for (const group of groups) {
        const check = makeCheck("Test", group, "pass", "ok");
        expect(check.group).toBe(group);
      }
    });
  });
}
