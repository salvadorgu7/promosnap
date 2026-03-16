"use client"

import { useEffect, useState, useCallback } from "react"
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Server,
  Database,
  Shield,
  Globe,
  Plug,
  Rocket,
  Info,
} from "lucide-react"
import type { ProductionReport, ProductionCheck, CheckGroup } from "@/lib/production/types"
import {
  toSeverity,
  severityIconBg,
  severitySolid,
  severityBg,
  severityGradient,
  type Severity,
} from "@/lib/admin/severity"

const GROUP_META: Record<CheckGroup, { label: string; icon: typeof Server; description: string }> = {
  infrastructure: { label: "Infraestrutura", icon: Server, description: "Servidores, deploy e ambiente de execução" },
  data: { label: "Dados", icon: Database, description: "Banco de dados, ingestão e integridade" },
  security: { label: "Segurança", icon: Shield, description: "Headers, autenticação e proteção" },
  seo: { label: "SEO", icon: Globe, description: "Sitemap, meta tags e canonical URLs" },
  integrations: { label: "Integrações", icon: Plug, description: "APIs externas, email e cron" },
}

const GROUP_ORDER: CheckGroup[] = [
  "infrastructure",
  "data",
  "security",
  "seo",
  "integrations",
]

/** Map production check status → Severity */
function checkToSeverity(status: ProductionCheck["status"]): Severity {
  return toSeverity(status)
}

function StatusDot({ status }: { status: ProductionCheck["status"] }) {
  if (status === "pass")
    return <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
  if (status === "warn")
    return <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
  return <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
}

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-600"
  if (score >= 50) return "text-amber-600"
  return "text-red-600"
}

function scoreBg(score: number) {
  if (score >= 80) return "from-emerald-500 to-emerald-600"
  if (score >= 50) return "from-amber-500 to-amber-600"
  return "from-red-500 to-red-600"
}

function productionGuidance(check: ProductionCheck): string | null {
  if (check.status === "pass") return null
  const name = check.name.toLowerCase()
  if (name.includes("database") || name.includes("db"))
    return "Verifique DATABASE_URL e que o banco esteja acessível."
  if (name.includes("cron"))
    return "Defina CRON_SECRET para ativar jobs agendados. Sem isso, dados ficam desatualizados."
  if (name.includes("email") || name.includes("resend"))
    return "Configure RESEND_API_KEY para habilitar envio de emails."
  if (name.includes("sitemap"))
    return "Execute o job de sitemap. Essencial para indexação no Google."
  if (name.includes("canonical") || name.includes("domain"))
    return "Defina NEXT_PUBLIC_APP_URL com o domínio de produção."
  if (name.includes("security") || name.includes("header"))
    return "Revise o middleware de segurança e headers HTTP."
  if (name.includes("source") || name.includes("provider"))
    return "Configure as credenciais da API ou ative fontes em /admin/fontes."
  return null
}

