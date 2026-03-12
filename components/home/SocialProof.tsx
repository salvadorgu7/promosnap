"use client";

import { MousePointerClick, Eye, TrendingUp } from "lucide-react";
import OfferCard from "@/components/cards/OfferCard";
import type { ProductCard } from "@/types";
import { useState } from "react";

interface SocialRankedItem {
  product: ProductCard;
  rankingType: string;
  signal: number;
  badge: string;
}

interface SocialProofProps {
  mostClicked: SocialRankedItem[];
  mostMonitored: SocialRankedItem[];
  mostPopular: SocialRankedItem[];
}

const TABS = [
  {
    key: "mostClicked" as const,
    label: "Mais populares",
    icon: MousePointerClick,
    color: "text-accent-blue",
    bg: "bg-accent-blue/10",
    borderActive: "border-accent-blue",
  },
  {
    key: "mostMonitored" as const,
    label: "Mais monitorados",
    icon: Eye,
    color: "text-accent-green",
    bg: "bg-accent-green/10",
    borderActive: "border-accent-green",
  },
  {
    key: "mostPopular" as const,
    label: "Mais compartilhados",
    icon: TrendingUp,
    color: "text-accent-orange",
    bg: "bg-accent-orange/10",
    borderActive: "border-accent-orange",
  },
];

export default function SocialProof({
  mostClicked,
  mostMonitored,
  mostPopular,
}: SocialProofProps) {
  const [activeTab, setActiveTab] = useState<
    "mostClicked" | "mostMonitored" | "mostPopular"
  >("mostClicked");

  const data: Record<string, SocialRankedItem[]> = {
    mostClicked,
    mostMonitored,
    mostPopular,
  };

  const items = data[activeTab] || [];

  if (
    mostClicked.length === 0 &&
    mostMonitored.length === 0 &&
    mostPopular.length === 0
  ) {
    return null;
  }

  return (
    <section className="py-8 section-border-top">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-500" />
            <h2 className="font-display font-bold text-lg text-text-primary">
              Ranking Social
            </h2>
          </div>
          <span className="text-xs text-text-muted">
            Baseado em dados reais de engajamento
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap border ${
                  isActive
                    ? `${tab.bg} ${tab.color} ${tab.borderActive}`
                    : "border-surface-200 text-text-muted hover:bg-surface-50 hover:border-surface-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        {items.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {items.slice(0, 6).map((item, i) => (
              <div key={item.product.id} className="relative">
                {/* Rank badge */}
                <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-surface-900 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                  {i + 1}
                </div>
                <OfferCard product={item.product} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-text-muted">
            Nenhum dado de engajamento disponivel para esta categoria ainda.
          </div>
        )}
      </div>
    </section>
  );
}
