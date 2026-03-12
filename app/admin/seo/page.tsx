import {
  Globe,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Link2,
  Layers,
  TrendingUp,
  ArrowRight,
  BarChart3,
  Zap,
  Target,
  PenLine,
  Plus,
  Info,
} from "lucide-react";
import { auditSEOHealth, getSEOActions } from "@/lib/seo/governance";
import { getCoverageReport } from "@/lib/seo/coverage";
import type { SEOIssueSeverity } from "@/lib/seo/governance-types";

export const dynamic = "force-dynamic";

// ── Score ring component ─────────────────────────────

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const bgColor =
    score >= 85
      ? "bg-green-50"
      : score >= 65
        ? "bg-blue-50"
        : score >= 40
          ? "bg-orange-50"
          : "bg-red-50";

  return (
    <div className={`card p-6 flex flex-col items-center ${bgColor}`}>
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={color}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold font-display ${color}`}>{score}</span>
          <span className="text-[10px] text-text-muted uppercase tracking-wider">de 100</span>
        </div>
      </div>
      <p className={`text-sm font-semibold mt-2 ${color}`}>{label}</p>
    </div>
  );
}

// ── Sub-score bar ────────────────────────────────────

function SubScoreBar({ label, score, icon: Icon }: { label: string; score: number; icon: typeof FileText }) {
  const barColor =
    score >= 85
      ? "bg-accent-green"
      : score >= 65
        ? "bg-accent-blue"
        : score >= 40
          ? "bg-accent-orange"
          : "bg-red-500";
  const textColor =
    score >= 85
      ? "text-accent-green"
      : score >= 65
        ? "text-accent-blue"
        : score >= 40
          ? "text-accent-orange"
          : "text-red-500";

  return (
    <div className="flex items-center gap-3">
      <Icon className={`h-4 w-4 flex-shrink-0 ${textColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-text-secondary">{label}</span>
          <span className={`text-xs font-bold ${textColor}`}>{score}</span>
        </div>
        <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${score}%` }} />
        </div>
      </div>
    </div>
  );
}

// ── Severity badge ───────────────────────────────────

const severityConfig: Record<
  SEOIssueSeverity,
  { icon: typeof CheckCircle; color: string; bg: string; label: string }
> = {
  critical: { icon: XCircle, color: "text-red-500", bg: "bg-red-50", label: "Critico" },
  warning: { icon: AlertTriangle, color: "text-accent-orange", bg: "bg-orange-50", label: "Atencao" },
  info: { icon: Info, color: "text-accent-blue", bg: "bg-blue-50", label: "Info" },
};

// ── Action type config ───────────────────────────────

const actionTypeConfig: Record<
  string,
  { icon: typeof Plus; color: string; bg: string; label: string }
> = {
  create_page: { icon: Plus, color: "text-accent-green", bg: "bg-green-50", label: "Criar Pagina" },
  fix_metadata: { icon: PenLine, color: "text-accent-orange", bg: "bg-orange-50", label: "Corrigir Metadata" },
  add_internal_links: { icon: Link2, color: "text-accent-blue", bg: "bg-blue-50", label: "Adicionar Links" },
  improve_content: { icon: FileText, color: "text-accent-purple", bg: "bg-purple-50", label: "Melhorar Conteudo" },
};

const impactConfig: Record<string, { color: string; bg: string }> = {
  high: { color: "text-red-600", bg: "bg-red-50" },
  medium: { color: "text-accent-orange", bg: "bg-orange-50" },
  low: { color: "text-text-muted", bg: "bg-surface-100" },
};

// ── Page ─────────────────────────────────────────────

export default async function AdminSEOGovernancePage() {
  const [audit, coverage, actions] = await Promise.all([
    auditSEOHealth(),
    getCoverageReport(),
    getSEOActions(),
  ]);

  const topActions = actions.slice(0, 20);
  const topIssues = audit.issues.slice(0, 20);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
          <Globe className="h-6 w-6 text-accent-blue" />
          SEO Governance
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Auditoria completa de saude SEO, cobertura de conteudo e fila de acoes priorizadas
        </p>
      </div>

      {/* Score + Sub-scores */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <ScoreRing score={audit.score.overall} label={audit.score.label} color={audit.score.color} />

        <div className="lg:col-span-3 card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
            Detalhamento do Score
          </h2>
          <SubScoreBar label="Metadata (titles, descriptions)" score={audit.score.metadata} icon={FileText} />
          <SubScoreBar label="Qualidade do Conteudo" score={audit.score.content} icon={Layers} />
          <SubScoreBar label="Links Internos" score={audit.score.internalLinking} icon={Link2} />
          <SubScoreBar label="Cobertura de Conteudo" score={audit.score.coverage} icon={BarChart3} />
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold font-display text-text-primary">
            {audit.totalPages.toLocaleString("pt-BR")}
          </p>
          <p className="text-xs text-text-muted mt-1">Paginas Totais</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold font-display text-accent-orange">
            {audit.pagesWithIssues}
          </p>
          <p className="text-xs text-text-muted mt-1">Com Problemas</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold font-display text-red-500">
            {audit.issuesBySeverity.critical}
          </p>
          <p className="text-xs text-text-muted mt-1">Criticos</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold font-display text-accent-blue">
            {coverage.overallPercentage}%
          </p>
          <p className="text-xs text-text-muted mt-1">Cobertura Geral</p>
        </div>
      </div>

      {/* Coverage Report */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold font-display text-text-primary mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-accent-blue" />
          Cobertura de Conteudo
        </h2>
        <div className="space-y-3">
          {coverage.items.map((item) => {
            const barColor =
              item.percentage >= 80
                ? "bg-accent-green"
                : item.percentage >= 50
                  ? "bg-accent-blue"
                  : item.percentage >= 25
                    ? "bg-accent-orange"
                    : "bg-red-400";
            const textColor =
              item.percentage >= 80
                ? "text-accent-green"
                : item.percentage >= 50
                  ? "text-accent-blue"
                  : item.percentage >= 25
                    ? "text-accent-orange"
                    : "text-red-500";

            return (
              <div key={item.label} className="p-3 bg-surface-50 rounded-lg">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-text-primary">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">
                      {item.covered}/{item.total}
                    </span>
                    <span className={`text-xs font-bold ${textColor}`}>{item.percentage}%</span>
                  </div>
                </div>
                <div className="h-2 bg-surface-200 rounded-full overflow-hidden mb-1.5">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <p className="text-[11px] text-text-muted">{item.details}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Issues by Type */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold font-display text-text-primary mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-accent-orange" />
          Problemas por Tipo
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(
            [
              { key: "empty_page", label: "Paginas Vazias" },
              { key: "missing_title", label: "Sem Titulo" },
              { key: "missing_description", label: "Sem Descricao" },
              { key: "weak_content", label: "Conteudo Fraco" },
              { key: "poor_internal_linking", label: "Links Fracos" },
              { key: "orphan_page", label: "Paginas Orfas" },
              { key: "missing_canonical", label: "Sem Canonical" },
              { key: "weak_title", label: "Titulo Fraco" },
            ] as const
          ).map((item) => {
            const count = audit.issuesByType[item.key];
            return (
              <div
                key={item.key}
                className={`p-3 rounded-lg text-center ${count > 0 ? "bg-orange-50" : "bg-green-50"}`}
              >
                <p
                  className={`text-xl font-bold font-display ${count > 0 ? "text-accent-orange" : "text-accent-green"}`}
                >
                  {count}
                </p>
                <p className="text-[11px] text-text-muted mt-0.5">{item.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Issues */}
      {topIssues.length > 0 && (
        <div className="card p-5">
          <h2 className="text-lg font-semibold font-display text-text-primary mb-4 flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Problemas Detectados
          </h2>
          <div className="space-y-2">
            {topIssues.map((issue, i) => {
              const sc = severityConfig[issue.severity];
              const Icon = sc.icon;
              return (
                <div key={`${issue.pageSlug}-${issue.type}-${i}`} className="flex items-start gap-3 p-3 bg-surface-50 rounded-lg">
                  <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${sc.bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${sc.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {issue.pageTitle}
                      </p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>
                        {sc.label}
                      </span>
                      <span className="text-[10px] text-text-muted px-1.5 py-0.5 rounded-full bg-surface-100">
                        {issue.pageType}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">{issue.message}</p>
                    <p className="text-xs text-accent-blue mt-0.5">{issue.recommendation}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions Queue */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold font-display text-text-primary mb-1 flex items-center gap-2">
          <Zap className="h-5 w-5 text-accent-orange" />
          Fila de Acoes SEO
        </h2>
        <p className="text-xs text-text-muted mb-4">
          Acoes priorizadas por oportunidade e impacto estimado
        </p>

        {topActions.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-8 w-8 text-accent-green mx-auto mb-2" />
            <p className="text-sm text-text-muted">Nenhuma acao pendente. SEO esta otimizado!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {topActions.map((action, i) => {
              const cfg = actionTypeConfig[action.type] ?? actionTypeConfig.create_page;
              const impact = impactConfig[action.estimatedImpact] ?? impactConfig.low;
              const ActionIcon = cfg.icon;

              return (
                <div
                  key={`${action.targetSlug}-${action.type}-${i}`}
                  className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg hover:bg-surface-100 transition-colors"
                >
                  {/* Priority badge */}
                  <div className="w-8 h-8 rounded-lg bg-white border border-surface-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-text-primary">{i + 1}</span>
                  </div>

                  {/* Action type icon */}
                  <div className={`p-1.5 rounded-lg flex-shrink-0 ${cfg.bg}`}>
                    <ActionIcon className={`h-3.5 w-3.5 ${cfg.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {action.target}
                      </p>
                    </div>
                    <p className="text-xs text-text-muted truncate">{action.reason}</p>
                  </div>

                  {/* Tags */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${impact.bg} ${impact.color}`}>
                      {action.estimatedImpact === "high" ? "Alto" : action.estimatedImpact === "medium" ? "Medio" : "Baixo"}
                    </span>
                    <span className="text-[10px] text-text-muted bg-surface-100 px-1.5 py-0.5 rounded-full">
                      {action.pageType}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {actions.length > 20 && (
          <p className="text-xs text-text-muted text-center mt-3">
            +{actions.length - 20} acoes adicionais nao exibidas
          </p>
        )}
      </div>

      {/* Best Opportunities */}
      {topActions.filter((a) => a.type === "create_page").length > 0 && (
        <div className="card p-5">
          <h2 className="text-lg font-semibold font-display text-text-primary mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-accent-green" />
            Melhores Oportunidades
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {topActions
              .filter((a) => a.type === "create_page")
              .slice(0, 8)
              .map((action, i) => (
                <div
                  key={`opp-${action.targetSlug}-${i}`}
                  className="flex items-center gap-3 p-3 bg-green-50 rounded-lg"
                >
                  <div className="w-7 h-7 rounded-full bg-accent-green/10 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-3.5 w-3.5 text-accent-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{action.target}</p>
                    <p className="text-xs text-text-muted truncate">{action.reason}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 text-accent-green">
                    <span className="text-xs font-medium">Criar</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
