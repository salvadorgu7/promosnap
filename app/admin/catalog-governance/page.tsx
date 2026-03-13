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
  TrendingUp,
  BarChart3,
  Package,
  Camera,
  Link,
  Shield,
  FileText,
  Truck,
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
import {
  getCatalogGovernanceScore,
  getGovernanceBreakdown,
} from "@/lib/catalog/governance-score";
import type { GovernanceIssue, GovernanceRecommendation } from "@/lib/catalog/governance-types";
import type { GovernanceBreakdownDetail } from "@/lib/catalog/governance-score";

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
    governanceScore,
    breakdownDetails,
  ] = await Promise.all([
    getCatalogHealthReport(),
    getOrphanListings(),
    getStaleOffers(30),
    getWeakCanonicals(),
    getProductsWithoutImage(),
    getProductsWithoutBrand(),
    getProductsWithoutCategory(),
    generateCatalogRecommendations(),
    getCatalogGovernanceScore(),
    getGovernanceBreakdown(),
  ]);

  const healthPct =
    healthReport.total > 0
      ? ((healthReport.healthy / healthReport.total) * 100).toFixed(1)
      : "0";

  // Generate top 5 actionable items based on weakest dimensions
  const sortedBreakdown = [...breakdownDetails].sort(
    (a, b) => a.score - b.score
  );
  const weakestDimensions = sortedBreakdown.slice(0, 5);
  const actionableItems = weakestDimensions.map((dim) =>
    generateActionForDimension(dim)
  );

  // Score color
  const scoreColor =
    governanceScore.overall >= 80
      ? "text-accent-green"
      : governanceScore.overall >= 60
        ? "text-accent-orange"
        : "text-accent-red";

  const scoreBgColor =
    governanceScore.overall >= 80
      ? "bg-green-50"
      : governanceScore.overall >= 60
        ? "bg-orange-50"
        : "bg-red-50";

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

      {/* Governance Score — prominent at top */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className={`card p-6 ${scoreBgColor} lg:col-span-1`}>
          <p className="text-xs text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Score de Governanca
          </p>
          <p className={`text-6xl font-bold font-display ${scoreColor}`}>
            {governanceScore.overall}
          </p>
          <p className="text-xs text-text-muted mt-1">
            de 100 pontos possiveis
          </p>
          <p className="text-xs text-text-secondary mt-2">
            {governanceScore.overall >= 80
              ? "Catalogo saudavel"
              : governanceScore.overall >= 60
                ? "Melhorias recomendadas"
                : "Acao necessaria"}
          </p>
        </div>

        {/* Quick counts */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <CountCard
            icon={<Package className="h-4 w-4 text-accent-blue" />}
            label="Total Produtos"
            count={governanceScore.totalProducts}
          />
          <CountCard
            icon={<Camera className="h-4 w-4 text-accent-green" />}
            label="Com Imagem"
            count={
              breakdownDetails.find((d) => d.dimension === "imageHealth")
                ?.passing ?? 0
            }
          />
          <CountCard
            icon={<Tag className="h-4 w-4 text-accent-orange" />}
            label="Com Marca"
            count={
              breakdownDetails.find((d) => d.dimension === "brandHealth")
                ?.passing ?? 0
            }
          />
          <CountCard
            icon={<FolderOpen className="h-4 w-4 text-yellow-600" />}
            label="Com Categoria"
            count={
              breakdownDetails.find((d) => d.dimension === "categoryHealth")
                ?.passing ?? 0
            }
          />
          <CountCard
            icon={<Link className="h-4 w-4 text-purple-600" />}
            label="Match Forte"
            count={
              breakdownDetails.find((d) => d.dimension === "matchHealth")
                ?.passing ?? 0
            }
          />
          <CountCard
            icon={<Shield className="h-4 w-4 text-accent-green" />}
            label="Alta Confianca"
            count={
              breakdownDetails.find((d) => d.dimension === "trustHealth")
                ?.passing ?? 0
            }
          />
          <CountCard
            icon={<FileText className="h-4 w-4 text-accent-blue" />}
            label="Com Atributos"
            count={
              breakdownDetails.find((d) => d.dimension === "attributeHealth")
                ?.passing ?? 0
            }
          />
          <CountCard
            icon={<Truck className="h-4 w-4 text-accent-green" />}
            label="Info Entrega"
            count={
              breakdownDetails.find((d) => d.dimension === "deliveryHealth")
                ?.passing ?? 0
            }
          />
        </div>
      </div>

      {/* Breakdown bars for each health dimension */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold font-display text-text-primary mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent-blue" />
          Saude por Dimensao
        </h2>
        {breakdownDetails.length > 0 ? (
          <div className="space-y-3">
            {breakdownDetails.map((dim) => (
              <DimensionBar key={dim.dimension} detail={dim} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted text-center py-4">
            Nenhum dado disponivel.
          </p>
        )}
      </div>

      {/* Recomendacoes — top 5 actionable based on weakest dimensions */}
      {actionableItems.length > 0 && (
        <div className="card p-5">
          <h2 className="text-lg font-semibold font-display text-text-primary mb-1 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent-green" />
            Recomendacoes
          </h2>
          <p className="text-xs text-text-muted mb-4">
            Top 5 acoes para melhorar o score de governanca
          </p>
          <div className="space-y-2">
            {actionableItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-lg bg-surface-50"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${
                      item.urgency === "alta"
                        ? "bg-red-50 text-accent-red"
                        : item.urgency === "media"
                          ? "bg-orange-50 text-accent-orange"
                          : "bg-surface-100 text-text-muted"
                    }`}
                  >
                    {item.urgency}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary">
                      {item.title}
                    </p>
                    <p className="text-xs text-text-muted">
                      {item.description} ({item.score}% atual)
                    </p>
                  </div>
                </div>
                <span className="text-xs text-text-muted flex-shrink-0 ml-2">
                  +{item.potentialGain}pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Health summary cards — existing */}
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

function CountCard({
  icon,
  label,
  count,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <div className="card p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <p className="text-[10px] text-text-muted uppercase tracking-wider">
          {label}
        </p>
      </div>
      <p className="text-xl font-bold font-display text-text-primary">
        {count.toLocaleString("pt-BR")}
      </p>
    </div>
  );
}

function DimensionBar({ detail }: { detail: GovernanceBreakdownDetail }) {
  const barColor =
    detail.score >= 80
      ? "bg-accent-green"
      : detail.score >= 60
        ? "bg-accent-orange"
        : "bg-accent-red";

  const textColor =
    detail.score >= 80
      ? "text-accent-green"
      : detail.score >= 60
        ? "text-accent-orange"
        : "text-accent-red";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">
            {detail.label}
          </span>
          <span className="text-[10px] text-text-muted">
            {detail.passing}/{detail.total}
          </span>
        </div>
        <span className={`text-sm font-bold ${textColor}`}>
          {detail.score}%
        </span>
      </div>
      <div className="w-full h-2.5 bg-surface-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all`}
          style={{ width: `${detail.score}%` }}
        />
      </div>
      <p className="text-[10px] text-text-muted mt-0.5">
        {detail.description}
      </p>
    </div>
  );
}

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

// ─── Helpers ────────────────────────────────────────────────────────────────

interface ActionableItem {
  title: string;
  description: string;
  urgency: "alta" | "media" | "baixa";
  score: number;
  potentialGain: number;
}

function generateActionForDimension(
  dim: GovernanceBreakdownDetail
): ActionableItem {
  const gap = 100 - dim.score;
  const weight: Record<string, number> = {
    imageHealth: 20,
    brandHealth: 15,
    categoryHealth: 15,
    matchHealth: 15,
    trustHealth: 10,
    attributeHealth: 10,
    deliveryHealth: 15,
  };
  const dimWeight = weight[dim.dimension] ?? 10;
  const potentialGain = Math.round((gap * dimWeight) / 100);

  const titles: Record<string, string> = {
    imageHealth: "Adicionar imagens faltantes",
    brandHealth: "Normalizar marcas dos produtos",
    categoryHealth: "Categorizar produtos sem categoria",
    matchHealth: "Fortalecer matches canonicos",
    trustHealth: "Melhorar score de confianca",
    attributeHealth: "Preencher especificacoes",
    deliveryHealth: "Adicionar info de entrega",
  };

  const descriptions: Record<string, string> = {
    imageHealth: `${dim.total - dim.passing} produtos sem imagem principal`,
    brandHealth: `${dim.total - dim.passing} produtos sem marca definida`,
    categoryHealth: `${dim.total - dim.passing} produtos sem categoria`,
    matchHealth: `${dim.total - dim.passing} listings com match fraco`,
    trustHealth: `${dim.total - dim.passing} produtos com confianca baixa`,
    attributeHealth: `${dim.total - dim.passing} produtos sem especificacoes`,
    deliveryHealth: `${dim.total - dim.passing} ofertas sem info de frete`,
  };

  return {
    title: titles[dim.dimension] ?? dim.label,
    description: descriptions[dim.dimension] ?? dim.description,
    urgency: dim.score < 40 ? "alta" : dim.score < 70 ? "media" : "baixa",
    score: dim.score,
    potentialGain,
  };
}
