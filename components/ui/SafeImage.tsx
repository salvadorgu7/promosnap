"use client"

import { useState, useCallback } from "react"
import Image, { type ImageProps } from "next/image"
import { Package, ImageOff, Tag, Newspaper } from "lucide-react"
import type { ImageType } from "@/lib/images/types"
import { getFallbackImage, isValidImageUrl, getImageUrl } from "@/lib/images"

// ---------------------------------------------------------------------------
// Fallback icon per entity type
// ---------------------------------------------------------------------------

const FALLBACK_ICONS: Record<ImageType, typeof Package> = {
  product: ImageOff,
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

  // Validate the src URL, apply CDN transform if configured
  const srcStr = typeof src === "string" ? src : (src as any)?.src ?? ""
  const optimizedSrc = getImageUrl(srcStr, {
    width: typeof width === "number" ? width : undefined,
    height: typeof height === "number" ? height : undefined,
  })
  const validSrc = isValidImageUrl(srcStr) ? optimizedSrc : null

  // --- Fallback state ---
  if (!validSrc || error) {
    const FallbackIcon = FALLBACK_ICONS[fallbackType] ?? ImageOff
    const fallbackLabel = FALLBACK_LABELS[fallbackType] ?? "Sem imagem"

    return (
      <div
        className={`flex flex-col items-center justify-center gap-1.5 image-container bg-gradient-to-br from-surface-50 to-surface-100 rounded-lg ${className}`}
        style={!fill ? { width: width ?? "100%", height: height ?? "100%" } : undefined}
      >
        <div className="w-10 h-10 rounded-lg bg-surface-200/50 flex items-center justify-center">
          <FallbackIcon className="w-5 h-5 text-surface-300" />
        </div>
        <span className="text-[9px] text-surface-300 font-medium tracking-wide uppercase">{fallbackLabel}</span>
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
        <div className="absolute inset-0 shimmer rounded-lg" />
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
        {...rest}
      />
    </div>
  )
}
