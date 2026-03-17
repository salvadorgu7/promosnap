/**
 * Lightweight error/event capture system for PromoSnap.
 *
 * - In-memory buffer of last 100 errors and 200 events
 * - Optional Sentry integration (only if SENTRY_DSN env is set)
 * - Dynamic import for @sentry/nextjs so it doesn't break if not installed
 * - Structured log levels to reduce noise in production
 */

import type {
  CapturedError,
  CapturedEvent,
  ErrorStats,
  MonitoringReport,
} from "./types";
import { logger } from "@/lib/logger";

// ── In-memory buffers ──

const MAX_ERRORS = 100;
const MAX_EVENTS = 200;

const errorBuffer: CapturedError[] = [];
const eventBuffer: CapturedEvent[] = [];

let idCounter = 0;
function nextId(): string {
  return `${Date.now()}-${++idCounter}`;
}

// ── Log level control ──

const isProduction = process.env.NODE_ENV === "production";

/**
 * Log at debug level — suppressed in production to reduce noise.
 */
export function logDebug(tag: string, message: string, data?: Record<string, unknown>): void {
  if (isProduction) return;
  logger.debug(`${tag}.${message.replace(/\s+/g, '-').toLowerCase()}`, data);
}

/**
 * Log at info level — always shown, but kept concise.
 */
export function logInfo(tag: string, message: string, data?: Record<string, unknown>): void {
  logger.info(`${tag}.${message.replace(/\s+/g, '-').toLowerCase()}`, data);
}

/**
 * Log at warn level — indicates a recoverable problem.
 */
export function logWarn(tag: string, message: string, data?: Record<string, unknown>): void {
  logger.warn(`${tag}.${message.replace(/\s+/g, '-').toLowerCase()}`, data);
}

// ── Sentry integration (lazy, optional) ──

let sentryModule: any = null;
let sentryInitAttempted = false;

async function getSentry(): Promise<any> {
  if (sentryInitAttempted) return sentryModule;
  sentryInitAttempted = true;

  if (!process.env.SENTRY_DSN) return null;

  try {
    sentryModule = require("@sentry/nextjs");
    return sentryModule;
  } catch {
    // @sentry/nextjs not installed — that's fine
    return null;
  }
}

// ── Public API ──

/**
 * Capture an error with optional context.
 * Logs to console, stores in buffer, and forwards to Sentry if configured.
 */
export async function captureError(
  error: unknown,
  context?: { route?: string; [key: string]: unknown }
): Promise<void> {
  const err =
    error instanceof Error
      ? error
      : new Error(typeof error === "string" ? error : "Unknown error");

  const captured: CapturedError = {
    id: nextId(),
    timestamp: new Date().toISOString(),
    message: err.message,
    stack: err.stack,
    type: err.constructor?.name || "Error",
    route: context?.route as string | undefined,
    context: context ? { ...context } : undefined,
  };

  // Add to buffer (ring-buffer style)
  errorBuffer.unshift(captured);
  if (errorBuffer.length > MAX_ERRORS) {
    errorBuffer.length = MAX_ERRORS;
  }

  // Structured console output
  logger.error("monitoring.error-captured", {
    type: captured.type,
    message: captured.message,
    ...(context?.route ? { route: context.route } : {}),
    ...(context?.job ? { job: context.job } : {}),
  });

  // Forward to Sentry if available
  try {
    const sentry = await getSentry();
    if (sentry) {
      sentry.captureException(err, {
        extra: context,
        tags: { route: context?.route },
      });
    }
  } catch {
    // Sentry forwarding failed — don't recurse
  }
}

/**
 * Capture a named event with optional data.
 * Uses debug level for high-frequency events to reduce log noise.
 */
export function captureEvent(
  name: string,
  data?: Record<string, unknown>
): void {
  const captured: CapturedEvent = {
    id: nextId(),
    timestamp: new Date().toISOString(),
    name,
    data,
  };

  eventBuffer.unshift(captured);
  if (eventBuffer.length > MAX_EVENTS) {
    eventBuffer.length = MAX_EVENTS;
  }

  // Only log events at info level for important events, debug for routine ones
  const isRoutine = name.startsWith("cron:") || name.startsWith("job:");
  if (isRoutine && isProduction) {
    // Suppress routine event logs in production — they're still in the buffer
  } else {
    logger.info(`event.${name}`, data);
  }
}

/**
 * Returns the last 100 captured errors.
 */
export function getRecentErrors(): CapturedError[] {
  return [...errorBuffer];
}

/**
 * Returns the last 200 captured events.
 */
export function getRecentEvents(): CapturedEvent[] {
  return [...eventBuffer];
}

/**
 * Returns aggregated error statistics.
 */
export function getErrorStats(): ErrorStats {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const byType: Record<string, number> = {};
  const byRoute: Record<string, number> = {};
  let lastHourCount = 0;
  let last24hCount = 0;

  for (const err of errorBuffer) {
    const ts = new Date(err.timestamp).getTime();

    // Count by type
    byType[err.type] = (byType[err.type] || 0) + 1;

    // Count by route
    if (err.route) {
      byRoute[err.route] = (byRoute[err.route] || 0) + 1;
    }

    // Time-based counts
    if (ts >= oneDayAgo) {
      last24hCount++;
      if (ts >= oneHourAgo) {
        lastHourCount++;
      }
    }
  }

  return {
    totalErrors: errorBuffer.length,
    byType,
    byRoute,
    last24hCount,
    lastHourCount,
  };
}

/**
 * Returns a full monitoring report.
 */
export function getMonitoringReport(): MonitoringReport {
  return {
    timestamp: new Date().toISOString(),
    recentErrors: getRecentErrors(),
    recentEvents: getRecentEvents(),
    stats: getErrorStats(),
  };
}
