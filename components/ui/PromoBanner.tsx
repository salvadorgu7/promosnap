"use client";

import { useState, useEffect } from "react";
import { X, Zap } from "lucide-react";
import Link from "next/link";

interface BannerData {
  id: string;
  title: string;
  subtitle?: string | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  bannerType: string;
}

const VARIANT_STYLES = {
  STRIP: "from-accent-blue via-brand-500 to-accent-purple",
  HERO: "from-accent-blue to-brand-500",
  MODAL: "from-accent-orange to-accent-red",
};

export default function PromoBanner() {
  const [banner, setBanner] = useState<BannerData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed in this session
    const dismissedId = sessionStorage.getItem("dismissed-banner");

    fetch("/api/banners/active?type=STRIP&limit=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.banners?.[0]) {
          const b = data.banners[0];
          if (dismissedId === b.id) return;
          setBanner(b);
        }
      })
      .catch(() => {
        // Fallback: show nothing if API fails
      });
  }, []);

  if (!banner || dismissed) return null;

  const gradientClass =
    VARIANT_STYLES[banner.bannerType as keyof typeof VARIANT_STYLES] ||
    VARIANT_STYLES.STRIP;

  return (
    <div
      className={`promo-banner relative bg-gradient-to-r ${gradientClass} text-white`}
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-3 text-sm">
        <Zap className="w-4 h-4 flex-shrink-0 animate-pulse" />
        <span className="font-medium text-center">{banner.title}</span>
        {banner.ctaText && banner.ctaUrl && (
          <Link
            href={banner.ctaUrl}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-xs font-semibold transition-colors whitespace-nowrap"
          >
            {banner.ctaText}
          </Link>
        )}
        <button
          onClick={() => {
            setDismissed(true);
            sessionStorage.setItem("dismissed-banner", banner.id);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Fechar banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
