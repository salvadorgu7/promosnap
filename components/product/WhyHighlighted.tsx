"use client";

import { useState } from "react";
import {
  Info,
  ChevronDown,
  ChevronUp,
  DollarSign,
  ShieldCheck,
  Star,
  Truck,
  TrendingUp,
} from "lucide-react";

interface Factor {
  label: string;
  value: number; // 0-100
  icon: typeof DollarSign;
  color: string;
  bgColor: string;
}

interface WhyHighlightedProps {
  offerScore: number;
  price: number;
  avgPrice?: number;
  rating?: number | null;
  isFreeShipping?: boolean;
  sourceReliability?: number;
}

function FactorBar({ factor }: { factor: Factor }) {
  const Icon = factor.icon;
  return (
    <div className="flex items-center gap-2.5">
      <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${factor.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs text-text-secondary">{factor.label}</span>
          <span className="text-[10px] font-medium text-text-muted">{Math.round(factor.value)}/100</span>
        </div>
        <div className="h-1.5 rounded-full bg-surface-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${factor.bgColor}`}
            style={{ width: `${Math.min(100, factor.value)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function WhyHighlighted({
  offerScore,
  price,
  avgPrice,
  rating,
  isFreeShipping,
  sourceReliability,
}: WhyHighlightedProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Build factors from available data
  const factors: Factor[] = [];

  // Price factor
  if (avgPrice && avgPrice > 0) {
    const ratio = price / avgPrice;
    const priceScore = ratio <= 0.7 ? 95 : ratio <= 0.85 ? 80 : ratio <= 1.0 ? 60 : ratio <= 1.1 ? 40 : 20;
    factors.push({
      label: "Preco",
      value: priceScore,
      icon: DollarSign,
      color: "text-accent-green",
      bgColor: "bg-accent-green",
    });
  } else {
    factors.push({
      label: "Preco",
      value: Math.min(90, offerScore * 1.1),
      icon: DollarSign,
      color: "text-accent-green",
      bgColor: "bg-accent-green",
    });
  }

  // Trust factor
  const trustValue = sourceReliability ?? Math.min(85, offerScore + 10);
  factors.push({
    label: "Confianca",
    value: trustValue,
    icon: ShieldCheck,
    color: "text-accent-blue",
    bgColor: "bg-accent-blue",
  });

  // Rating factor
  if (rating != null && rating > 0) {
    factors.push({
      label: "Avaliacao",
      value: (rating / 5) * 100,
      icon: Star,
      color: "text-accent-orange",
      bgColor: "bg-accent-orange",
    });
  }

  // Shipping factor
  factors.push({
    label: "Entrega",
    value: isFreeShipping ? 90 : 40,
    icon: Truck,
    color: "text-accent-purple",
    bgColor: "bg-accent-purple",
  });

  // Overall score
  factors.push({
    label: "Score geral",
    value: offerScore,
    icon: TrendingUp,
    color: "text-primary-700",
    bgColor: "bg-gradient-to-r from-accent-blue to-brand-500",
  });

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-50/50 transition-colors"
      >
        <span className="flex items-center gap-2 text-xs font-medium text-text-secondary">
          <Info className="h-3.5 w-3.5 text-text-muted" />
          Por que esta oferta aparece em destaque?
        </span>
        {isExpanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-text-muted" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-surface-100">
          <p className="text-[10px] text-text-muted pt-3 leading-relaxed">
            O PromoSnap analisa multiplos fatores para destacar as melhores ofertas.
            Veja a pontuacao detalhada:
          </p>
          <div className="space-y-2.5">
            {factors.map((factor) => (
              <FactorBar key={factor.label} factor={factor} />
            ))}
          </div>
          <p className="text-[10px] text-text-muted pt-1 leading-relaxed italic">
            Quanto maior a barra, melhor a oferta nesse criterio. Nenhum fator isolado
            determina o destaque &mdash; o score combina todos os indicadores.
          </p>
        </div>
      )}
    </div>
  );
}
