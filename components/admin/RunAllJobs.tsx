"use client"

import { useState } from "react"
import { Rocket, Loader2, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react"

interface JobResult {
  name: string
  ok: boolean
  message: string
  durationMs?: number
}

const ALL_JOBS = [
  // Valor — importam produtos
  "discover-import",
  "catalog-amplifier",
  "ingest",
  // Manutencao
  "update-prices",
  "compute-scores",
  "ml-token-refresh",
  // Retencao
  "check-alerts",
  "push-price-drops",
  "crm-engine",
  // Growth
  "ai-content",
  "growth-daily",
  "auto-blog",
  "price-index",
  // Higiene
  "cleanup",
  "sitemap",
]

export default function RunAllJobs() {
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<JobResult[]>([])
  const [currentJob, setCurrentJob] = useState("")
  const [progress, setProgress] = useState(0)
  const [expanded, setExpanded] = useState(false)

  const runAll = async () => {
    setRunning(true)
    setResults([])
    setProgress(0)

    const jobResults: JobResult[] = []

    for (let i = 0; i < ALL_JOBS.length; i++) {
      const jobName = ALL_JOBS[i]
      setCurrentJob(jobName)
      setProgress(Math.round(((i) / ALL_JOBS.length) * 100))

      try {
        const start = Date.now()
        const res = await fetch("/api/admin/jobs/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job: jobName }),
        })
        const data = await res.json()
        const durationMs = Date.now() - start

        jobResults.push({
          name: jobName,
          ok: res.ok,
          message: res.ok
            ? `${data.result?.status || "OK"} — ${data.result?.itemsDone ?? 0} items`
            : data.error || "Falhou",
          durationMs,
        })
      } catch {
        jobResults.push({ name: jobName, ok: false, message: "Erro de rede" })
      }

      setResults([...jobResults])
    }

    setProgress(100)
    setCurrentJob("")
    setRunning(false)
  }

  const succeeded = results.filter(r => r.ok).length
  const failed = results.filter(r => !r.ok).length
  const totalDuration = results.reduce((s, r) => s + (r.durationMs || 0), 0)

  return (
    <div className="card p-4 border-2 border-brand-500/20 bg-brand-50/30">
      {/* Header + Button */}
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
            <Rocket className="w-4 h-4 text-brand-500" />
            Executar Todos os Jobs
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Dispara {ALL_JOBS.length} jobs em sequência (não afeta o cron automático)
          </p>
        </div>
        <button
          onClick={runAll}
          disabled={running}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-bold hover:bg-brand-600 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {running ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Rocket className="w-4 h-4" />
          )}
          {running ? `${progress}%` : "Executar Tudo"}
        </button>
      </div>

      {/* Progress bar */}
      {running && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-text-muted mb-1">
            <span>Executando: {currentJob}</span>
            <span>{results.length}/{ALL_JOBS.length}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-surface-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Summary */}
      {results.length > 0 && !running && (
        <div className="flex items-center gap-4 text-xs mb-2">
          <span className="text-accent-green font-medium">✓ {succeeded} ok</span>
          {failed > 0 && <span className="text-red-500 font-medium">✗ {failed} falharam</span>}
          <span className="text-text-muted">{(totalDuration / 1000).toFixed(0)}s total</span>
        </div>
      )}

      {/* Results detail (collapsible) */}
      {results.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Esconder detalhes" : "Ver detalhes"}
          </button>

          {expanded && (
            <div className="mt-2 space-y-1 max-h-64 overflow-y-auto">
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-surface-100 last:border-0">
                  {r.ok ? (
                    <CheckCircle className="w-3 h-3 text-accent-green flex-shrink-0" />
                  ) : (
                    <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                  )}
                  <span className="font-medium text-text-primary w-36 truncate">{r.name}</span>
                  <span className={`flex-1 truncate ${r.ok ? "text-text-muted" : "text-red-500"}`}>
                    {r.message}
                  </span>
                  {r.durationMs && (
                    <span className="text-text-muted flex-shrink-0">{(r.durationMs / 1000).toFixed(1)}s</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
