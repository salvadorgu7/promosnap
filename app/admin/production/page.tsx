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
} from "lucide-react"
import type { ProductionReport, ProductionCheck, CheckGroup } from "@/lib/production/types"

const GROUP_META: Record<CheckGroup, { label: string; icon: typeof Server }> = {
  infrastructure: { label: "Infraestrutura", icon: Server },
  data: { label: "Dados", icon: Database },
  security: { label: "Seguranca", icon: Shield },
  seo: { label: "SEO", icon: Globe },
  integrations: { label: "Integracoes", icon: Plug },
}

const GROUP_ORDER: CheckGroup[] = [
  "infrastructure",
  "data",
  "security",
  "seo",
  "integrations",
]

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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-blue to-brand-500 flex items-center justify-center">
            <Rocket className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-text-primary">
              Production Readiness
            </h1>
            <p className="text-xs text-text-muted">
              Verificacao completa do ambiente de producao
            </p>
          </div>
        </div>
        <button
          onClick={fetchReport}
          disabled={loading}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Re-check
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="admin-card border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-700 text-sm">
            <XCircle className="h-4 w-4" />
            <span>Erro ao carregar: {error}</span>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && !report && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="admin-card animate-pulse h-32" />
          ))}
        </div>
      )}

      {/* Report */}
      {report && (
        <>
          {/* Score card */}
          <div className="admin-card flex items-center gap-6">
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
                    <stop offset="0%" className={`${report.score >= 80 ? '[stop-color:#10b981]' : report.score >= 50 ? '[stop-color:#f59e0b]' : '[stop-color:#ef4444]'}`} stopColor={report.score >= 80 ? '#10b981' : report.score >= 50 ? '#f59e0b' : '#ef4444'} />
                    <stop offset="100%" className={`${report.score >= 80 ? '[stop-color:#059669]' : report.score >= 50 ? '[stop-color:#d97706]' : '[stop-color:#dc2626]'}`} stopColor={report.score >= 80 ? '#059669' : report.score >= 50 ? '#d97706' : '#dc2626'} />
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
                    <CheckCircle2 className="h-4 w-4" /> Pronto para producao
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-sm font-semibold border border-red-200">
                    <XCircle className="h-4 w-4" /> Nao pronto
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted mt-1">
                {report.checks.filter((c) => c.status === "pass").length} pass{" "}
                / {report.checks.filter((c) => c.status === "warn").length} warn{" "}
                / {report.checks.filter((c) => c.status === "fail").length} fail{" "}
                — {report.checks.length} checks totais
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">
                Ultima verificacao: {new Date(report.timestamp).toLocaleString("pt-BR")}
              </p>
            </div>
          </div>

          {/* Summary bar */}
          <div className="flex gap-2 h-3 rounded-full overflow-hidden bg-surface-100">
            {report.checks.length > 0 && (
              <>
                <div
                  className={`bg-gradient-to-r ${scoreBg(100)} rounded-l-full transition-all`}
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
                  className="bg-gradient-to-r from-red-400 to-red-500 rounded-r-full transition-all"
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

              return (
                <div key={groupKey} className="admin-card">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        worstStatus === "pass"
                          ? "bg-emerald-50 text-emerald-600"
                          : worstStatus === "warn"
                            ? "bg-amber-50 text-amber-600"
                            : "bg-red-50 text-red-600"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <h2 className="font-display font-semibold text-sm text-text-primary">
                      {meta.label}
                    </h2>
                    <span className="ml-auto text-xs text-text-muted">
                      {checks.filter((c) => c.status === "pass").length}/{checks.length} pass
                    </span>
                  </div>
                  <div className="space-y-2">
                    {checks.map((check, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-3 px-3 py-2.5 rounded-lg ${
                          check.status === "fail"
                            ? "bg-red-50/60"
                            : check.status === "warn"
                              ? "bg-amber-50/40"
                              : "bg-surface-50"
                        }`}
                      >
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
                    ))}
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
