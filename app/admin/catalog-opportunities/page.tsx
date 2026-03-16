import {
  Lightbulb,
  FolderOpen,
  Tag,
  Search,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  ArrowUpCircle,
  MinusCircle,
  ArrowDownCircle,
} from "lucide-react";
import { getCatalogOpportunities } from "@/lib/catalog/opportunities";
import type { CatalogOpportunity, OpportunityPriority } from "@/lib/catalog/opportunities";

export const dynamic = "force-dynamic";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<OpportunityPriority, { label: string; color: string; icon: typeof ArrowUpCircle }> = {
  high: { label: "Alta", color: "bg-red-100 text-red-700 border-red-200", icon: ArrowUpCircle },
  medium: { label: "Média", color: "bg-amber-100 text-amber-700 border-amber-200", icon: MinusCircle },
  low: { label: "Baixa", color: "bg-gray-100 text-gray-600 border-gray-200", icon: ArrowDownCircle },
};

const TYPE_CONFIG: Record<string, { label: string; icon: typeof FolderOpen; color: string }> = {
  "empty-category": { label: "Categorias com poucos produtos", icon: FolderOpen, color: "text-blue-600 bg-blue-50" },
  "sparse-brand": { label: "Marcas com poucos produtos", icon: Tag, color: "text-purple-600 bg-purple-50" },
  "unmatched-search": { label: "Buscas sem resultados", icon: Search, color: "text-amber-600 bg-amber-50" },
  "trending-without-products": { label: "Tendências sem cobertura", icon: TrendingUp, color: "text-green-600 bg-green-50" },
};

function PriorityBadge({ priority }: { priority: OpportunityPriority }) {
  const config = PRIORITY_CONFIG[priority];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function OpportunityCard({ opportunity }: { opportunity: CatalogOpportunity }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium text-text-primary">{opportunity.title}</p>
          <PriorityBadge priority={opportunity.priority} />
        </div>
        <p className="text-xs text-text-muted">{opportunity.description}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-lg font-bold font-display text-text-primary">{opportunity.metric}</p>
        <p className="text-[10px] text-text-muted">{opportunity.metricLabel}</p>
      </div>
    </div>
  );
}

function OpportunitySection({
  type,
  opportunities,
}: {
  type: string;
  opportunities: CatalogOpportunity[];
}) {
  const config = TYPE_CONFIG[type];
  if (!config || opportunities.length === 0) return null;
  const Icon = config.icon;

  const highCount = opportunities.filter((o) => o.priority === "high").length;

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-surface-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${config.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold font-display text-text-primary">{config.label}</h3>
            <p className="text-xs text-text-muted">{opportunities.length} oportunidades encontradas</p>
          </div>
        </div>
        {highCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 border border-red-200">
            <AlertCircle className="h-3 w-3" />
            {highCount} alta prioridade
          </span>
        )}
      </div>
      <div className="divide-y divide-surface-100">
        {opportunities.slice(0, 10).map((opp, i) => (
          <OpportunityCard key={i} opportunity={opp} />
        ))}
        {opportunities.length > 10 && (
          <div className="p-3 text-center">
            <span className="text-xs text-text-muted">
              +{opportunities.length - 10} oportunidades adicionais
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function CatalogOpportunitiesPage() {
  const data = await getCatalogOpportunities();

  const allOpportunities = [
    ...data.emptyCategories,
    ...data.sparseBrands,
    ...data.unmatchedSearches,
    ...data.trendingWithoutProducts,
  ];

  const highPriority = allOpportunities.filter((o) => o.priority === "high");
  const mediumPriority = allOpportunities.filter((o) => o.priority === "medium");
  const lowPriority = allOpportunities.filter((o) => o.priority === "low");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary">Oportunidades de Catálogo</h1>
        <p className="text-sm text-text-muted">
          Lacunas e oportunidades para expandir o catálogo com base em dados reais
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-3xl font-bold font-display text-text-primary">{data.totalOpportunities}</p>
          <p className="text-xs text-text-muted">Total de oportunidades</p>
        </div>
        <div className="card p-4 border-red-200">
          <p className="text-3xl font-bold font-display text-red-600">{highPriority.length}</p>
          <p className="text-xs text-text-muted">Alta prioridade</p>
        </div>
        <div className="card p-4 border-amber-200">
          <p className="text-3xl font-bold font-display text-amber-600">{mediumPriority.length}</p>
          <p className="text-xs text-text-muted">Média prioridade</p>
        </div>
        <div className="card p-4">
          <p className="text-3xl font-bold font-display text-gray-500">{lowPriority.length}</p>
          <p className="text-xs text-text-muted">Baixa prioridade</p>
        </div>
      </div>

      {/* No opportunities */}
      {data.totalOpportunities === 0 && (
        <div className="card p-8 text-center">
          <Lightbulb className="h-10 w-10 mx-auto mb-3 text-surface-300" />
          <p className="text-text-muted">
            Nenhuma oportunidade identificada no momento. O catálogo esta bem coberto.
          </p>
        </div>
      )}

      {/* Opportunity sections */}
      <div className="space-y-6">
        <OpportunitySection type="unmatched-search" opportunities={data.unmatchedSearches} />
        <OpportunitySection type="trending-without-products" opportunities={data.trendingWithoutProducts} />
        <OpportunitySection type="empty-category" opportunities={data.emptyCategories} />
        <OpportunitySection type="sparse-brand" opportunities={data.sparseBrands} />
      </div>
    </div>
  );
}
