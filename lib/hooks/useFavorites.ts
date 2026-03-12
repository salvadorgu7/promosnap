"use client"

import { useState, useEffect, useCallback } from "react"

const STORAGE_KEY = "ps_favorites"
const MAX_FAVORITES = 50

function readFavorites(): string[] {
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

function writeFavorites(ids: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // localStorage full or unavailable
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([])

  // Sync from localStorage on mount
  useEffect(() => {
    setFavorites(readFavorites())
  }, [])

  const addFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      if (prev.includes(id)) return prev
      // FIFO: if at max, remove oldest (first element)
      const next = prev.length >= MAX_FAVORITES ? [...prev.slice(1), id] : [...prev, id]
      writeFavorites(next)
      return next
    })
  }, [])

  const removeFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.filter((f) => f !== id)
      writeFavorites(next)
      return next
    })
  }, [])

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      let next: string[]
      if (prev.includes(id)) {
        next = prev.filter((f) => f !== id)
      } else {
        next = prev.length >= MAX_FAVORITES ? [...prev.slice(1), id] : [...prev, id]
      }
      writeFavorites(next)
      return next
    })
  }, [])

  const isFavorite = useCallback(
    (id: string) => favorites.includes(id),
    [favorites]
  )

  const getFavorites = useCallback(() => favorites, [favorites])

  return { favorites, addFavorite, removeFavorite, toggleFavorite, isFavorite, getFavorites }
}