export default function ProductionPage() {
  const [report, setReport] = useState<ProductionReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const secret = new URLSearchParams(window.location.search).get("secret") || ""
      const res = await fetch(`/api/admin/production?secret=${encodeURIComponent(secret)}`)
      if (!res.ok) throw new Error(`Status ${res.status}`)
      const data: ProductionReport = await res.json()
      setReport(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  // Group checks
  const grouped: Record<CheckGroup, ProductionCheck[]> = {
    infrastructure: [],
    data: [],
    security: [],
    seo: [],
    integrations: [],
  }

  if (report) {
    for (const check of report.checks) {
      if (grouped[check.group]) {
        grouped[check.group].push(check)
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <Rocket className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-text-primary">
              Production Readiness
            </h1>
            <p className="text-xs text-text-muted">
              Verificação completa do ambiente de produção
            </p>
          </div>
        </div>
        <button
          onClick={fetchReport}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-200 text-sm text-text-secondary hover:bg-surface-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Re-check
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3 text-red-700">
            <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Erro ao carregar verificação</p>
              <p className="text-xs mt-0.5">{error}</p>
              <p className="text-xs mt-1 opacity-70">
                Verifique se o secret está correto na URL (?secret=...) e se a API está acessível.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && !report && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-surface-200 bg-white animate-pulse h-32" />
          ))}
        </div>
      )}

      {/* Report */}
      {report && (
        <>
          {/* Score card */}
          <div className="rounded-xl border border-surface-200 bg-white p-5 flex items-center gap-6">
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-surface-100"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="url(#scoreGrad)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(report.score / 100) * 264} 264`}
                />
                <defs>
                  <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={report.score >= 80 ? '#10b981' : report.score >= 50 ? '#f59e0b' : '#ef4444'} />
                    <stop offset="100%" stopColor={report.score >= 80 ? '#059669' : report.score >= 50 ? '#d97706' : '#dc2626'} />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-2xl font-display font-bold ${scoreColor(report.score)}`}>
                  {report.score}
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                {report.ready ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-semibold border border-emerald-200">
                    <CheckCircle2 className="h-4 w-4" /> Pronto para produção
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-sm font-semibold border border-red-200">
                    <XCircle className="h-4 w-4" /> Não pronto
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted mt-1">
                {report.checks.filter((c) => c.status === "pass").length} pass{" "}
                / {report.checks.filter((c) => c.status === "warn").length} alertas{" "}
                / {report.checks.filter((c) => c.status === "fail").length} falhas{" "}
                — {report.checks.length} checks totais
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">
                Verificado: {new Date(report.timestamp).toLocaleString("pt-BR")}
              </p>
              {!report.ready && (
                <p className="text-xs text-red-600 mt-2">
                  Resolva os itens em vermelho abaixo antes de ir para produção.
                </p>
              )}
            </div>
          </div>

          {/* Summary bar */}
          <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-surface-100">
            {report.checks.length > 0 && (
              <>
                <div
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all rounded-l-full"
                  style={{
                    width: `${(report.checks.filter((c) => c.status === "pass").length / report.checks.length) * 100}%`,
                  }}
                />
                <div
                  className="bg-gradient-to-r from-amber-400 to-amber-500 transition-all"
                  style={{
                    width: `${(report.checks.filter((c) => c.status === "warn").length / report.checks.length) * 100}%`,
                  }}
                />
                <div
                  className="bg-gradient-to-r from-red-400 to-red-500 transition-all rounded-r-full"
                  style={{
                    width: `${(report.checks.filter((c) => c.status === "fail").length / report.checks.length) * 100}%`,
                  }}
                />
              </>
            )}
          </div>

          {/* Grouped checks */}
          <div className="space-y-4">
            {GROUP_ORDER.map((groupKey) => {
              const checks = grouped[groupKey]
              if (checks.length === 0) return null
              const meta = GROUP_META[groupKey]
              const Icon = meta.icon
              const worstStatus = checks.some((c) => c.status === "fail")
                ? "fail"
                : checks.some((c) => c.status === "warn")
                  ? "warn"
                  : "pass"
              const groupSev = checkToSeverity(worstStatus)

              return (
                <div key={groupKey} className="rounded-xl border border-surface-200 bg-white p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${severityIconBg(groupSev)}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="font-display font-semibold text-sm text-text-primary">
                        {meta.label}
                      </h2>
                      <p className="text-[10px] text-text-muted">{meta.description}</p>
                    </div>
                    <span className="ml-auto text-xs text-text-muted">
                      {checks.filter((c) => c.status === "pass").length}/{checks.length} OK
                    </span>
                  </div>
                  <div className="space-y-2">
                    {checks.map((check, i) => {
                      const sev = checkToSeverity(check.status)
                      const guidance = productionGuidance(check)
                      return (
                        <div
                          key={i}
                          className={`flex flex-col gap-1 px-3 py-2.5 rounded-lg ${severityBg(sev)}`}
                        >
                          <div className="flex items-start gap-3">
                            <StatusDot status={check.status} />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-text-primary">{check.name}</p>
                              <p className="text-xs text-text-muted">{check.message}</p>
                              {check.detail && (
                                <p className="text-[10px] text-text-muted mt-0.5 font-mono">
                                  {check.detail}
                                </p>
                              )}
                            </div>
                          </div>
                          {guidance && (
                            <div className="flex items-start gap-1.5 ml-7 mt-1">
                              <Info className="h-3 w-3 flex-shrink-0 mt-0.5 text-text-muted" />
                              <p className="text-[10px] text-text-muted leading-relaxed">{guidance}</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
