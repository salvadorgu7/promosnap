"use client";

import { useState, useRef } from "react";
import { ChevronDown, ChevronUp, Layers, Store, Tag } from "lucide-react";
import OfferCard from "@/components/cards/OfferCard";
import MiniCluster from "@/components/product/MiniCluster";
import { formatPrice } from "@/lib/utils";
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
  /** Canonical product name when available */
  canonicalName?: string;
}

interface ProductGroupingProps {
  groups: ProductGroup[];
}

function GroupCard({ group }: { group: ProductGroup }) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // If single product, just render the OfferCard
  if (group.related.length === 0) {
    return <OfferCard product={group.primary} />;
  }

  // Calculate the best price across all products in the group
  const allProducts = [group.primary, ...group.related];
  const bestPrice = Math.min(
    ...allProducts.map((p) => p.bestOffer.price)
  );
  const hasFreeShipping = allProducts.some((p) => p.bestOffer.isFreeShipping);

  return (
    <div className="relative">
      {/* Canonical group header */}
      {group.canonicalName && (
        <div className="px-3 py-1.5 bg-surface-50 border border-surface-200 border-b-0 rounded-t-xl flex items-center gap-2">
          <Layers className="h-3 w-3 text-brand-500" />
          <span className="text-[11px] font-medium text-text-secondary truncate">
            {group.canonicalName}
          </span>
        </div>
      )}

      <OfferCard product={group.primary} />

      {/* Group info strip — best price + stores/offers pills */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-surface-50 to-white border border-t-0 border-surface-200">
        {/* Best price across group */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-muted">Melhor preco:</span>
          <span className="text-xs font-bold text-accent-green">
            {formatPrice(bestPrice)}
          </span>
          {hasFreeShipping && (
            <span className="text-[9px] text-accent-green font-medium">Frete gratis</span>
          )}
        </div>

        {/* Stores and offers pills */}
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-blue/10 text-accent-blue text-[10px] font-medium">
            <Store className="h-2.5 w-2.5" />
            {group.totalStores} {group.totalStores === 1 ? "loja" : "lojas"}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-orange/10 text-accent-orange text-[10px] font-medium">
            <Tag className="h-2.5 w-2.5" />
            {group.totalOffers} {group.totalOffers === 1 ? "oferta" : "ofertas"}
          </span>
        </div>
      </div>

      {/* Expansion button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1.5 py-2 bg-surface-50 border border-t-0 border-surface-200 rounded-b-xl text-xs text-text-muted hover:text-brand-500 hover:bg-surface-100 transition-colors"
      >
        {expanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        <span>
          {expanded ? "Recolher" : `Ver ${group.related.length} ${group.related.length === 1 ? "oferta similar" : "ofertas similares"}`}
        </span>
      </button>

      {/* Expanded related products with smooth animation */}
      <div
        ref={contentRef}
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: expanded ? `${(contentRef.current?.scrollHeight ?? 0) + 20}px` : "0px",
          opacity: expanded ? 1 : 0,
        }}
      >
        <div className="mt-2 grid grid-cols-1 gap-2">
          {group.related.map((product) => (
            <div key={product.id} className="relative">
              <div className="absolute top-2 left-2 z-10">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-surface-100/90 backdrop-blur-sm text-[10px] text-text-muted font-medium border border-surface-200">
                  <Layers className="h-2.5 w-2.5" />
                  Produto similar
                </span>
              </div>
              <OfferCard product={product} />
            </div>
          ))}
        </div>
      </div>
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
      canonicalName: cards.length > 1 ? primary.name : undefined,
    });
  }

  // Sort groups by primary's best offer score
  groups.sort((a, b) => b.primary.bestOffer.offerScore - a.primary.bestOffer.offerScore);

  return groups;
}
