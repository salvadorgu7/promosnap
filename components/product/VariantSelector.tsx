"use client";

import { useState, useCallback } from "react";

interface Variant {
  id: string;
  variantName: string;
  color: string | null;
  size: string | null;
  storage: string | null;
  bestPrice?: number | null;
}

interface VariantSelectorProps {
  variants: Variant[];
  selectedId: string | null;
  onChange: (variantId: string | null) => void;
  formatPrice?: (price: number) => string;
}

function defaultFormatPrice(price: number): string {
  return price.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function VariantSelector({
  variants,
  selectedId,
  onChange,
  formatPrice: fmt = defaultFormatPrice,
}: VariantSelectorProps) {
  if (variants.length === 0) return null;

  // Group variants by attribute type
  const hasStorage = variants.some((v) => v.storage);
  const hasColor = variants.some((v) => v.color);
  const hasSize = variants.some((v) => v.size);

  // Determine label for the group
  const groupLabel = hasStorage
    ? "Armazenamento"
    : hasColor
      ? "Cor"
      : hasSize
        ? "Tamanho"
        : "Variante";

  // Get display text for a variant
  const getLabel = (v: Variant): string => {
    if (hasStorage && v.storage) return v.storage;
    if (hasColor && v.color) return v.color;
    if (hasSize && v.size) return v.size;
    return v.variantName;
  };

  return (
    <div className="card p-4">
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
        {groupLabel}
      </p>
      <div className="flex flex-wrap gap-2">
        {/* "All" pill */}
        <button
          onClick={() => onChange(null)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
            selectedId === null
              ? "bg-accent-blue text-white border-accent-blue shadow-sm"
              : "bg-white text-text-secondary border-surface-200 hover:border-surface-300 hover:bg-surface-50"
          }`}
        >
          Todos
        </button>

        {variants.map((variant) => {
          const isActive = selectedId === variant.id;
          const label = getLabel(variant);

          return (
            <button
              key={variant.id}
              onClick={() => onChange(variant.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                isActive
                  ? "bg-accent-blue text-white border-accent-blue shadow-sm"
                  : "bg-white text-text-secondary border-surface-200 hover:border-surface-300 hover:bg-surface-50"
              }`}
            >
              {hasColor && variant.color && (
                <span
                  className="inline-block w-3 h-3 rounded-full border border-surface-200"
                  style={{
                    backgroundColor: getColorHex(variant.color),
                  }}
                />
              )}
              <span>{label}</span>
              {variant.bestPrice != null && (
                <span
                  className={`text-[10px] ${
                    isActive ? "text-white/80" : "text-text-muted"
                  }`}
                >
                  {fmt(variant.bestPrice)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Simple color name to hex mapping for common Portuguese color names
function getColorHex(color: string): string {
  const map: Record<string, string> = {
    preto: "#000000",
    branco: "#FFFFFF",
    azul: "#3B82F6",
    vermelho: "#EF4444",
    verde: "#22C55E",
    amarelo: "#EAB308",
    rosa: "#EC4899",
    roxo: "#A855F7",
    cinza: "#6B7280",
    prata: "#C0C0C0",
    dourado: "#D4A843",
    laranja: "#F97316",
    grafite: "#4B5563",
    // English fallbacks
    black: "#000000",
    white: "#FFFFFF",
    blue: "#3B82F6",
    red: "#EF4444",
    green: "#22C55E",
    yellow: "#EAB308",
    pink: "#EC4899",
    purple: "#A855F7",
    gray: "#6B7280",
    silver: "#C0C0C0",
    gold: "#D4A843",
    orange: "#F97316",
  };
  return map[color.toLowerCase()] || "#9CA3AF";
}
