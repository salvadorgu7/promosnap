/**
 * Structured logger for PromoSnap.
 *
 * - JSON output in production (Vercel-friendly, filterable)
 * - Pretty output in development
 * - Zero external deps (works in Edge + Node)
 *
 * Usage:
 *   import { logger } from "@/lib/logger"
 *   logger.info("product.imported", { productId: "abc", count: 5 })
 *   logger.error("pipeline.failed", { error: err, stage: "hydrate" })
 */

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogPayload {
  [key: string]: unknown
}

const LEVEL_NUM: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

const MIN_LEVEL = (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === "production" ? "info" : "debug")

function shouldLog(level: LogLevel): boolean {
  return LEVEL_NUM[level] >= LEVEL_NUM[MIN_LEVEL]
}

function formatError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      message: err.message,
      name: err.name,
      ...(process.env.NODE_ENV !== "production" && err.stack ? { stack: err.stack } : {}),
    }
  }
  return { message: String(err) }
}

function emit(level: LogLevel, event: string, data?: LogPayload) {
  if (!shouldLog(level)) return

  // Extract and format error if present
  const payload: Record<string, unknown> = { ...data }
  if (payload.error) {
    payload.error = formatError(payload.error)
  }

  const isProd = process.env.NODE_ENV === "production"

  if (isProd) {
    // JSON structured output — one line per log, easy to parse in Vercel/Datadog/etc.
    const entry = {
      level,
      event,
      ts: new Date().toISOString(),
      ...payload,
    }
    const method = level === "error" ? "error" : level === "warn" ? "warn" : "log"
    console[method](JSON.stringify(entry))
  } else {
    // Pretty dev output
    const prefix = `[${level.toUpperCase()}]`
    const tag = `[${event}]`
    const hasPayload = Object.keys(payload).length > 0
    const method = level === "error" ? "error" : level === "warn" ? "warn" : level === "debug" ? "debug" : "log"

    if (hasPayload) {
      console[method](prefix, tag, payload)
    } else {
      console[method](prefix, tag)
    }
  }
}

export const logger = {
  debug: (event: string, data?: LogPayload) => emit("debug", event, data),
  info: (event: string, data?: LogPayload) => emit("info", event, data),
  warn: (event: string, data?: LogPayload) => emit("warn", event, data),
  error: (event: string, data?: LogPayload) => emit("error", event, data),

  /**
   * Create a child logger with preset context fields.
   * logger.child({ route: "api/admin/seed" }).error("import.failed", { count: 3 })
   */
  child: (context: LogPayload) => ({
    debug: (event: string, data?: LogPayload) => emit("debug", event, { ...context, ...data }),
    info: (event: string, data?: LogPayload) => emit("info", event, { ...context, ...data }),
    warn: (event: string, data?: LogPayload) => emit("warn", event, { ...context, ...data }),
    error: (event: string, data?: LogPayload) => emit("error", event, { ...context, ...data }),
  }),
}
