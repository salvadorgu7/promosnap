"use client";

import { useState } from "react";
import {
  Scale,
  Truck,
  Star,
  TrendingDown,
  Zap,
} from "lucide-react";
import OfferCard from "@/components/cards/OfferCard";
import type { ProductCard } from "@/types";

type IntentKey =
  | "custo-beneficio"
  | "entrega-rapida"
  | "mais-avaliados"
  | "em-queda"
  | "vale-agora";

interface IntentTab {
  key: IntentKey;
  label: string;
  icon: typeof Scale;
  sort: (items: ProductCard[]) => ProductCard[];
}

const INTENT_TABS: IntentTab[] = [
  {
    key: "custo-beneficio",
    label: "Melhor Custo-Beneficio",
    icon: Scale,
    sort: (items) =>
      [...items].sort((a, b) => {
        // Combined score: high offer score + bigger discount = better value
        const scoreA = a.bestOffer.offerScore + (a.bestOffer.discount || 0) * 0.5;
        const scoreB = b.bestOffer.offerScore + (b.bestOffer.discount || 0) * 0.5;
        return scoreB - scoreA;
      }),
  },
  {
    key: "entrega-rapida",
    label: "Entrega Rapida",
    icon: Truck,
    sort: (items) =>
      [...items]
        .filter((p) => p.bestOffer.isFreeShipping)
        .concat([...items].filter((p) => !p.bestOffer.isFreeShipping))
        .slice(0, items.length),
  },
  {
    key: "mais-avaliados",
    label: "Mais Bem Avaliados",
    icon: Star,
    sort: (items) =>
      [...items].sort(
        (a, b) => b.popularityScore - a.popularityScore
      ),
  },
  {
    key: "em-queda",
    label: "Em Queda",
    icon: TrendingDown,
    sort: (items) =>
      [...items].sort(
        (a, b) => (b.bestOffer.discount || 0) - (a.bestOffer.discount || 0)
      ),
  },
  {
    key: "vale-agora",
    label: "Vale Agora",
    icon: Zap,
    sort: (items) =>
      [...items].sort(
        (a, b) => b.bestOffer.offerScore - a.bestOffer.offerScore
      ),
  },
];

interface IntentShowcaseProps {
  /** All available products to sort/filter by intent */
  products: ProductCard[];
  /** Max products to show per tab */
  limit?: number;
}

export default function IntentShowcase({
  products,
  limit = 8,
}: IntentShowcaseProps) {
  const [activeTab, setActiveTab] = useState<IntentKey>("custo-beneficio");

  if (products.length === 0) return null;

  const currentTab = INTENT_TABS.find((t) => t.key === activeTab) || INTENT_TABS[0];
  const sorted = currentTab.sort(products).slice(0, limit);

  return (
    <section className="page-section">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="heading-md">Vitrines por Intencao</h2>
          <p className="text-sm text-text-muted mt-1.5">
            Encontre ofertas organizadas pelo que importa para voce
          </p>
        </div>

        {/* Intent tabs */}
        <div className="flex items-center justify-center gap-2 flex-wrap mb-8">
          {INTENT_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`intent-tab ${isActive ? "intent-tab-active" : ""}`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(" ").slice(-1)[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {sorted.map((product) => (
            <OfferCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
