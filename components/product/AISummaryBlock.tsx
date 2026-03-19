"use client"

import { useState } from "react"
import { Sparkles, Loader2, User, AlertTriangle } from "lucide-react"

interface AISummaryBlockProps {
  productSlug: string
}

interface ProductSummary {
  summary: string
  goodFor: string
  considerIf: string
}

export default function AISummaryBlock({ productSlug }: AISummaryBlockProps) {
  const [summary, setSummary] = useState<ProductSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const generate = async () => {
    if (loading || summary) return
    setLoading(true)
    setError(false)

    try {
      const res = await fetch("/api/ai/product-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: productSlug }),
      })

      if (!res.ok) {
        setError(true)
        return
      }

      const data = await res.json()
      setSummary(data.summary)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (error) return null // Fail silently

  if (!summary) {
    return (
      <button
        onClick={generate}
        disabled={loading}
        className="w-full flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-brand-50 to-purple-50 border border-brand-500/10 hover:border-brand-500/20 transition-colors text-left"
        data-track-block="ai-summary"
      >
        <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
          {loading ? (
            <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 text-brand-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary">
            {loading ? "Gerando resumo..." : "Resumir com IA"}
          </p>
          <p className="text-xs text-text-muted">
            {loading ? "Analisando dados verificados" : "Analise rapida baseada em dados reais"}
          </p>
        </div>
      </button>
    )
  }

  return (
    <div className="card p-4 border-brand-500/10" data-track-block="ai-summary">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-brand-500" />
        <h3 className="text-sm font-semibold text-text-primary">Resumo IA</h3>
      </div>

      <p className="text-sm text-text-secondary leading-relaxed mb-3">{summary.summary}</p>

      {summary.goodFor && (
        <div className="flex items-start gap-2 mb-2">
          <User className="w-3.5 h-3.5 text-accent-green mt-0.5 flex-shrink-0" />
          <p className="text-xs text-text-secondary">{summary.goodFor}</p>
        </div>
      )}

      {summary.considerIf && (
        <div className="flex items-start gap-2 mb-2">
          <AlertTriangle className="w-3.5 h-3.5 text-accent-orange mt-0.5 flex-shrink-0" />
          <p className="text-xs text-text-secondary">{summary.considerIf}</p>
        </div>
      )}

      <p className="text-[10px] text-text-muted mt-2 border-t border-surface-100 pt-2">
        Resumo gerado por IA com base em dados verificados. Nao substitui pesquisa propria.
      </p>
    </div>
  )
}
