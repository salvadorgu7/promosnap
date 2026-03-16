"use client";

import { useState } from "react";
import { X, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import type { ProductFilter, ActiveFilters } from "@/lib/catalog/attribute-filters";

interface AttributeFiltersProps {
  filters: ProductFilter[];
  activeFilters: ActiveFilters;
  onChange: (filters: ActiveFilters) => void;
  totalCount?: number;
  filteredCount?: number;
}

export default function AttributeFilters({
  filters,
  activeFilters,
  onChange,
  totalCount,
  filteredCount,
}: AttributeFiltersProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(filters.map((f) => f.key))
  );

  const hasActiveFilters =
    (activeFilters.brand?.length ?? 0) > 0 ||
    (activeFilters.storage?.length ?? 0) > 0 ||
    (activeFilters.color?.length ?? 0) > 0 ||
    (activeFilters.screenSize?.length ?? 0) > 0 ||
    activeFilters.priceRange !== undefined ||
    activeFilters.freeShipping === true ||
    activeFilters.minRating !== undefined;

  function toggleSection(key: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleCheckbox(filterKey: string, value: string) {
    const updated = { ...activeFilters };
    const arrayKey = filterKey as keyof Pick<
      ActiveFilters,
      "brand" | "storage" | "color" | "screenSize"
    >;

    if (arrayKey === "brand" || arrayKey === "storage" || arrayKey === "color" || arrayKey === "screenSize") {
      const current = updated[arrayKey] ?? [];
      if (current.includes(value)) {
        updated[arrayKey] = current.filter((v) => v !== value);
        if (updated[arrayKey]!.length === 0) delete updated[arrayKey];
      } else {
        updated[arrayKey] = [...current, value];
      }
    } else if (filterKey === "freeShipping") {
      if (updated.freeShipping) {
        delete updated.freeShipping;
      } else {
        updated.freeShipping = true;
      }
    } else if (filterKey === "minRating") {
      const numVal = parseFloat(value);
      if (updated.minRating === numVal) {
        delete updated.minRating;
      } else {
        updated.minRating = numVal;
      }
    } else if (filterKey === "priceRange") {
      const [min, max] = value.split("-").map(Number);
      if (
        updated.priceRange?.min === min &&
        updated.priceRange?.max === max
      ) {
        delete updated.priceRange;
      } else {
        updated.priceRange = { min, max: max || Infinity };
      }
    }

    onChange(updated);
  }

  function clearFilters() {
    onChange({});
  }

  function removeFilter(key: string, value?: string) {
    const updated = { ...activeFilters };
    const arrayKey = key as keyof Pick<
      ActiveFilters,
      "brand" | "storage" | "color" | "screenSize"
    >;

    if (
      value &&
      (arrayKey === "brand" || arrayKey === "storage" || arrayKey === "color" || arrayKey === "screenSize")
    ) {
      const current = updated[arrayKey] ?? [];
      updated[arrayKey] = current.filter((v) => v !== value);
      if (updated[arrayKey]!.length === 0) delete updated[arrayKey];
    } else if (key === "freeShipping") {
      delete updated.freeShipping;
    } else if (key === "minRating") {
      delete updated.minRating;
    } else if (key === "priceRange") {
      delete updated.priceRange;
    }

    onChange(updated);
  }

  function isChecked(filterKey: string, value: string): boolean {
    if (filterKey === "freeShipping") return activeFilters.freeShipping === true;
    if (filterKey === "minRating")
      return activeFilters.minRating === parseFloat(value);
    if (filterKey === "priceRange") {
      const [min, max] = value.split("-").map(Number);
      return (
        activeFilters.priceRange?.min === min &&
        activeFilters.priceRange?.max === (max || Infinity)
      );
    }
    const arrayKey = filterKey as keyof Pick<
      ActiveFilters,
      "brand" | "storage" | "color" | "screenSize"
    >;
    return (activeFilters[arrayKey] ?? []).includes(value);
  }

  // Get active filter pills for display
  const activePills: { key: string; value: string; label: string }[] = [];
  for (const f of filters) {
    if (f.key === "freeShipping" && activeFilters.freeShipping) {
      activePills.push({ key: f.key, value: "true", label: "Frete Grátis" });
    } else if (f.key === "minRating" && activeFilters.minRating !== undefined) {
      activePills.push({
        key: f.key,
        value: activeFilters.minRating.toString(),
        label: `${activeFilters.minRating}+ estrelas`,
      });
    } else if (f.key === "priceRange" && activeFilters.priceRange) {
      const range = activeFilters.priceRange;
      const rangeLabel = f.values.find(
        (v) => v.value === `${range.min}-${range.max}`
      )?.label;
      activePills.push({
        key: f.key,
        value: `${range.min}-${range.max}`,
        label: rangeLabel ?? `R$ ${range.min} - R$ ${range.max}`,
      });
    } else {
      const arrayKey = f.key as keyof Pick<
        ActiveFilters,
        "brand" | "storage" | "color" | "screenSize"
      >;
      const vals = activeFilters[arrayKey];
      if (Array.isArray(vals)) {
        for (const v of vals) {
          activePills.push({ key: f.key, value: v, label: v });
        }
      }
    }
  }

  const filterContent = (
    <div className="space-y-4">
      {/* Active filter pills */}
      {activePills.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {activePills.map((pill) => (
              <button
                key={`${pill.key}-${pill.value}`}
                onClick={() => removeFilter(pill.key, pill.value)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 transition-colors"
              >
                {pill.label}
                <X className="h-3 w-3" />
              </button>
            ))}
          </div>
          <button
            onClick={clearFilters}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors underline"
          >
            Limpar filtros
          </button>
        </div>
      )}

      {/* Count indicator */}
      {totalCount !== undefined && filteredCount !== undefined && hasActiveFilters && (
        <p className="text-xs text-text-muted">
          Mostrando {filteredCount} de {totalCount} produtos
        </p>
      )}

      {/* Filter sections */}
      {filters.map((filter) => (
        <div key={filter.key} className="border-b border-surface-100 pb-3 last:border-0">
          <button
            onClick={() => toggleSection(filter.key)}
            className="flex items-center justify-between w-full py-1.5 text-sm font-semibold text-text-primary hover:text-accent-blue transition-colors"
          >
            {filter.label}
            {expandedSections.has(filter.key) ? (
              <ChevronUp className="h-4 w-4 text-text-muted" />
            ) : (
              <ChevronDown className="h-4 w-4 text-text-muted" />
            )}
          </button>

          {expandedSections.has(filter.key) && (
            <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
              {filter.values.slice(0, 15).map((fv) => (
                <label
                  key={fv.value}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <input
                    type={filter.type === "toggle" ? "checkbox" : "checkbox"}
                    checked={isChecked(filter.key, fv.value)}
                    onChange={() => toggleCheckbox(filter.key, fv.value)}
                    className="h-3.5 w-3.5 rounded border-surface-300 text-accent-blue focus:ring-accent-blue/30"
                  />
                  <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors flex-1">
                    {fv.label}
                  </span>
                  <span className="text-xs text-text-muted">({fv.count})</span>
                </label>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-56 flex-shrink-0">
        <div className="sticky top-20 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
          </div>
          {filterContent}
        </div>
      </aside>

      {/* Mobile collapsible bar */}
      <div className="lg:hidden">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center justify-between w-full p-3 rounded-xl border border-surface-200 bg-white"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
            {hasActiveFilters && (
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-accent-blue text-white text-[10px] font-bold">
                {activePills.length}
              </span>
            )}
          </div>
          {mobileOpen ? (
            <ChevronUp className="h-4 w-4 text-text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-muted" />
          )}
        </button>

        {mobileOpen && (
          <div className="mt-2 p-4 rounded-xl border border-surface-200 bg-white">
            {filterContent}
          </div>
        )}
      </div>
    </>
  );
}
