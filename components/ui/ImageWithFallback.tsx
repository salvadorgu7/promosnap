"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Package } from "lucide-react";

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
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const handleLoad = useCallback(() => setLoaded(true), []);
  const handleError = useCallback(() => setError(true), []);

  if (!src || error) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-50 to-slate-100 ${className}`}>
        <Package className="w-10 h-10 text-surface-300" />
        <span className="text-[10px] text-surface-300 font-medium">Sem imagem</span>
      </div>
    );
  }

  return (
    <div className={`relative ${fill ? "w-full h-full" : ""}`}>
      {/* Loading skeleton */}
      {!loaded && (
        <div className={`absolute inset-0 animate-pulse bg-slate-100 rounded-lg ${fill ? "" : ""}`} />
      )}
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : (width || 400)}
        height={fill ? undefined : (height || 400)}
        fill={fill}
        className={`${className} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        onLoad={handleLoad}
        onError={handleError}
        priority={priority}
        unoptimized
      />
    </div>
  );
}
