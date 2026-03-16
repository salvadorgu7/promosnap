"use client";

import { useEffect, useState } from "react";
import { TrendingDown, Bell, X } from "lucide-react";
import Link from "next/link";
import { logger } from "@/lib/logger"

interface PriceDropAlertProps {
  productSlug: string;
  productName: string;
  currentPrice: number;
}

export default function PriceDropAlert({ productSlug, productName, currentPrice }: PriceDropAlertProps) {
  const [previousPrice, setPreviousPrice] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const key = `ps_price_${productSlug}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const prev = parseFloat(stored);
        if (prev > currentPrice && (prev - currentPrice) / prev >= 0.03) {
          setPreviousPrice(prev);
        }
      }
      localStorage.setItem(key, String(currentPrice));
    } catch (err) { logger.debug("price-drop-alert.failed", { error: err }) }
  }, [productSlug, currentPrice]);

  if (!previousPrice || dismissed) return null;

  const dropPercent = Math.round(((previousPrice - currentPrice) / previousPrice) * 100);

  return (
    <div className="rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-accent-green/20 p-3 mb-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent-green/15 flex items-center justify-center flex-shrink-0">
          <TrendingDown className="w-4 h-4 text-accent-green" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary">
            Preco caiu {dropPercent}%!
          </p>
          <p className="text-xs text-text-muted">
            De R$ {previousPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} para R$ {currentPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-surface-400 hover:text-text-primary"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
