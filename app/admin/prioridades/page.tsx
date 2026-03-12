import { Target, Package, Tag, Layers, Search, ArrowRight, Lightbulb, AlertTriangle } from "lucide-react";
import {
  getPrioritizedCategories,
  getPrioritizedProducts,
  getPrioritizedBrands,
  getKeywordOpportunities,
} from "@/lib/catalog/prioritization";

export const dynamic = "force-dynamic";

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? "text-accent-green bg-green-50"
      : score >= 40
        ? "text-accent-orange bg-orange-50"
        : "text-red-500 bg-red-50";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${color}`}
    >
      {score}
    </span>
  );
}

function ReasonsList({ reasons }: { reasons: string[] }) {
  if (reasons.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {reasons.map((r, i) => (
        <span
          key={i}
          className="text-[11px] text-text-muted bg-surface-100 px-2 py-0.5 rounded"
        >
          {r}
        </span>
      ))}
    </div>
  );
}

function SuggestionsList({ suggestions }: { suggestions: string[] }) {
  if (suggestions.length === 0) return null;
  return (
    <div className="mt-2 space-y-1">
      {suggestions.map((s, i) => (
        <div key={i} className="flex items-start gap-1.5 text-xs text-accent-blue">
          <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>{s}</span>
        </div>
      ))}
    </div>
  );
}

export default async function AdminPrioridadesPage() {
  const [categories, brands, products, keywords] = await Promise.all([
    getPrioritizedCategories(),
    getPrioritizedBrands(),
    getPrioritizedProducts(),
    getKeywordOpportunities(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
          <Target className="w-6 h-6 text-accent-blue" />
          Prioridades do Catalogo
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Oportunidades ranqueadas por demanda, engajamento e gaps de oferta
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Produtos Prioritarios */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-accent-blue" />
            <h2 className="font-display font-semibold text-text-primary">
              Produtos Prioritarios
            </h2>
            <span className="text-xs text-text-muted ml-auto">
              {products.length} itens
            </span>
          </div>
          {products.length > 0 ? (
            <div className="space-y-3">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-lg bg-surface-50 border border-surface-200"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-text-primary truncate">
                      {p.name}
                    </span>
                    <ScoreBadge score={p.score} />
                  </div>
                  <ReasonsList reasons={p.reasons} />
                  <SuggestionsList suggestions={p.suggestions} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Nenhum produto prioritario identificado." />
          )}
        </div>

        {/* Marcas Prioritarias */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="w-5 h-5 text-accent-green" />
            <h2 className="font-display font-semibold text-text-primary">
              Marcas Prioritarias
            </h2>
            <span className="text-xs text-text-muted ml-auto">
              {brands.length} itens
            </span>
          </div>
          {brands.length > 0 ? (
            <div className="space-y-3">
              {brands.map((b) => (
                <div
                  key={b.id}
                  className="p-3 rounded-lg bg-surface-50 border border-surface-200"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-text-primary truncate">
                      {b.name}
                    </span>
                    <ScoreBadge score={b.score} />
                  </div>
                  <ReasonsList reasons={b.reasons} />
                  <SuggestionsList suggestions={b.suggestions} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Nenhuma marca prioritaria identificada." />
          )}
        </div>

        {/* Categorias Quentes */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-accent-orange" />
            <h2 className="font-display font-semibold text-text-primary">
              Categorias Quentes
            </h2>
            <span className="text-xs text-text-muted ml-auto">
              {categories.length} itens
            </span>
          </div>
          {categories.length > 0 ? (
            <div className="space-y-3">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-lg bg-surface-50 border border-surface-200"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-text-primary truncate">
                      {c.name}
                    </span>
                    <ScoreBadge score={c.score} />
                  </div>
                  <ReasonsList reasons={c.reasons} />
                  <SuggestionsList suggestions={c.suggestions} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Nenhuma categoria quente identificada." />
          )}
        </div>

        {/* Keywords com Potencial */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-brand-500" />
            <h2 className="font-display font-semibold text-text-primary">
              Keywords com Potencial
            </h2>
            <span className="text-xs text-text-muted ml-auto">
              {keywords.length} itens
            </span>
          </div>
          {keywords.length > 0 ? (
            <div className="space-y-3">
              {keywords.map((k) => (
                <div
                  key={k.id}
                  className="p-3 rounded-lg bg-surface-50 border border-surface-200"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-text-primary truncate">
                      &ldquo;{k.name}&rdquo;
                    </span>
                    <ScoreBadge score={k.score} />
                  </div>
                  <ReasonsList reasons={k.reasons} />
                  <SuggestionsList suggestions={k.suggestions} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Nenhuma keyword com potencial identificada." />
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="card p-4 bg-accent-blue/5 border-accent-blue/20">
        <div className="flex items-start gap-3">
          <Lightbulb className="w-5 h-5 text-accent-blue mt-0.5" />
          <div>
            <h3 className="font-display font-semibold text-text-primary text-sm">
              Resumo de Oportunidades
            </h3>
            <p className="text-xs text-text-muted mt-1">
              {products.filter((p) => p.score >= 50).length} produtos,{" "}
              {brands.filter((b) => b.score >= 50).length} marcas,{" "}
              {categories.filter((c) => c.score >= 50).length} categorias e{" "}
              {keywords.filter((k) => k.score >= 30).length} keywords com alto
              potencial de expansao. Priorize itens com score acima de 50.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-4 text-sm text-text-muted">
      <AlertTriangle className="w-4 h-4" />
      <span>{message}</span>
    </div>
  );
}
