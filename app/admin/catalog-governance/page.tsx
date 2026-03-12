import {
  ShieldCheck,
  AlertTriangle,
  ImageOff,
  Tag,
  FolderOpen,
  Clock,
  Link2,
  Lightbulb,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  getCatalogHealthReport,
  getOrphanListings,
  getStaleOffers,
  getWeakCanonicals,
  getProductsWithoutImage,
  getProductsWithoutBrand,
  getProductsWithoutCategory,
} from "@/lib/catalog/governance";
import { generateCatalogRecommendations } from "@/lib/catalog/recommendations";
import type { GovernanceIssue, GovernanceRecommendation } from "@/lib/catalog/governance-types";

export const dynamic = "force-dynamic";

export default async function CatalogGovernancePage() {
  const [
    healthReport,
    orphans,
    stale,
    weakCanonicals,
    noImage,
    noBrand,
    noCategory,
    recommendations,
  ] = await Promise.all([
    getCatalogHealthReport(),
    getOrphanListings(),
    getStaleOffers(30),
    getWeakCanonicals(),
    getProductsWithoutImage(),
    getProductsWithoutBrand(),
    getProductsWithoutCategory(),
    generateCatalogRecommendations(),
  ]);

  const healthPct =
    healthReport.total > 0
      ? ((healthReport.healthy / healthReport.total) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-accent-blue" />
          Governanca do Catalogo
        </h1>
        <p className="text-sm text-text-muted">
          Saude, qualidade e acoes corretivas para o catalogo de produtos
        </p>
      </div>

      {/* Health summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <HealthCard
          label="Saudaveis"
          count={healthReport.healthy}
          color="text-accent-green"
          bgColor="bg-green-50"
        />
        <HealthCard
          label="Incompletos"
          count={healthReport.incomplete}
          color="text-accent-orange"
          bgColor="bg-orange-50"
        />
        <HealthCard
          label="Desatualizados"
          count={healthReport.stale}
          color="text-accent-red"
          bgColor="bg-red-50"
        />
        <HealthCard
          label="Orfaos"
          count={healthReport.orphan}
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
        <HealthCard
          label="Canonico Fraco"
          count={healthReport.weakCanonical}
          color="text-yellow-600"
          bgColor="bg-yellow-50"
        />
        <div className="card p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">
            Saude Geral
          </p>
          <p className="text-3xl font-bold font-display text-accent-blue">
            {healthPct}%
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">
            {healthReport.healthy} de {healthReport.total} itens
          </p>
        </div>
      </div>

      {/* Health distribution bar */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold font-display text-text-primary mb-3">
          Distribuicao de Estados
        </h2>
        {healthReport.total > 0 ? (
          <>
            <div className="w-full h-6 rounded-full overflow-hidden flex">
              <BarSegment
                value={healthReport.healthy}
                total={healthReport.total}
                color="bg-accent-green"
                title="Saudaveis"
              />
              <BarSegment
                value={healthReport.incomplete}
                total={healthReport.total}
                color="bg-accent-orange"
                title="Incompletos"
              />
              <BarSegment
                value={healthReport.stale}
                total={healthReport.total}
                color="bg-accent-red"
                title="Desatualizados"
              />
              <BarSegment
                value={healthReport.orphan}
                total={healthReport.total}
                color="bg-purple-400"
                title="Orfaos"
              />
              <BarSegment
                value={healthReport.weakCanonical}
                total={healthReport.total}
                color="bg-yellow-400"
                title="Canonico Fraco"
              />
            </div>
            <div className="flex flex-wrap gap-4 mt-3">
              <LegendItem color="bg-accent-green" label="Saudaveis" />
              <LegendItem color="bg-accent-orange" label="Incompletos" />
              <LegendItem color="bg-accent-red" label="Desatualizados" />
              <LegendItem color="bg-purple-400" label="Orfaos" />
              <LegendItem color="bg-yellow-400" label="Canonico Fraco" />
            </div>
          </>
        ) : (
          <p className="text-sm text-text-muted text-center py-4">
            Nenhum dado de catalogo disponivel.
          </p>
        )}
      </div>

      {/* Recommendations — actionable */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold font-display text-text-primary mb-1 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-accent-orange" />
          Recomendacoes de Acao
        </h2>
        <p className="text-xs text-text-muted mb-4">
          Acoes priorizadas para melhorar a qualidade do catalogo
        </p>
        {recommendations.length > 0 ? (
          <div className="space-y-2">
            {recommendations.slice(0, 20).map((rec, idx) => (
              <RecommendationRow key={idx} rec={rec} />
            ))}
            {recommendations.length > 20 && (
              <p className="text-xs text-text-muted text-center pt-2">
                +{recommendations.length - 20} recomendacoes adicionais
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-text-muted text-center py-4">
            Catalogo sem problemas detectados.
          </p>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Orphans */}
        <IssueSection
          title="Listings Orfaos"
          icon={<Link2 className="h-4 w-4 text-purple-600" />}
          issues={orphans}
          emptyText="Nenhum listing orfao encontrado."
        />

        {/* No image */}
        <IssueSection
          title="Sem Imagem"
          icon={<ImageOff className="h-4 w-4 text-accent-red" />}
          issues={noImage}
          emptyText="Todos os produtos tem imagem."
        />

        {/* No brand */}
        <IssueSection
          title="Sem Marca"
          icon={<Tag className="h-4 w-4 text-accent-orange" />}
          issues={noBrand}
          emptyText="Todos os produtos tem marca definida."
        />

        {/* No category */}
        <IssueSection
          title="Sem Categoria"
          icon={<FolderOpen className="h-4 w-4 text-yellow-600" />}
          issues={noCategory}
          emptyText="Todos os produtos estao categorizados."
        />

        {/* Stale offers */}
        <IssueSection
          title="Ofertas Desatualizadas"
          icon={<Clock className="h-4 w-4 text-accent-red" />}
          issues={stale}
          emptyText="Nenhuma oferta desatualizada."
        />

        {/* Weak canonicals */}
        <IssueSection
          title="Canonicos Fracos (1 Fonte)"
          icon={<AlertTriangle className="h-4 w-4 text-yellow-600" />}
          issues={weakCanonicals}
          emptyText="Nenhum canonico fraco encontrado."
        />
      </div>
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

function HealthCard({
  label,
  count,
  color,
  bgColor,
}: {
  label: string;
  count: number;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="card p-4">
      <p className="text-xs text-text-muted uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className={`text-3xl font-bold font-display ${color}`}>{count}</p>
    </div>
  );
}

function BarSegment({
  value,
  total,
  color,
  title,
}: {
  value: number;
  total: number;
  color: string;
  title: string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  if (pct === 0) return null;
  return (
    <div
      className={`${color} transition-all`}
      style={{ width: `${pct}%` }}
      title={`${title}: ${value} (${pct.toFixed(1)}%)`}
    />
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
      <div className={`w-3 h-3 rounded-sm ${color}`} />
      {label}
    </div>
  );
}

function IssueSection({
  title,
  icon,
  issues,
  emptyText,
}: {
  title: string;
  icon: React.ReactNode;
  issues: GovernanceIssue[];
  emptyText: string;
}) {
  return (
    <div className="card p-5">
      <h2 className="text-lg font-semibold font-display text-text-primary mb-1 flex items-center gap-2">
        {icon}
        {title}
      </h2>
      <p className="text-xs text-text-muted mb-3">{issues.length} itens</p>
      {issues.length > 0 ? (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {issues.map((issue, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 p-2.5 rounded-lg bg-surface-50 text-xs"
            >
              <XCircle className="h-3.5 w-3.5 text-accent-red flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-text-primary font-medium truncate">
                  {issue.productName}
                </p>
                <p className="text-text-muted truncate">{issue.details}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 py-4 justify-center text-sm text-text-muted">
          <CheckCircle2 className="h-4 w-4 text-accent-green" />
          {emptyText}
        </div>
      )}
    </div>
  );
}

function RecommendationRow({ rec }: { rec: GovernanceRecommendation }) {
  const priorityStyles = {
    high: "bg-red-50 text-accent-red",
    medium: "bg-orange-50 text-accent-orange",
    low: "bg-surface-100 text-text-muted",
  };

  const priorityLabels = {
    high: "Alta",
    medium: "Media",
    low: "Baixa",
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-surface-50">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <span
          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${
            priorityStyles[rec.priority]
          }`}
        >
          {priorityLabels[rec.priority]}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {rec.productName}
          </p>
          <p className="text-xs text-text-muted">
            <span className="font-medium">{rec.issue}</span>
            {" — "}
            {rec.action}
          </p>
        </div>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-text-muted flex-shrink-0 ml-2" />
    </div>
  );
}
