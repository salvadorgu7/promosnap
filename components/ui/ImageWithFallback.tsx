"use client";

/**
 * ImageWithFallback — thin wrapper around SafeImage for backward compatibility.
 *
 * New code should import SafeImage directly for the full feature set
 * (type-aware fallbacks, blur placeholder, URL validation).
 */

import SafeImage from "./SafeImage";

interface ImageWithFallbackProps {
  src?: string | null;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  priority?: boolean;
}

export default function ImageWithFallback({
  src,
  alt,
  width,
  height,
  fill,
  className = "",
  priority = false,
}: ImageWithFallbackProps) {
  return (
    <SafeImage
      src={src ?? ""}
      alt={alt}
      width={width}
      height={height}
      fill={fill}
      className={className}
      priority={priority}
      fallbackType="product"
    />
  );
}
