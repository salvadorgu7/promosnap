"use client"

import { useEffect } from "react"

/**
 * Web Vitals tracking using native PerformanceObserver API.
 * No external dependency — uses browser-native performance APIs.
 */
export default function WebVitals() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof PerformanceObserver === "undefined") return

    function send(name: string, value: number) {
      const body = JSON.stringify({
        name,
        value: Math.round(value),
        id: `${name}-${Date.now()}`,
        page: window.location.pathname,
      })

      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/analytics/vitals", body)
      } else {
        fetch("/api/analytics/vitals", {
          method: "POST",
          body,
          headers: { "Content-Type": "application/json" },
          keepalive: true,
        }).catch(() => {})
      }
    }

    try {
      // LCP — Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const last = entries[entries.length - 1]
        if (last) send("LCP", last.startTime)
      })
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true })

      // CLS — Cumulative Layout Shift
      let clsValue = 0
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value
          }
        }
      })
      clsObserver.observe({ type: "layout-shift", buffered: true })

      // FCP — First Contentful Paint
      const fcpObserver = new PerformanceObserver((list) => {
        const entry = list.getEntries().find(e => e.name === "first-contentful-paint")
        if (entry) send("FCP", entry.startTime)
      })
      fcpObserver.observe({ type: "paint", buffered: true })

      // Send CLS on page hide
      const sendCLS = () => { if (clsValue > 0) send("CLS", clsValue * 1000) }
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") sendCLS()
      })

      // TTFB from navigation timing
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined
      if (nav?.responseStart) {
        send("TTFB", nav.responseStart)
      }
    } catch {
      // PerformanceObserver not supported — skip
    }
  }, [])

  return null
}
