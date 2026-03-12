"use client";

import { useState, useMemo } from "react";
import { Ticket, Clock, Store } from "lucide-react";
import CouponCopy from "@/components/ui/CouponCopy";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  endAt: string | null;
  sourceName: string;
  sourceSlug: string;
}

export default function CouponFilter({ coupons }: { coupons: Coupon[] }) {
  const [activeSource, setActiveSource] = useState("all");

  const sources = useMemo(() => {
    const map = new Map<string, { slug: string; name: string; count: number }>();
    for (const c of coupons) {
      const existing = map.get(c.sourceSlug);
      if (existing) {
        existing.count++;
      } else {
        map.set(c.sourceSlug, { slug: c.sourceSlug, name: c.sourceName, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [coupons]);

  const filtered = useMemo(() => {
    if (activeSource === "all") return coupons;
    return coupons.filter((c) => c.sourceSlug === activeSource);
  }, [coupons, activeSource]);

  const formatExpiry = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / 86400000);

    if (diffDays < 0) return null;
    if (diffDays === 0) return "Expira hoje";
    if (diffDays === 1) return "Expira amanha";
    if (diffDays <= 7) return `Expira em ${diffDays} dias`;
    return `Expira em ${d.toLocaleDateString("pt-BR")}`;
  };

  return (
    <>
      {/* Source filter pills */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        <Store className="w-4 h-4 text-text-muted flex-shrink-0" />
        <button
          onClick={() => setActiveSource("all")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            activeSource === "all"
              ? "bg-accent-blue text-white"
              : "bg-surface-100 text-text-secondary hover:bg-surface-200"
          }`}
        >
          Todos ({coupons.length})
        </button>
        {sources.map((s) => (
          <button
            key={s.slug}
            onClick={() => setActiveSource(s.slug)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeSource === s.slug
                ? "bg-accent-blue text-white"
                : "bg-surface-100 text-text-secondary hover:bg-surface-200"
            }`}
          >
            {s.name} ({s.count})
          </button>
        ))}
      </div>

      {/* Coupon cards */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((coupon) => {
            const expiry = formatExpiry(coupon.endAt);

            return (
              <div key={coupon.id} className="card p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-accent-blue flex-shrink-0" />
                    <span className="text-xs font-medium text-text-muted">
                      {coupon.sourceName}
                    </span>
                  </div>
                </div>

                {coupon.description && (
                  <p className="text-sm text-text-secondary leading-snug">
                    {coupon.description}
                  </p>
                )}

                <CouponCopy
                  code={coupon.code}
                  description={coupon.description || undefined}
                />

                {expiry && (
                  <div className="flex items-center gap-1.5 text-xs text-accent-orange">
                    <Clock className="w-3 h-3" />
                    {expiry}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 card">
          <Ticket className="h-10 w-10 text-surface-300 mx-auto mb-3" />
          <p className="text-sm text-text-muted">
            Nenhum cupom encontrado para este filtro.
          </p>
        </div>
      )}
    </>
  );
}
