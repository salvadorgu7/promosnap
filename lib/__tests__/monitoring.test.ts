import { describe, it, expect } from "./test-utils";

/**
 * Tests for lib/monitoring/index.ts — in-memory error/event capture.
 *
 * Since the test framework's it() is synchronous, we pre-populate the
 * error/event buffers in the async setup, then run sync assertions.
 */

export async function runMonitoringTests() {
  const {
    captureError,
    captureEvent,
    getRecentErrors,
    getRecentEvents,
    getErrorStats,
    getMonitoringReport,
  } = require("../monitoring");

  // ── Async setup: capture errors and events before assertions ──
  await captureError(new Error("test error"), { route: "/test" });
  await captureError("string error message");
  await captureError(42);
  await captureError(new Error("ctx test"), { route: "/api/test", extra: "data" });
  await captureError(new Error("id-test-1"));
  await captureError(new Error("id-test-2"));
  await captureError(new Error("ts-test"));

  captureEvent("test-event", { key: "value" });
  captureEvent("bare-event");
  captureEvent("evt-1");
  captureEvent("evt-2");

  // ── Now run sync assertions on the populated buffers ──

  describe("monitoring — captureError()", () => {
    it("should capture Error instances into the buffer", () => {
      const errors = getRecentErrors();
      const testError = errors.find((e: any) => e.message === "test error");
      expect(testError !== undefined).toBe(true);
      expect(testError.route).toBe("/test");
    });

    it("should capture string errors", () => {
      const errors = getRecentErrors();
      const strError = errors.find((e: any) => e.message === "string error message");
      expect(strError !== undefined).toBe(true);
    });

    it("should capture unknown error types as 'Unknown error'", () => {
      const errors = getRecentErrors();
      const unknownError = errors.find((e: any) => e.message === "Unknown error");
      expect(unknownError !== undefined).toBe(true);
    });

    it("should include context when provided", () => {
      const errors = getRecentErrors();
      const ctxError = errors.find((e: any) => e.message === "ctx test");
      expect(ctxError !== undefined).toBe(true);
      expect(ctxError.route).toBe("/api/test");
      expect(ctxError.context).toBeDefined();
    });

    it("should assign unique IDs to each error", () => {
      const errors = getRecentErrors();
      const ids = new Set(errors.map((e: any) => e.id));
      expect(ids.size).toBe(errors.length);
    });

    it("should include a valid ISO timestamp", () => {
      const errors = getRecentErrors();
      const ts = new Date(errors[0].timestamp).getTime();
      expect(isNaN(ts)).toBe(false);
    });

    it("should have captured at least 7 errors", () => {
      const errors = getRecentErrors();
      expect(errors.length).toBeGreaterThanOrEqual(7);
    });
  });

  describe("monitoring — captureEvent()", () => {
    it("should capture named events", () => {
      const events = getRecentEvents();
      const testEvt = events.find((e: any) => e.name === "test-event");
      expect(testEvt !== undefined).toBe(true);
    });

    it("should capture event data", () => {
      const events = getRecentEvents();
      const testEvt = events.find((e: any) => e.name === "test-event");
      expect(testEvt.data).toBeDefined();
    });

    it("should capture events without data", () => {
      const events = getRecentEvents();
      const bareEvt = events.find((e: any) => e.name === "bare-event");
      expect(bareEvt !== undefined).toBe(true);
    });

    it("should assign unique IDs", () => {
      const events = getRecentEvents();
      const ids = new Set(events.map((e: any) => e.id));
      expect(ids.size).toBe(events.length);
    });
  });

  describe("monitoring — getRecentErrors()", () => {
    it("should return an array", () => {
      const errors = getRecentErrors();
      expect(Array.isArray(errors)).toBe(true);
    });

    it("should return a copy (not the internal buffer)", () => {
      const errors1 = getRecentErrors();
      const errors2 = getRecentErrors();
      expect(errors1 !== errors2).toBe(true);
    });
  });

  describe("monitoring — getErrorStats()", () => {
    it("should return aggregated stats", () => {
      const stats = getErrorStats();
      expect(stats.totalErrors).toBeGreaterThan(0);
      expect(stats.lastHourCount >= 0).toBe(true);
      expect(stats.last24hCount >= 0).toBe(true);
    });

    it("should track errors by type", () => {
      const stats = getErrorStats();
      expect(stats.byType).toBeDefined();
      expect(stats.byType["Error"]).toBeGreaterThan(0);
    });

    it("should track errors by route", () => {
      const stats = getErrorStats();
      expect(stats.byRoute["/test"]).toBeGreaterThan(0);
    });
  });

  describe("monitoring — getMonitoringReport()", () => {
    it("should return a complete report", () => {
      const report = getMonitoringReport();
      expect(report.timestamp).toBeDefined();
      expect(Array.isArray(report.recentErrors)).toBe(true);
      expect(Array.isArray(report.recentEvents)).toBe(true);
      expect(report.stats).toBeDefined();
      expect(report.stats.totalErrors).toBeGreaterThan(0);
    });
  });
}
