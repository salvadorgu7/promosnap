import {
  Brain,
  AlertTriangle,
  Upload,
  ArrowRight,
  Package,
  Store,
  Layers,
  TrendingUp,
  FileText,
  Globe,
  Radio,
  Star,
  Target,
  Lightbulb,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { getCatalogGaps } from "@/lib/sourcing/catalog-gaps";
import { getRecommendedImports } from "@/lib/sourcing/import-recommendations";
import { getNewCanonicalSuggestions } from "@/lib/sourcing/sourcing-seo-bridge";

export const dynamic = "force-dynamic";

const PRIORITY_STYLES: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-surface-100 text-text-muted",
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: "Critica",
  high: "Alta",
  medium: "Media",
  low: "Baixa",
};

const IMPACT_STYLES: Record<string, string> = {
  high: "bg-accent-green/10 text-accent-green",
  medium: "bg-accent-blue/10 text-accent-blue",
  low: "bg-surface-100 text-text-muted",
};

const IMPACT_LABELS: Record<string, string> = {
  high: "Alto impacto",
  medium: "Medio impacto",
  low: "Baixo impacto",
};

const ACTION_ICONS: Record<string, typeof Brain> = {
  "feature-homepage": Star,
  "distribute-channels": Radio,
  "associate-article": FileText,
  "create-category-page": Globe,
};

const ACTION_LABELS: Record<string, string> = {
  "feature-homepage": "Destacar",
  "distribute-channels": "Distribuir",
  "associate-article": "Artigo",
  "create-category-page": "SEO",
};

