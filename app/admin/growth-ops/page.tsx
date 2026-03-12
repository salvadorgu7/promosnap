import {
  Rocket,
  TrendingUp,
  Package,
  FileText,
  Radio,
  ArrowRight,
  AlertTriangle,
  Upload,
  Globe,
  Pencil,
  Send,
  Zap,
  Target,
} from "lucide-react";
import Link from "next/link";
import { getCatalogOpportunities } from "@/lib/catalog/opportunities";
import { getTrendCatalogGaps } from "@/lib/catalog/trend-links";
import { getReadyOffers } from "@/lib/distribution/engine";

export const dynamic = "force-dynamic";

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-surface-100 text-text-muted",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baixa",
};

export default async function GrowthOpsPage() {
  const [catalogOps, trendGaps, readyOffers] = await Promise.all([
    getCatalogOpportunities().catch(() => ({
      emptyCategories: [],
      sparseBrands: [],
      unmatchedSearches: [],
      trendingWithoutProducts: [],
      totalOpportunities: 0,
    })),
    getTrendCatalogGaps().catch(() => ({
      importOpportunities: [],
      pageOpportunities: [],
      contentOpportunities: [],
      distributionOpportunities: [],
      totalGaps: 0,
    })),
    getReadyOffers(5).catch(() => []),
  ]);

  const totalAll = catalogOps.totalOpportunities + trendGaps.totalGaps;

  // Summary cards
  const summaryCards = [
    {
      label: "Catalogo",
      count: catalogOps.totalOpportunities,
      icon: Package,
      color: "text-accent-blue",
      borderColor: "border-l-accent-blue",
      description: "Categorias, marcas e buscas sem cobertura",
      href: "/admin/catalog-opportunities",
    },
    {
      label: "Importacao",
      count: trendGaps.importOpportunities.length,
      icon: Upload,
      color: "text-accent-orange",
      borderColor: "border-l-accent-orange",
      description: "Keywords em alta sem produtos no catalogo",
      href: "/admin/imports",
    },
    {
      label: "SEO",
      count: trendGaps.pageOpportunities.length,
      icon: Globe,
      color: "text-accent-green",
      borderColor: "border-l-accent-green",
      description: "Keywords com produtos mas sem pagina SEO",
      href: "/admin/seo",
    },
    {
      label: "Conteudo",
      count: trendGaps.contentOpportunities.length,
      icon: FileText,
      color: "text-accent-purple",
      borderColor: "border-l-accent-purple",
      description: "Keywords com produtos mas sem guia/artigo",
      href: "/admin/artigos",
    },
    {
      label: "Distribuicao",
      count: trendGaps.distributionOpportunities.length + readyOffers.length,
      icon: Radio,
      color: "text-brand-500",
      borderColor: "border-l-brand-500",
      description: "Ofertas prontas para canais de distribuicao",
      href: "/admin/distribution",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
            <Rocket className="h-6 w-6 text-brand-500" />
            Growth & Ops
          </h1>
          <p className="text-sm text-text-muted">
            Oportunidades priorizadas de catalogo, conteudo, SEO e distribuicao
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-blue/10 text-accent-blue text-xs font-medium">
          <Target className="h-3 w-3" />
          {totalAll} oportunidades
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {summaryCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`card p-4 border-l-4 ${card.borderColor} hover:bg-surface-50 transition-colors`}
          >
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`h-4 w-4 ${card.color}`} />
              <span className="text-xs text-text-muted uppercase tracking-wider">{card.label}</span>
            </div>
            <p className="text-2xl font-bold font-display text-text-primary">{card.count}</p>
            <p className="text-[10px] text-text-muted mt-1">{card.description}</p>
          </Link>
        ))}
      </div>

      {/* ── Trend-Catalog Gaps ── */}

      {/* Import Opportunities */}
      {trendGaps.importOpportunities.length > 0 && (
        <Section
          title="Oportunidades de Importacao"
          subtitle="Keywords em alta sem produtos — importar para capturar demanda"
          icon={Upload}
          iconColor="text-accent-orange"
          count={trendGaps.importOpportunities.length}
          actionLabel="Importar Catalogo"
          actionHref="/admin/imports"
        >
          <div className="space-y-2">
            {trendGaps.importOpportunities.slice(0, 8).map((gap, i) => (
              <GapRow key={i} gap={gap} />
            ))}
          </div>
        </Section>
      )}

      {/* Page (SEO) Opportunities */}
      {trendGaps.pageOpportunities.length > 0 && (
        <Section
          title="Oportunidades de Pagina SEO"
          subtitle="Produtos existem mas sem pagina otimizada para buscadores"
          icon={Globe}
          iconColor="text-accent-green"
          count={trendGaps.pageOpportunities.length}
          actionLabel="Gerenciar SEO"
          actionHref="/admin/seo"
        >
          <div className="space-y-2">
            {trendGaps.pageOpportunities.slice(0, 8).map((gap, i) => (
              <GapRow key={i} gap={gap} />
            ))}
          </div>
        </Section>
      )}

      {/* Content Opportunities */}
      {trendGaps.contentOpportunities.length > 0 && (
        <Section
          title="Oportunidades de Conteudo"
          subtitle="Keywords com produtos mas sem artigo ou guia editorial"
          icon={FileText}
          iconColor="text-accent-purple"
          count={trendGaps.contentOpportunities.length}
          actionLabel="Criar Conteudo"
          actionHref="/admin/artigos"
        >
          <div className="space-y-2">
            {trendGaps.contentOpportunities.slice(0, 8).map((gap, i) => (
              <GapRow key={i} gap={gap} />
            ))}
          </div>
        </Section>
      )}

      {/* Distribution Opportunities */}
      {(trendGaps.distributionOpportunities.length > 0 || readyOffers.length > 0) && (
        <Section
          title="Oportunidades de Distribuicao"
          subtitle="Ofertas prontas para publicar em Telegram, WhatsApp, e-mail"
          icon={Radio}
          iconColor="text-brand-500"
          count={trendGaps.distributionOpportunities.length + readyOffers.length}
          actionLabel="Distribuir Ofertas"
          actionHref="/admin/distribution"
        >
          <div className="space-y-2">
            {trendGaps.distributionOpportunities.slice(0, 5).map((gap, i) => (
              <GapRow key={`gap-${i}`} gap={gap} />
            ))}
            {readyOffers.slice(0, 5).map((offer) => (
              <div
                key={offer.offerId}
                className="flex items-center justify-between px-3 py-2 bg-surface-50 rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Send className="h-3.5 w-3.5 text-brand-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-text-primary truncate">{offer.productName}</p>
                    <div className="flex items-center gap-2 text-[10px] text-text-muted">
                      <span>R$ {offer.currentPrice.toFixed(2).replace(".", ",")}</span>
                      {offer.discount > 0 && (
                        <span className="text-green-600 font-medium">-{offer.discount}%</span>
                      )}
                      <span>{offer.sourceName}</span>
                      <span>Score: {offer.offerScore}</span>
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-brand-100 text-brand-700">
                  Pronta
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Catalog Opportunities ── */}

      {/* Empty Categories */}
      {catalogOps.emptyCategories.length > 0 && (
        <Section
          title="Categorias com Lacunas"
          subtitle="Categorias com poucos ou nenhum produto"
          icon={Package}
          iconColor="text-accent-blue"
          count={catalogOps.emptyCategories.length}
          actionLabel="Editar Catalogo"
          actionHref="/admin/catalog-edit"
        >
          <div className="space-y-2">
            {catalogOps.emptyCategories.slice(0, 6).map((op, i) => (
              <CatalogOpRow key={i} op={op} />
            ))}
          </div>
        </Section>
      )}

      {/* Unmatched Searches */}
      {catalogOps.unmatchedSearches.length > 0 && (
        <Section
          title="Buscas sem Resultados"
          subtitle="Termos buscados por usuarios sem produtos correspondentes"
          icon={TrendingUp}
          iconColor="text-accent-orange"
          count={catalogOps.unmatchedSearches.length}
          actionLabel="Ver Oportunidades"
          actionHref="/admin/catalog-opportunities"
        >
          <div className="space-y-2">
            {catalogOps.unmatchedSearches.slice(0, 6).map((op, i) => (
              <CatalogOpRow key={i} op={op} />
            ))}
          </div>
        </Section>
      )}

      {/* Empty state */}
      {totalAll === 0 && (
        <div className="card p-12 text-center">
          <Zap className="h-10 w-10 mx-auto mb-3 text-surface-300" />
          <p className="text-text-muted text-sm">
            Nenhuma oportunidade identificada no momento.
          </p>
          <p className="text-text-muted text-xs mt-1">
            Importe tendencias e produtos para gerar oportunidades automaticamente.
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

function GapRow({ gap }: { gap: { keyword: string; priority: string; suggestion: string; matchingProducts: number } }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-surface-50 rounded-lg">
      <div className="flex items-center gap-3 min-w-0">
        <TrendingUp className="h-3.5 w-3.5 text-accent-orange flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm text-text-primary font-medium">{gap.keyword}</p>
          <p className="text-[10px] text-text-muted truncate">{gap.suggestion}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] text-text-muted">{gap.matchingProducts} produtos</span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${PRIORITY_STYLES[gap.priority] || PRIORITY_STYLES.low}`}>
          {PRIORITY_LABELS[gap.priority] || "Baixa"}
        </span>
      </div>
    </div>
  );
}

// ── Catalog opportunity row ─────────────────────────────────────────────────

function CatalogOpRow({ op }: { op: { title: string; description: string; priority: string; metric: number; metricLabel: string } }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-surface-50 rounded-lg">
      <div className="flex items-center gap-3 min-w-0">
        <AlertTriangle className="h-3.5 w-3.5 text-accent-blue flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm text-text-primary font-medium">{op.title}</p>
          <p className="text-[10px] text-text-muted truncate">{op.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] text-text-muted">
          {op.metric} {op.metricLabel}
        </span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${PRIORITY_STYLES[op.priority] || PRIORITY_STYLES.low}`}>
          {PRIORITY_LABELS[op.priority] || "Baixa"}
        </span>
      </div>
    </div>
  );
}
