"use client"

import { useState, useEffect, useCallback } from "react"

const STORAGE_KEY = "ps_recently_viewed"
const MAX_ITEMS = 20

function readViewed(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeViewed(slugs: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs))
  } catch {
    // localStorage full or unavailable
  }
}

export function useRecentlyViewed() {
  const [viewed, setViewed] = useState<string[]>([])

  useEffect(() => {
    setViewed(readViewed())
  }, [])

  const addViewed = useCallback((slug: string) => {
    setViewed((prev) => {
      // Remove duplicate if exists, then prepend (most recent first)
      const filtered = prev.filter((s) => s !== slug)
      const next = [slug, ...filtered].slice(0, MAX_ITEMS)
      writeViewed(next)
      return next
    })
  }, [])

  const getViewed = useCallback(() => viewed, [viewed])

  return { viewed, addViewed, getViewed }
}
