"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Zap, TrendingDown, Clock, Flame, ArrowRight } from "lucide-react";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import { formatPrice } from "@/lib/utils";

interface Opportunity {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  sourceName: string;
  reason: "price_drop" | "limited" | "trending";
  reasonLabel: string;
}

const REASON_CONFIG = {
  price_drop: {
    icon: TrendingDown,
    color: "text-accent-green",
    bg: "bg-accent-green/10",
    border: "border-accent-green/20",
  },
  limited: {
    icon: Clock,
    color: "text-accent-orange",
    bg: "bg-accent-orange/10",
    border: "border-accent-orange/20",
  },
  trending: {
    icon: Flame,
    color: "text-accent-red",
    bg: "bg-accent-red/10",
    border: "border-accent-red/20",
  },
};

export default function DailyOpportunities() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOpportunities() {
      try {
        const res = await fetch("/api/opportunities");
        if (res.ok) {
          const data = await res.json();
          if (data.opportunities && data.opportunities.length > 0) {
            setOpportunities(data.opportunities.slice(0, 4));
          }
        }
      } catch {
        // silently fail — section just won't show
      } finally {
        setLoading(false);
      }
    }

    fetchOpportunities();
  }, []);

  if (loading || opportunities.length === 0) return null;

  return (
    <section className="py-4 md:py-6">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent-green/10 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-accent-green" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-base md:text-lg text-text-primary">
                  Oportunidades do Dia
                </h2>
                <span className="section-live-indicator">
                  <span className="pulse-dot" />
                  Ao vivo
                </span>
              </div>
              <p className="text-xs text-text-muted">
                Produtos com maior valor de decisao agora
              </p>
            </div>
          </div>
          <Link
            href="/ofertas"
            className="text-sm text-accent-blue hover:text-brand-500 font-medium flex items-center gap-1"
          >
            Ver todas <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {opportunities.map((opp) => {
            const config = REASON_CONFIG[opp.reason];
            const ReasonIcon = config.icon;

            return (
              <Link
                key={opp.id}
                href={`/produto/${opp.slug}`}
                className="opportunity-card group flex flex-col p-3 md:p-4 pl-4 md:pl-6"
              >
                {/* Image + discount badge */}
                <div className="relative aspect-square rounded-lg overflow-hidden image-container mb-2 md:mb-3">
                  <ImageWithFallback
                    src={opp.imageUrl}
                    alt={opp.name}
                    className="w-full h-full object-contain p-2 md:p-3 group-hover:scale-105 transition-transform duration-500"
                    width={200}
                    height={200}
                  />
                  {opp.discount && opp.discount > 0 && (
                    <div className="absolute top-2 right-2 bg-gradient-to-r from-accent-red to-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                      -{opp.discount}%
                    </div>
                  )}
                </div>

                {/* Name */}
                <h3 className="text-sm font-medium text-text-primary leading-snug line-clamp-2 group-hover:text-accent-blue transition-colors mb-1">
                  {opp.name}
                </h3>

                {/* Source */}
                <span className="text-[10px] text-text-muted mb-2">
                  {opp.sourceName}
                </span>

                {/* Price */}
                <div className="mt-auto">
                  {opp.originalPrice && opp.originalPrice > opp.price && (
                    <span className="price-old text-xs">
                      {formatPrice(opp.originalPrice)}
                    </span>
                  )}
                  <div className="price-big text-xl">{formatPrice(opp.price)}</div>
                </div>

                {/* "Por que agora" reason */}
                <div
                  className={`mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold ${config.bg} ${config.color} border ${config.border} self-start`}
                >
                  <ReasonIcon className="h-3 w-3" />
                  {opp.reasonLabel}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
