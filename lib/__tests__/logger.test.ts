import { describe, it, expect, vi, beforeEach } from "vitest"

// Must mock env before importing logger
vi.stubEnv("NODE_ENV", "production")
vi.stubEnv("LOG_LEVEL", "debug")

// Fresh import after env setup
const { logger } = await import("../logger")

describe("logger", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("emits JSON in production", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    logger.info("test.event", { foo: "bar" })

    expect(spy).toHaveBeenCalledOnce()
    const arg = spy.mock.calls[0][0]
    const parsed = JSON.parse(arg)
    expect(parsed.level).toBe("info")
    expect(parsed.event).toBe("test.event")
    expect(parsed.foo).toBe("bar")
    expect(parsed.ts).toBeDefined()
  })

  it("uses console.error for error level", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    logger.error("test.fail", { error: new Error("boom") })

    expect(spy).toHaveBeenCalledOnce()
    const parsed = JSON.parse(spy.mock.calls[0][0])
    expect(parsed.level).toBe("error")
    expect(parsed.error.message).toBe("boom")
    expect(parsed.error.name).toBe("Error")
  })

  it("uses console.warn for warn level", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {})
    logger.warn("test.warning")

    expect(spy).toHaveBeenCalledOnce()
    const parsed = JSON.parse(spy.mock.calls[0][0])
    expect(parsed.level).toBe("warn")
  })

  it("child logger merges context", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const child = logger.child({ route: "api/seed" })
    child.info("seed.started", { count: 10 })

    const parsed = JSON.parse(spy.mock.calls[0][0])
    expect(parsed.route).toBe("api/seed")
    expect(parsed.count).toBe(10)
  })

  it("formats non-Error objects in error field", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    logger.error("test.fail", { error: "string error" })

    const parsed = JSON.parse(spy.mock.calls[0][0])
    expect(parsed.error.message).toBe("string error")
  })
})
