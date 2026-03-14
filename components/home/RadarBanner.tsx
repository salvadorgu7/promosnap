"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Radar, ArrowRight } from "lucide-react";

export default function RadarBanner() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ps_favorites");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCount(parsed.length);
        }
      }
    } catch {
      // localStorage unavailable or invalid JSON
    }
  }, []);

  if (count === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-2">
      <Link
        href="/radar"
        className="card flex items-center gap-3 p-3 hover:border-brand-500/30 transition-colors group"
      >
        <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
          <Radar className="w-4 h-4 text-brand-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary">Meu Radar</p>
          <p className="text-xs text-text-muted">
            {count} {count === 1 ? "produto monitorado" : "produtos monitorados"}
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-brand-500 flex-shrink-0" />
      </Link>
    </div>
  );
}
