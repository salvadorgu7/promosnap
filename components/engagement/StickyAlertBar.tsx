"use client";

import { useEffect, useState } from "react";
import { Flame, X } from "lucide-react";
import Link from "next/link";
import { logger } from "@/lib/logger"

export default function StickyAlertBar() {
  const [alert, setAlert] = useState<{ text: string; href: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      // Check for price drops on favorited products
      const favorites = JSON.parse(localStorage.getItem("ps_favorites") || "[]");
      if (favorites.length === 0) return;

      // Check for recent price drops
      let dropsFound = 0;
      for (const fav of favorites.slice(0, 10)) {
        const key = `ps_price_${fav.slug || fav}`;
        const stored = localStorage.getItem(key);
        if (stored) {
          const prev = parseFloat(stored);
          const curr = fav.price || 0;
          if (curr > 0 && prev > curr && (prev - curr) / prev >= 0.05) {
            dropsFound++;
          }
        }
      }

      if (dropsFound > 0) {
        setAlert({
          text: `${dropsFound} ${dropsFound === 1 ? "produto favorito caiu de preco" : "produtos favoritos cairam de preco"}!`,
          href: "/radar",
        });
      }
    } catch (err) { logger.debug("sticky-alert.failed", { error: err }) }
  }, []);

  if (!alert || dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-accent-green to-emerald-500 text-white py-2 px-4 text-center relative animate-slide-down">
      <Link href={alert.href} className="inline-flex items-center gap-2 text-sm font-medium hover:underline">
        <Flame className="w-3.5 h-3.5" />
        {alert.text}
      </Link>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
