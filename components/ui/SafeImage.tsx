"use client"

import { useState, useCallback } from "react"
import Image, { type ImageProps } from "next/image"
import { Package, ImageOff, Tag, Newspaper } from "lucide-react"
import type { ImageType } from "@/lib/images/types"
import { getFallbackImage, isValidImageUrl } from "@/lib/images"

// ---------------------------------------------------------------------------
// Fallback icon per entity type
// ---------------------------------------------------------------------------

const FALLBACK_ICONS: Record<ImageType, typeof Package> = {
  product: Package,
  brand: Tag,
  category: Tag,
  article: Newspaper,
}

const FALLBACK_LABELS: Record<ImageType, string> = {
  product: "Sem imagem",
  brand: "Marca",
  category: "Categoria",
  article: "Artigo",
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type SafeImageProps = Omit<ImageProps, "onError" | "onLoad" | "placeholder"> & {
  /** Which entity type — controls the fallback placeholder style */
  fallbackType?: ImageType
  /** Show skeleton loader while image is loading (default: true) */
  showSkeleton?: boolean
  /** Use blurDataURL placeholder (default: false) */
  useBlur?: boolean
  /** Custom blur data URL */
  blurDataURL?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * SafeImage — a wrapper around next/image with:
 * - Loading skeleton
 * - Error fallback with type-aware placeholder
 * - Optional blur placeholder
 * - Image URL validation
 */
export default function SafeImage({
  src,
  alt,
  fallbackType = "product",
  showSkeleton = true,
  useBlur = false,
  blurDataURL: customBlurDataURL,
  className = "",
  fill,
  width,
  height,
  priority,
  ...rest
}: SafeImageProps) {
  const [error, setError] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const handleLoad = useCallback(() => setLoaded(true), [])
  const handleError = useCallback(() => setError(true), [])

  // Validate the src URL
  const srcStr = typeof src === "string" ? src : (src as any)?.src ?? ""
  const validSrc = isValidImageUrl(srcStr) ? src : null

  // --- Fallback state ---
  if (!validSrc || error) {
    const FallbackIcon = FALLBACK_ICONS[fallbackType] ?? ImageOff
    const fallbackLabel = FALLBACK_LABELS[fallbackType] ?? "Sem imagem"

    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-50 to-slate-100 ${className}`}
        style={!fill ? { width: width ?? "100%", height: height ?? "100%" } : undefined}
      >
        <FallbackIcon className="w-10 h-10 text-surface-300" />
        <span className="text-[10px] text-surface-300 font-medium">{fallbackLabel}</span>
      </div>
    )
  }

  // --- Blur placeholder data URL ---
  const blurData =
    customBlurDataURL || (useBlur ? getFallbackImage(fallbackType) : undefined)

  return (
    <div className={`relative ${fill ? "w-full h-full" : ""}`}>
      {/* Loading skeleton */}
      {showSkeleton && !loaded && (
        <div className="absolute inset-0 animate-pulse bg-slate-100 rounded-lg" />
      )}

      <Image
        src={validSrc}
        alt={alt}
        width={fill ? undefined : (width ?? 400)}
        height={fill ? undefined : (height ?? 400)}
        fill={fill}
        className={`${className} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={handleLoad}
        onError={handleError}
        priority={priority}
        placeholder={blurData ? "blur" : "empty"}
        blurDataURL={blurData}
        unoptimized
        {...rest}
      />
    </div>
  )
}
