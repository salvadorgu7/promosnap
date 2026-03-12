"use client";

import { useState, useEffect } from "react";
import { ExternalLink } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface MobileCTAProps {
  price: number;
  affiliateUrl: string;
  sourceName: string;
}

export default function MobileCTA({ price, affiliateUrl, sourceName }: MobileCTAProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-surface-200 shadow-lg px-4 py-3 animate-fade-in">
      <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
        <div className="min-w-0">
          <p className="text-lg font-bold text-accent-blue font-display">{formatPrice(price)}</p>
          <p className="text-[11px] text-text-muted truncate">em {sourceName}</p>
        </div>
        <a
          href={affiliateUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="btn-primary flex items-center gap-2 px-6 py-2.5 text-sm font-semibold whitespace-nowrap"
        >
          Ver Oferta
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
