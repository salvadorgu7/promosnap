import {
  SearchX,
  BookOpen,
  Layers,
  GitCompare,
  TrendingUp,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { getContentGaps, type ContentGap } from "@/lib/seo/content-recommendations";

export const dynamic = "force-dynamic";

const typeConfig: Record<
  ContentGap["type"],
  { label: string; icon: typeof BookOpen; color: string; bg: string; action: string }
> = {
  guide: {
    label: "Guia / Artigo",
    icon: BookOpen,
    color: "text-accent-blue",
    bg: "bg-blue-50",
    action: "Criar guia",
  },
  comparison: {
    label: "Comparação",
    icon: GitCompare,
    color: "text-accent-purple",
    bg: "bg-purple-50",
    action: "Criar comparativo",
  },
  price: {
    label: "Página de Preço",
    icon: TrendingUp,
    color: "text-accent-green",
    bg: "bg-green-50",
    action: "Criar página de ofertas",
  },
  collection: {
    label: "Landing Page",
    icon: Layers,
    color: "text-accent-orange",
    bg: "bg-orange-50",
    action: "Criar landing page",
  },
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-green-100 text-green-700"
      : score >= 40
        ? "bg-orange-100 text-orange-700"
        : "bg-surface-100 text-text-muted";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
      {score}
    </span>
  );
}

export default async function AdminSEOGapsPage() {
  const gaps = await getContentGaps();

  const guides = gaps.filter((g) => g.type === "guide");
  const collections = gaps.filter((g) => g.type === "collection");
  const comparisons = gaps.filter((g) => g.type === "comparison");
  const keywords = gaps.filter((g) => g.type === "price");

  const sections = [
    { title: "Marcas sem Guia", items: guides, type: "guide" as const },
    { title: "Categorias sem Landing", items: collections, type: "collection" as const },
    { title: "Comparações Promissoras", items: comparisons, type: "comparison" as const },
    { title: "Keywords Descobertas", items: keywords, type: "price" as const },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
          <SearchX className="h-6 w-6 text-accent-blue" />
          Gaps de Conteúdo SEO
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Oportunidades de conteúdo identificadas automaticamente com base no catálogo, buscas e clickouts
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {sections.map((section) => {
          const cfg = typeConfig[section.type];
          const Icon = cfg.icon;
          return (
            <div key={section.type} className="rounded-xl border border-surface-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${cfg.bg}`}>
                  <Icon className={`h-4 w-4 ${cfg.color}`} />
                </div>
                <span className="text-xs text-text-muted">{section.title}</span>
              </div>
              <p className="text-2xl font-bold font-display text-text-primary">
                {section.items.length}
              </p>
            </div>
          );
        })}
      </div>

      {gaps.length === 0 && (
        <div className="rounded-xl border border-surface-200 bg-white p-12 text-center">
          <AlertTriangle className="h-8 w-8 text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-muted">
            Nenhum gap de conteúdo identificado. O catálogo pode estar vazio ou todas as oportunidades ja foram cobertas.
          </p>
        </div>
      )}

      {/* Sections */}
      {sections.map((section) => {
        if (section.items.length === 0) return null;
        const cfg = typeConfig[section.type];
        const SectionIcon = cfg.icon;

        return (
          <div key={section.type} className="rounded-xl border border-surface-200 bg-white">
            <div className="px-5 py-4 border-b border-surface-100 flex items-center gap-2">
              <SectionIcon className={`h-4 w-4 ${cfg.color}`} />
              <h2 className="text-sm font-semibold text-text-primary">{section.title}</h2>
              <span className="text-xs text-text-muted ml-auto">{section.items.length} itens</span>
            </div>
            <div className="divide-y divide-surface-100">
              {section.items.slice(0, 15).map((gap) => (
                <div
                  key={gap.slug}
                  className="px-5 py-3 flex items-center gap-4 hover:bg-surface-50 transition-colors"
                >
                  <ScoreBadge score={gap.score} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {gap.title}
                    </p>
                    <p className="text-xs text-text-muted truncate">{gap.reason}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg} ${cfg.color}`}
                    >
                      {cfg.label}
                    </span>
                    <span className="text-xs text-text-muted flex items-center gap-1">
                      {cfg.action}
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
