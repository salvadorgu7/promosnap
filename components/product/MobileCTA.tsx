"use client";

import { useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface MobileCTAProps {
  price: number;
  affiliateUrl: string;
  sourceName: string;
  offerId?: string;
}

export default function MobileCTA({ price, affiliateUrl, sourceName, offerId }: MobileCTAProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 120);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-14 md:bottom-0 left-0 right-0 z-40 lg:hidden bg-white/98 backdrop-blur-md border-t border-surface-200 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] px-4 py-2.5 animate-fade-in safe-area-bottom">
      <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
        <div className="min-w-0">
          <p className="text-lg font-bold text-accent-blue font-display leading-tight">{formatPrice(price)}</p>
          <p className="text-[11px] text-text-muted truncate">em {sourceName}</p>
        </div>
        <a
          href={offerId ? `/api/clickout/${offerId}?page=product&origin=mobile-cta` : affiliateUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="btn-primary flex items-center gap-2 px-6 py-3 text-sm font-bold whitespace-nowrap rounded-xl min-h-[44px] shadow-md"
        >
          Ver Oferta
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
