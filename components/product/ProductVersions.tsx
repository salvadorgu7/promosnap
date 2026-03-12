"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/utils";

interface ProductVersion {
  id: string;
  label: string;
  slug: string | null;
  price: number | null;
  isActive: boolean;
}

interface VariantGroup {
  label: string;
  type: "storage" | "color" | "size" | "other";
  versions: ProductVersion[];
}

interface ProductVersionsProps {
  variants: VariantGroup[];
  currentVariantId?: string;
}

export default function ProductVersions({
  variants,
  currentVariantId,
}: ProductVersionsProps) {
  if (!variants.length) return null;

  // Filter out groups with only one version
  const displayGroups = variants.filter((g) => g.versions.length > 1);
  if (displayGroups.length === 0) return null;

  return (
    <div className="space-y-3">
      {displayGroups.map((group) => (
        <div key={group.label}>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
            {group.label}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.versions.map((version) => {
              const isSelected = version.id === currentVariantId;
              const content = (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all cursor-pointer ${
                    isSelected
                      ? "border-accent-blue bg-accent-blue/5 text-accent-blue ring-1 ring-accent-blue/30"
                      : "border-surface-200 bg-white text-text-secondary hover:border-accent-blue/40 hover:text-text-primary"
                  }`}
                >
                  {group.type === "color" && (
                    <span
                      className="h-3 w-3 rounded-full border border-surface-200 flex-shrink-0"
                      style={{ backgroundColor: getColorHex(version.label) }}
                    />
                  )}
                  <span>{version.label}</span>
                  {version.price !== null && (
                    <span className="text-xs text-text-muted ml-0.5">
                      {formatPrice(version.price)}
                    </span>
                  )}
                </span>
              );

              if (version.slug && !isSelected) {
                return (
                  <Link
                    key={version.id}
                    href={`/produto/${version.slug}`}
                    prefetch={false}
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <div key={version.id} className={isSelected ? "cursor-default" : ""}>
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Color helper ───────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
  preto: "#1a1a1a",
  black: "#1a1a1a",
  branco: "#f5f5f5",
  white: "#f5f5f5",
  azul: "#3b82f6",
  blue: "#3b82f6",
  vermelho: "#ef4444",
  red: "#ef4444",
  verde: "#22c55e",
  green: "#22c55e",
  amarelo: "#eab308",
  yellow: "#eab308",
  rosa: "#ec4899",
  pink: "#ec4899",
  roxo: "#a855f7",
  purple: "#a855f7",
  cinza: "#9ca3af",
  gray: "#9ca3af",
  grey: "#9ca3af",
  prata: "#c0c0c0",
  silver: "#c0c0c0",
  dourado: "#d4a574",
  gold: "#d4a574",
  laranja: "#f97316",
  orange: "#f97316",
  marrom: "#92400e",
  brown: "#92400e",
  bege: "#d2b48c",
  beige: "#d2b48c",
  coral: "#f87171",
  grafite: "#4b5563",
  titanio: "#8b8680",
  titanium: "#8b8680",
};

function getColorHex(colorName: string): string {
  const lower = colorName.toLowerCase().trim();
  return COLOR_MAP[lower] ?? "#d1d5db";
}
