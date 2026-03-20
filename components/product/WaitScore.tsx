"use client"

import { useState, useEffect } from "react"
import { Clock, TrendingDown, Zap, Calendar, BarChart3, ArrowDown } from "lucide-react"

interface WaitScoreData {
  shouldWait: boolean
  score: number
  daysToWait: number
  expectedSavings: number
  confidence: 'high' | 'medium' | 'low'
  reason: string
  factors: Array<{
    label: string
    impact: number
    type: string
  }>
}

interface WaitScoreProps {
  productSlug: string
}

const FACTOR_ICONS: Record<string, typeof Clock> = {
  velocity: TrendingDown,
  momentum: Zap,
  support: ArrowDown,
  seasonal: Calendar,
  volatility: BarChart3,
  historical: Clock,
}

export default function WaitScore({ productSlug }: WaitScoreProps) {
  const [data, setData] = useState<WaitScoreData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch(`/api/product/${productSlug}/wait-score`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [productSlug])

  if (loading || !data || data.score === 0) return null

  const gaugeColor = data.shouldWait
    ? 'text-accent-orange'
    : 'text-accent-green'

  const gaugeBg = data.shouldWait
    ? 'bg-accent-orange/10 border-accent-orange/20'
    : 'bg-accent-green/10 border-accent-green/20'

  return (
    <div className={`rounded-lg border ${gaugeBg} p-3 mt-2`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${gaugeColor}`} />
          <span className={`text-sm font-bold ${gaugeColor}`}>
            {data.shouldWait ? 'Vale esperar' : 'Compre agora'}
          </span>
          <span className="text-[10px] text-text-muted px-1.5 py-0.5 rounded-full bg-surface-100">
            {data.confidence === 'high' ? 'Alta' : data.confidence === 'medium' ? 'Media' : 'Baixa'} confianca
          </span>
        </div>
        <span className="text-xs text-text-muted">{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Summary */}
      <p className="text-xs text-text-secondary mt-1">{data.reason}</p>

      {data.shouldWait && data.expectedSavings > 0 && (
        <p className="text-xs text-accent-orange mt-1 font-medium">
          Economia esperada: ~R${data.expectedSavings.toFixed(2).replace('.', ',')} em ~{data.daysToWait} dias
        </p>
      )}

      {/* Expanded factors */}
      {expanded && data.factors.length > 0 && (
        <div className="mt-3 pt-2 border-t border-surface-200 space-y-1.5">
          {data.factors.map((factor, i) => {
            const Icon = FACTOR_ICONS[factor.type] || Clock
            return (
              <div key={i} className="flex items-center gap-2 text-xs">
                <Icon className={`w-3 h-3 flex-shrink-0 ${factor.impact > 0 ? 'text-accent-orange' : 'text-accent-green'}`} />
                <span className="text-text-secondary">{factor.label}</span>
                <span className={`ml-auto font-mono text-[10px] ${factor.impact > 0 ? 'text-accent-orange' : 'text-accent-green'}`}>
                  {factor.impact > 0 ? '+' : ''}{factor.impact}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
