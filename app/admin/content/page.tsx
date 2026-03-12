import {
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  XCircle,
  TrendingUp,
  Lightbulb,
  BarChart3,
} from "lucide-react";
import { getContentHealthReport } from "@/lib/content/governance";
import { getContentRecommendations } from "@/lib/content/recommendations";
import type { ContentRecommendation } from "@/lib/content/governance-types";

export const dynamic = "force-dynamic";

function GradeColor({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    A: "text-green-700 bg-green-100",
    B: "text-blue-700 bg-blue-100",
    C: "text-yellow-700 bg-yellow-100",
    D: "text-orange-700 bg-orange-100",
    F: "text-red-700 bg-red-100",
  };
  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold ${colors[grade] || "text-gray-700 bg-gray-100"}`}
    >
      {grade}
    </span>
  );
}

function TrafficBadge({ traffic }: { traffic: string }) {
  const colors: Record<string, string> = {
    high: "text-green-700 bg-green-50 border-green-200",
    medium: "text-yellow-700 bg-yellow-50 border-yellow-200",
    low: "text-gray-600 bg-gray-50 border-gray-200",
  };
  return (
    <span
      className={`text-[11px] px-2 py-0.5 rounded-full border ${colors[traffic] || colors.low}`}
    >
      {traffic}
    </span>
  );
}

function TypeIcon({ type }: { type: ContentRecommendation["type"] }) {
  const icons: Record<string, typeof FileText> = {
    guide: FileText,
    comparison: BarChart3,
    price: TrendingUp,
    "hot-topic": Lightbulb,
  };
  const Icon = icons[type] || FileText;
  return <Icon className="h-4 w-4 text-text-muted" />;
}

function HealthBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary">{label}</span>
        <span className="font-medium text-text-primary">
          {count} <span className="text-text-muted text-xs">({Math.round(pct)}%)</span>
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-surface-100 overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.max(pct, 1)}%` }}
        />
      </div>
    </div>
  );
}

