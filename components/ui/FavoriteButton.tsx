"use client"

import { Heart } from "lucide-react"
import { useFavorites } from "@/lib/hooks/useFavorites"

interface Props {
  productId: string
  size?: "sm" | "md"
}

export default function FavoriteButton({ productId, size = "sm" }: Props) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const favorited = isFavorite(productId)

  const sizeClasses = size === "sm" ? "h-8 w-8" : "h-10 w-10"
  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5"

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleFavorite(productId)
      }}
      className={`${sizeClasses} flex items-center justify-center rounded-full
        bg-white/80 backdrop-blur-sm border border-surface-200
        hover:bg-white hover:scale-110 active:scale-95
        transition-all duration-200 shadow-sm`}
      aria-label={favorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
    >
      <Heart
        className={`${iconSize} transition-colors duration-200 ${
          favorited
            ? "fill-accent-red text-accent-red"
            : "fill-none text-text-muted hover:text-accent-red"
        }`}
      />
    </button>
  )
}
