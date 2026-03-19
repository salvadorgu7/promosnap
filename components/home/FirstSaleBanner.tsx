"use client";

import { Flame, ArrowRight, TrendingDown } from "lucide-react";
import Link from "next/link";

interface FirstSaleBannerProps {
  topDealName?: string;
  topDealSlug?: string;
  topDealPrice?: number;
  topDealDiscount?: number;
  activeOffers: number;
}

export default function FirstSaleBanner({
  topDealName,
  topDealSlug,
  topDealPrice,
  topDealDiscount,
  activeOffers,
}: FirstSaleBannerProps) {
  return (
    <section className="py-3">
      <div className="max-w-7xl mx-auto px-4">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-accent-green/10 via-green-50 to-emerald-50 border border-accent-green/20 p-4 sm:p-5">
          <div className="absolute top-0 right-0 w-40 h-40 bg-accent-green/5 rounded-full -translate-y-1/2 translate-x-1/2" />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-green/15 flex items-center justify-center flex-shrink-0">
                <Flame className="w-5 h-5 text-accent-green" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm text-text-primary">
                  {activeOffers}+ ofertas ativas agora
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Preços verificados de 4 lojas — encontre o menor preço
                </p>
              </div>
            </div>

            {topDealSlug && topDealName && (
              <div className="flex-1 min-w-0 hidden sm:block">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-3.5 h-3.5 text-accent-green flex-shrink-0" />
                  <span className="text-xs text-text-secondary truncate">
                    Destaque: <span className="font-semibold">{topDealName}</span>
                    {topDealPrice && (
                      <span className="text-accent-green font-bold ml-1">
                        R$ {topDealPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    )}
                    {topDealDiscount && topDealDiscount > 0 && (
                      <span className="text-accent-green font-bold ml-1">(-{topDealDiscount}%)</span>
                    )}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link
                href="/ofertas"
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-accent-green text-white text-sm font-semibold hover:bg-green-600 transition-colors whitespace-nowrap flex-1 sm:flex-initial justify-center"
              >
                Ver ofertas
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
