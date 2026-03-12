"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Layers } from "lucide-react";
import OfferCard from "@/components/cards/OfferCard";
import MiniCluster from "@/components/product/MiniCluster";
import type { ProductCard } from "@/types";

interface ProductGroup {
  /** The primary product to display as the main card */
  primary: ProductCard;
  /** Other products in this group (same canonical product) */
  related: ProductCard[];
  /** Total number of offers across all products */
  totalOffers: number;
  /** Total number of distinct stores */
  totalStores: number;
}

interface ProductGroupingProps {
  groups: ProductGroup[];
}

function GroupCard({ group }: { group: ProductGroup }) {
  const [expanded, setExpanded] = useState(false);

  // If single product, just render the OfferCard
  if (group.related.length === 0) {
    return <OfferCard product={group.primary} />;
  }

  return (
    <div className="relative">
      <OfferCard product={group.primary} />

      {/* Expansion indicator */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-surface-50 border border-t-0 border-surface-200 rounded-b-xl text-xs text-text-muted hover:text-text-secondary hover:bg-surface-100 transition-colors"
      >
        <MiniCluster
          stores={group.totalStores}
          offers={group.totalOffers}
          compact
        />
        {expanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        <span>
          Ver {group.related.length}{" "}
          {group.related.length === 1 ? "oferta similar" : "ofertas similares"}
        </span>
      </button>

      {/* Expanded related products */}
      {expanded && (
        <div className="mt-2 grid grid-cols-1 gap-2">
          {group.related.map((product) => (
            <div key={product.id} className="relative">
              <div className="absolute top-2 left-2 z-10">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-100 text-[10px] text-text-muted font-medium">
                  <Layers className="h-2.5 w-2.5" />
                  Produto similar
                </span>
              </div>
              <OfferCard product={product} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Smart product grouping component for category/search listings.
 * Groups multiple listings of the same canonical product to avoid
 * duplicate-looking lists and shows an expansion control.
 */
export default function ProductGrouping({ groups }: ProductGroupingProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {groups.map((group) => (
        <GroupCard key={group.primary.id} group={group} />
      ))}
    </div>
  );
}

/**
 * Helper: given a list of ProductCards, group them by canonical productId
 * to create ProductGroup objects.
 */
export function groupProducts(products: ProductCard[]): ProductGroup[] {
  // Group by product id
  const map = new Map<string, ProductCard[]>();
  for (const product of products) {
    const key = product.id;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(product);
  }

  const groups: ProductGroup[] = [];

  for (const [, cards] of map) {
    // Sort by best offer score descending
    cards.sort((a, b) => b.bestOffer.offerScore - a.bestOffer.offerScore);

    const primary = cards[0];
    const related = cards.slice(1);

    // Count unique sources
    const sources = new Set<string>();
    let totalOffers = 0;
    for (const card of cards) {
      sources.add(card.bestOffer.sourceSlug);
      totalOffers += card.offersCount;
    }

    groups.push({
      primary,
      related,
      totalOffers,
      totalStores: sources.size,
    });
  }

  // Sort groups by primary's best offer score
  groups.sort((a, b) => b.primary.bestOffer.offerScore - a.primary.bestOffer.offerScore);

  return groups;
}
