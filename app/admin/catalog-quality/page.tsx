import {
  ShieldCheck,
  AlertTriangle,
  ImageOff,
  Link2,
  Copy,
  Tag,
  Server,
  CheckCircle2,
  ChevronDown,
  BarChart3,
} from "lucide-react";
import prisma from "@/lib/db/prisma";
import {
  getQualityIssues,
  getQualityScore,
  type QualityIssue,
  type QualityReport,
} from "@/lib/catalog/quality-review";

export const dynamic = "force-dynamic";

export default async function CatalogQualityPage() {
  const report = await getQualityIssues();

  const {
    totalProducts,
    averageScore,
    scoreDistribution,
    issues,
  } = report;

  const totalIssues =
    issues.weakMatches.length +
    issues.missingAttributes.length +
    issues.probableDuplicates.length +
    issues.missingImages.length +
    issues.weakAffiliateUrls.length +
    issues.inconsistentSources.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-accent-blue" />
          Qualidade do Catalogo
        </h1>
        <p className="text-sm text-text-muted">
          Revisao de qualidade em escala: duplicatas, atributos, imagens e
          consistencia
        </p>
      </div>

      {/* Score overview */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="card p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">
            Score Medio
          </p>
          <p
            className={`text-3xl font-bold font-display ${
              averageScore >= 70
                ? "text-accent-green"
                : averageScore >= 40
                  ? "text-accent-orange"
                  : "text-accent-red"
            }`}
          >
            {averageScore}
          </p>
          <p className="text-[10px] text-text-muted">/100</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">
            Total Produtos
          </p>
          <p className="text-3xl font-bold font-display text-text-primary">
            {totalProducts}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">
            Excelente (80+)
          </p>
          <p className="text-3xl font-bold font-display text-accent-green">
            {scoreDistribution.excellent}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">
            Bom (60-79)
          </p>
          <p className="text-3xl font-bold font-display text-accent-blue">
            {scoreDistribution.good}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">
            Regular (40-59)
          </p>
          <p className="text-3xl font-bold font-display text-accent-orange">
            {scoreDistribution.fair}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-text-muted uppercase tracking-wider mb-1">
            Ruim (0-39)
          </p>
          <p className="text-3xl font-bold font-display text-accent-red">
            {scoreDistribution.poor}
          </p>
        </div>
      </div>

      {/* Score distribution bar */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold font-display text-text-primary mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent-blue" />
          Distribuicao de Qualidade
        </h2>
        {totalProducts > 0 ? (
          <>
            <div className="w-full h-6 rounded-full overflow-hidden flex">
              <ScoreBar
                value={scoreDistribution.excellent}
                total={
                  scoreDistribution.excellent +
                  scoreDistribution.good +
                  scoreDistribution.fair +
                  scoreDistribution.poor
                }
                color="bg-accent-green"
                title="Excelente"
              />
              <ScoreBar
                value={scoreDistribution.good}
                total={
                  scoreDistribution.excellent +
                  scoreDistribution.good +
                  scoreDistribution.fair +
                  scoreDistribution.poor
                }
                color="bg-accent-blue"
                title="Bom"
              />
              <ScoreBar
                value={scoreDistribution.fair}
                total={
                  scoreDistribution.excellent +
                  scoreDistribution.good +
                  scoreDistribution.fair +
                  scoreDistribution.poor
                }
                color="bg-accent-orange"
                title="Regular"
              />
              <ScoreBar
                value={scoreDistribution.poor}
                total={
                  scoreDistribution.excellent +
                  scoreDistribution.good +
                  scoreDistribution.fair +
                  scoreDistribution.poor
                }
                color="bg-accent-red"
                title="Ruim"
              />
            </div>
            <div className="flex flex-wrap gap-4 mt-3">
              <LegendItem color="bg-accent-green" label="Excelente (80+)" />
              <LegendItem color="bg-accent-blue" label="Bom (60-79)" />
              <LegendItem color="bg-accent-orange" label="Regular (40-59)" />
              <LegendItem color="bg-accent-red" label="Ruim (0-39)" />
            </div>
          </>
        ) : (
          <p className="text-sm text-text-muted text-center py-4">
            Nenhum produto para avaliar.
          </p>
        )}
      </div>

      {/* Summary */}
      <div className="text-xs text-text-muted">
        {totalIssues} problemas de qualidade detectados em {totalProducts}{" "}
        produtos
      </div>

      {/* Issue sections */}
      <div className="grid lg:grid-cols-2 gap-6">
        <IssueSection
          title="Matches Fracos"
          icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
          issues={issues.weakMatches}
          emptyText="Nenhum match fraco encontrado."
          badgeColor="bg-amber-100 text-amber-700"
        />

        <IssueSection
          title="Sem Atributos"
          icon={<Tag className="h-4 w-4 text-accent-orange" />}
          issues={issues.missingAttributes}
          emptyText="Todos os produtos tem atributos completos."
          badgeColor="bg-orange-100 text-orange-700"
        />

        <IssueSection
          title="Duplicatas Provaveis"
          icon={<Copy className="h-4 w-4 text-purple-500" />}
          issues={issues.probableDuplicates}
          emptyText="Nenhuma duplicata provavel encontrada."
          badgeColor="bg-purple-100 text-purple-700"
        />

        <IssueSection
          title="Sem Imagem"
          icon={<ImageOff className="h-4 w-4 text-accent-red" />}
          issues={issues.missingImages}
          emptyText="Todos os produtos tem imagem."
          badgeColor="bg-red-100 text-red-700"
        />

        <IssueSection
          title="URL Fraca"
          icon={<Link2 className="h-4 w-4 text-blue-500" />}
          issues={issues.weakAffiliateUrls}
          emptyText="Todas as URLs de afiliado estao validas."
          badgeColor="bg-blue-100 text-blue-700"
        />

        <IssueSection
          title="Source Inconsistente"
          icon={<Server className="h-4 w-4 text-slate-500" />}
          issues={issues.inconsistentSources}
          emptyText="Todas as fontes estao consistentes."
          badgeColor="bg-slate-100 text-slate-700"
        />
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ScoreBar({
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
  badgeColor,
}: {
  title: string;
  icon: React.ReactNode;
  issues: QualityIssue[];
  emptyText: string;
  badgeColor: string;
}) {
  const highCount = issues.filter((i) => i.severity === "high").length;
  const mediumCount = issues.filter((i) => i.severity === "medium").length;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold font-display text-text-primary flex items-center gap-2">
          {icon}
          {title}
        </h2>
        <span
          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${badgeColor}`}
        >
          {issues.length}
        </span>
      </div>

      {issues.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          {highCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
              {highCount} alta
            </span>
          )}
          {mediumCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
              {mediumCount} media
            </span>
          )}
        </div>
      )}

      {issues.length > 0 ? (
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {issues.map((issue, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 p-2.5 rounded-lg bg-surface-50 text-xs"
            >
              <span
                className={`flex-shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full ${
                  issue.severity === "high" ? "bg-red-500" : "bg-amber-500"
                }`}
              />
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
