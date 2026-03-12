"use client";

import { useState } from "react";
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

  if (!src || error) {
    return (
      <div className={`flex items-center justify-center bg-surface-100 ${className}`}>
        <Package className="w-12 h-12 text-surface-300" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={fill ? undefined : (width || 400)}
      height={fill ? undefined : (height || 400)}
      fill={fill}
      className={className}
      onError={() => setError(true)}
      priority={priority}
      unoptimized
    />
  );
}