export default async function AdminContentPage() {
  let report;
  try {
    report = await getContentHealthReport();
  } catch {
    report = null;
  }

  let recommendations: ContentRecommendation[] = [];
  try {
    recommendations = await getContentRecommendations();
  } catch {
    // graceful
  }

  const total = report?.total ?? 0;
  const avgScore = report?.averageScore ?? 0;

  // Flatten all audits for the scores table
  const allAudits = report
    ? [
        ...report.strong.articles,
        ...report.weak.articles,
        ...report.stale.articles,
        ...report.thin.articles,
      ].sort((a, b) => b.score.total - a.score.total)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
          <FileText className="h-6 w-6 text-brand-500" />
          Governanca de Conteudo
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Saude editorial, scores de qualidade e recomendacoes de conteudo
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <p className="text-xs text-text-muted uppercase tracking-wide">Total Artigos</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{total}</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
            <p className="text-xs text-text-muted uppercase tracking-wide">Fortes</p>
          </div>
          <p className="text-2xl font-bold text-green-700 mt-1">{report?.strong.count ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />
            <p className="text-xs text-text-muted uppercase tracking-wide">Fracos</p>
          </div>
          <p className="text-2xl font-bold text-yellow-700 mt-1">{report?.weak.count ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-orange-600" />
            <p className="text-xs text-text-muted uppercase tracking-wide">Desatualizados</p>
          </div>
          <p className="text-2xl font-bold text-orange-700 mt-1">{report?.stale.count ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-1.5">
            <XCircle className="h-3.5 w-3.5 text-red-600" />
            <p className="text-xs text-text-muted uppercase tracking-wide">Finos</p>
          </div>
          <p className="text-2xl font-bold text-red-700 mt-1">{report?.thin.count ?? 0}</p>
        </div>
      </div>

      {/* Health overview + Average score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-surface-200 p-5">
          <h2 className="text-sm font-semibold text-text-primary mb-4">Saude dos Artigos</h2>
          <div className="space-y-3">
            <HealthBar label="Fortes" count={report?.strong.count ?? 0} total={total} color="bg-green-500" />
            <HealthBar label="Fracos" count={report?.weak.count ?? 0} total={total} color="bg-yellow-500" />
            <HealthBar label="Desatualizados" count={report?.stale.count ?? 0} total={total} color="bg-orange-500" />
            <HealthBar label="Finos" count={report?.thin.count ?? 0} total={total} color="bg-red-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-5 flex flex-col items-center justify-center">
          <p className="text-xs text-text-muted uppercase tracking-wide mb-2">Score Medio</p>
          <div
            className={`text-5xl font-bold ${
              avgScore >= 60 ? "text-green-600" : avgScore >= 40 ? "text-yellow-600" : "text-red-600"
            }`}
          >
            {avgScore}
          </div>
          <p className="text-xs text-text-muted mt-1">de 100 pontos</p>
        </div>
      </div>

      {/* Content scores table */}
      <div className="bg-white rounded-xl border border-surface-200 p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-4">Scores de Conteudo</h2>
        {allAudits.length === 0 ? (
          <p className="text-sm text-text-muted py-4">Nenhum artigo publicado encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 text-text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-2 px-3">Artigo</th>
                  <th className="text-center py-2 px-2">Nota</th>
                  <th className="text-center py-2 px-2">Score</th>
                  <th className="text-center py-2 px-2">Riqueza</th>
                  <th className="text-center py-2 px-2">Links</th>
                  <th className="text-center py-2 px-2">Produtos</th>
                  <th className="text-center py-2 px-2">Cobertura</th>
                  <th className="text-center py-2 px-2">Estado</th>
                  <th className="text-left py-2 px-3">Problemas</th>
                </tr>
              </thead>
              <tbody>
                {allAudits.slice(0, 50).map((audit) => (
                  <tr key={audit.id} className="border-b border-surface-100 hover:bg-surface-50">
                    <td className="py-2 px-3 font-medium text-text-primary max-w-[200px] truncate">
                      {audit.title}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <GradeColor grade={audit.score.grade} />
                    </td>
                    <td className="py-2 px-2 text-center font-mono font-medium">{audit.score.total}</td>
                    <td className="py-2 px-2 text-center text-text-muted">{audit.score.breakdown.richness}/30</td>
                    <td className="py-2 px-2 text-center text-text-muted">{audit.score.breakdown.linking}/25</td>
                    <td className="py-2 px-2 text-center text-text-muted">{audit.score.breakdown.products}/25</td>
                    <td className="py-2 px-2 text-center text-text-muted">{audit.score.breakdown.coverage}/20</td>
                    <td className="py-2 px-2 text-center">
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full ${
                          audit.state === "strong"
                            ? "bg-green-100 text-green-700"
                            : audit.state === "weak"
                              ? "bg-yellow-100 text-yellow-700"
                              : audit.state === "stale"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-red-100 text-red-700"
                        }`}
                      >
                        {audit.state}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs text-text-muted max-w-[250px] truncate">
                      {audit.issues.length > 0 ? audit.issues.join(", ") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-xl border border-surface-200 p-5">
        <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-yellow-500" />
          Recomendacoes de Conteudo
        </h2>
        {recommendations.length === 0 ? (
          <p className="text-sm text-text-muted py-4">Nenhuma recomendacao no momento.</p>
        ) : (
          <div className="space-y-2">
            {recommendations.slice(0, 25).map((rec, i) => (
              <div
                key={i}
                className="flex items-start gap-3 py-2.5 px-3 rounded-lg hover:bg-surface-50 border border-surface-100"
              >
                <TypeIcon type={rec.type} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-text-primary">{rec.topic}</span>
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-100 text-text-muted">
                      {rec.type}
                    </span>
                    <TrafficBadge traffic={rec.estimatedTraffic} />
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">{rec.reason}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-medium text-text-secondary">
                    {rec.priority}
                  </span>
                  <p className="text-[10px] text-text-muted">prioridade</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
