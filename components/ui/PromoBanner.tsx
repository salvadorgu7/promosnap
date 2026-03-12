"use client";

import { useState } from "react";
import { X, Zap } from "lucide-react";
import Link from "next/link";

interface PromoBannerConfig {
  id: string;
  message: string;
  ctaText?: string;
  ctaUrl?: string;
  variant?: "info" | "promo" | "alert";
}

// Static config — can be replaced with API fetch later
const ACTIVE_BANNER: PromoBannerConfig | null = {
  id: "launch-v15",
  message: "PromoSnap agora compara precos de 4 marketplaces com historico de 90 dias!",
  ctaText: "Ver ofertas",
  ctaUrl: "/ofertas",
  variant: "promo",
};

const VARIANT_STYLES = {
  info: "from-accent-blue to-brand-500",
  promo: "from-accent-blue via-brand-500 to-accent-purple",
  alert: "from-accent-orange to-accent-red",
};

export default function PromoBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (!ACTIVE_BANNER || dismissed) return null;

  const gradientClass = VARIANT_STYLES[ACTIVE_BANNER.variant || "info"];

  return (
    <div className={`promo-banner relative bg-gradient-to-r ${gradientClass} text-white`}>
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-3 text-sm">
        <Zap className="w-4 h-4 flex-shrink-0 animate-pulse" />
        <span className="font-medium text-center">
          {ACTIVE_BANNER.message}
        </span>
        {ACTIVE_BANNER.ctaText && ACTIVE_BANNER.ctaUrl && (
          <Link
            href={ACTIVE_BANNER.ctaUrl}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 text-xs font-semibold transition-colors whitespace-nowrap"
          >
            {ACTIVE_BANNER.ctaText}
          </Link>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Fechar banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