export default async function CatalogIntelligencePage() {
  const [gaps, recommendations, suggestions] = await Promise.all([
    getCatalogGaps().catch(() => ({
      lowCoverageCategories: [],
      sparseBrands: [],
      singleSourceProducts: [],
      needsComparisonProducts: [],
      totalGaps: 0,
    })),
    getRecommendedImports().catch(() => []),
    getNewCanonicalSuggestions().catch(() => []),
  ]);

  const totalAll = gaps.totalGaps + recommendations.length + suggestions.length;

  // Summary cards
  const summaryCards = [
    {
      label: "Gaps de Catalogo",
      count: gaps.totalGaps,
      icon: AlertTriangle,
      color: "text-accent-orange",
      borderColor: "border-l-accent-orange",
    },
    {
      label: "Imports Sugeridos",
      count: recommendations.length,
      icon: Upload,
      color: "text-accent-blue",
      borderColor: "border-l-accent-blue",
    },
    {
      label: "Canonicos p/ Destacar",
      count: suggestions.length,
      icon: Star,
      color: "text-accent-green",
      borderColor: "border-l-accent-green",
    },
    {
      label: "Fonte Unica",
      count: gaps.singleSourceProducts.length,
      icon: Store,
      color: "text-accent-purple",
      borderColor: "border-l-accent-purple",
    },
    {
      label: "Sem Comparacao",
      count: gaps.needsComparisonProducts.length,
      icon: Layers,
      color: "text-brand-500",
      borderColor: "border-l-brand-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
            <Brain className="h-6 w-6 text-accent-blue" />
            Catalog Intelligence
          </h1>
          <p className="text-sm text-text-muted">
            Inteligencia de sourcing, gaps de catalogo e recomendacoes de importacao
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-blue/10 text-accent-blue text-xs font-medium">
            <Target className="h-3 w-3" />
            {totalAll} acoes
          </div>
          <Link
            href="/admin/growth-ops"
            className="text-xs text-brand-500 hover:underline flex items-center gap-1"
          >
            Growth & Ops <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className={`card p-4 border-l-4 ${card.borderColor}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`h-4 w-4 ${card.color}`} />
              <span className="text-xs text-text-muted uppercase tracking-wider">
                {card.label}
              </span>
            </div>
            <p className="text-2xl font-bold font-display text-text-primary">
              {card.count}
            </p>
          </div>
        ))}
      </div>

      {/* ── Section: Gaps de Catalogo ── */}

      {/* Low Coverage Categories */}
      {gaps.lowCoverageCategories.length > 0 && (
        <Section
          title="Categorias com Baixa Cobertura"
          subtitle="Categorias com demanda de busca mas poucos produtos"
          icon={Package}
          iconColor="text-accent-orange"
          count={gaps.lowCoverageCategories.length}
          actionLabel="Editar Catalogo"
          actionHref="/admin/catalog-edit"
        >
          <div className="space-y-2">
            {gaps.lowCoverageCategories.slice(0, 8).map((gap, i) => (
              <GapRow key={i} gap={gap} />
            ))}
          </div>
        </Section>
      )}

      {/* Single Source Products */}
      {gaps.singleSourceProducts.length > 0 && (
        <Section
          title="Produtos com Fonte Unica"
          subtitle="Produtos disponiveis em apenas uma loja — risco de cobertura"
          icon={Store}
          iconColor="text-accent-purple"
          count={gaps.singleSourceProducts.length}
          actionLabel="Importar Fontes"
          actionHref="/admin/imports"
        >
          <div className="space-y-2">
            {gaps.singleSourceProducts.slice(0, 8).map((gap, i) => (
              <GapRow key={i} gap={gap} />
            ))}
          </div>
        </Section>
      )}

      {/* Needs Comparison */}
      {gaps.needsComparisonProducts.length > 0 && (
        <Section
          title="Produtos sem Comparacao Real"
          subtitle="Produtos com demanda que precisam de mais listings para comparacao"
          icon={Layers}
          iconColor="text-brand-500"
          count={gaps.needsComparisonProducts.length}
          actionLabel="Importar Listings"
          actionHref="/admin/imports"
        >
          <div className="space-y-2">
            {gaps.needsComparisonProducts.slice(0, 8).map((gap, i) => (
              <GapRow key={i} gap={gap} />
            ))}
          </div>
        </Section>
      )}

      {/* Sparse Brands */}
      {gaps.sparseBrands.length > 0 && (
        <Section
          title="Marcas com Poucos Produtos"
          subtitle="Marcas conhecidas com poucas entradas no catalogo"
          icon={TrendingUp}
          iconColor="text-accent-blue"
          count={gaps.sparseBrands.length}
          actionLabel="Expandir Marcas"
          actionHref="/admin/imports"
        >
          <div className="space-y-2">
            {gaps.sparseBrands.slice(0, 6).map((gap, i) => (
              <GapRow key={i} gap={gap} />
            ))}
          </div>
        </Section>
      )}

      {/* ── Section: Proximos Imports Sugeridos ── */}

      {recommendations.length > 0 && (
        <Section
          title="Proximos Imports Sugeridos"
          subtitle="Recomendacoes baseadas em trending, buscas, gaps e artigos"
          icon={Upload}
          iconColor="text-accent-blue"
          count={recommendations.length}
          actionLabel="Importar Agora"
          actionHref="/admin/imports"
        >
          <div className="space-y-2">
            {recommendations.slice(0, 12).map((rec, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-3 py-2 bg-surface-50 rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Lightbulb className="h-3.5 w-3.5 text-accent-blue flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-text-primary font-medium">
                      {rec.title}
                    </p>
                    <p className="text-[10px] text-text-muted truncate">
                      {rec.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                      IMPACT_STYLES[rec.estimatedImpact] || IMPACT_STYLES.low
                    }`}
                  >
                    {IMPACT_LABELS[rec.estimatedImpact] || ""}
                  </span>
                  <span className="text-[10px] text-text-muted font-mono">
                    P{rec.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Section: Novos Canonicos para Destacar ── */}

      {suggestions.length > 0 && (
        <Section
          title="Novos Canonicos para Destacar"
          subtitle="Produtos canonicos prontos para destaque, distribuicao ou conteudo"
          icon={Star}
          iconColor="text-accent-green"
          count={suggestions.length}
          actionLabel="Distribuicao"
          actionHref="/admin/distribution"
        >
          <div className="space-y-2">
            {suggestions.slice(0, 12).map((sug, i) => {
              const ActionIcon = ACTION_ICONS[sug.action] || Brain;
              return (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2 bg-surface-50 rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ActionIcon className="h-3.5 w-3.5 text-accent-green flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-text-primary font-medium">
                        {sug.productName}
                      </p>
                      <p className="text-[10px] text-text-muted truncate">
                        {sug.reason}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-accent-green/10 text-accent-green">
                      {ACTION_LABELS[sug.action] || sug.action}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        PRIORITY_STYLES[sug.priority] || PRIORITY_STYLES.low
                      }`}
                    >
                      {PRIORITY_LABELS[sug.priority] || ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Empty state */}
      {totalAll === 0 && (
        <div className="card p-12 text-center">
          <Zap className="h-10 w-10 mx-auto mb-3 text-surface-300" />
          <p className="text-text-muted text-sm">
            Nenhuma acao de inteligencia identificada no momento.
          </p>
          <p className="text-text-muted text-xs mt-1">
            Importe dados e monitore tendencias para gerar insights automaticamente.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Reusable section component ──────────────────────────────────────────────

function Section({
  title,
  subtitle,
  icon: Icon,
  iconColor,
  count,
  actionLabel,
  actionHref,
  children,
}: {
  title: string;
  subtitle: string;
  icon: typeof Package;
  iconColor: string;
  count: number;
  actionLabel: string;
  actionHref: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${iconColor}`} />
          <div>
            <h2 className="text-sm font-semibold text-text-primary">
              {title}{" "}
              <span className="text-text-muted font-normal">({count})</span>
            </h2>
            <p className="text-[10px] text-text-muted">{subtitle}</p>
          </div>
        </div>
        <Link
          href={actionHref}
          className="text-xs text-brand-500 hover:underline flex items-center gap-1"
        >
          {actionLabel} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {children}
    </div>
  );
}

// ── Gap row ─────────────────────────────────────────────────────────────────

function GapRow({
  gap,
}: {
  gap: {
    title: string;
    description: string;
    priority: string;
    metric: number;
    metricLabel: string;
    actionSuggestion: string;
  };
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-surface-50 rounded-lg">
      <div className="flex items-center gap-3 min-w-0">
        <AlertTriangle className="h-3.5 w-3.5 text-accent-orange flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm text-text-primary font-medium">{gap.title}</p>
          <p className="text-[10px] text-text-muted truncate">
            {gap.actionSuggestion}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] text-text-muted">
          {gap.metric} {gap.metricLabel}
        </span>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-medium ${
            PRIORITY_STYLES[gap.priority] || PRIORITY_STYLES.low
          }`}
        >
          {PRIORITY_LABELS[gap.priority] || "Baixa"}
        </span>
      </div>
    </div>
  );
}
