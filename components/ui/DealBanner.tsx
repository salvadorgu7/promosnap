"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface Props {
  product: { name: string; slug: string; price: number; discount?: number; imageUrl?: string };
}

const LS_KEY = "ps_banner_dismissed";

export default function DealBanner({ product }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(LS_KEY);
      if (dismissed) {
        const ts = parseInt(dismissed, 10);
        const hoursSince = (Date.now() - ts) / (1000 * 60 * 60);
        if (hoursSince < 24) return;
      }
      setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(LS_KEY, Date.now().toString());
    } catch {
      // localStorage unavailable
    }
  };

  if (!product || !visible) return null;

  return (
    <div className="animate-slide-down bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400 text-surface-900">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <Link
          href={`/produto/${product.slug}`}
          className="flex items-center gap-2 text-sm font-medium truncate hover:underline"
        >
          <span className="flex-shrink-0">🔥</span>
          <span className="truncate">
            Melhor oferta agora:{" "}
            <strong className="font-semibold">{product.name}</strong>{" "}
            por <strong className="font-bold">{formatPrice(product.price)}</strong>
            {product.discount && product.discount > 0 && (
              <span className="ml-1 font-bold text-red-700">(-{product.discount}%)</span>
            )}
          </span>
        </Link>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
          aria-label="Fechar banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
