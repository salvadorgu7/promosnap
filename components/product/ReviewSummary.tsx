import { Star, Shield, AlertTriangle, Clock } from "lucide-react"

interface ReviewAggregateData {
  rating: number
  totalReviews: number
  confidence: string
  sourcesCount: number
  dataFreshness: string
  themes?: unknown // Json from Prisma — cast internally
}

interface ReviewSummaryProps {
  aggregate: ReviewAggregateData
}

const CONFIDENCE_CONFIG: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  high: { label: "Alta confianca", color: "text-accent-green bg-accent-green/10", icon: Shield },
  medium: { label: "Confiavel", color: "text-accent-blue bg-accent-blue/10", icon: Shield },
  low: { label: "Poucos dados", color: "text-accent-orange bg-accent-orange/10", icon: AlertTriangle },
  insufficient_data: { label: "Dados insuficientes", color: "text-surface-500 bg-surface-100", icon: Clock },
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            value >= i
              ? "text-accent-orange fill-current"
              : value >= i - 0.5
              ? "text-accent-orange fill-current opacity-50"
              : "text-surface-300"
          }`}
        />
      ))}
    </div>
  )
}

export default function ReviewSummary({ aggregate }: ReviewSummaryProps) {
  const conf = CONFIDENCE_CONFIG[aggregate.confidence] || CONFIDENCE_CONFIG.low
  const ConfIcon = conf.icon
  const rawThemes = Array.isArray(aggregate.themes) ? aggregate.themes as { theme: string; polarity: string; strength: number; mentions: number }[] : []
  const positiveThemes = rawThemes.filter(t => t.polarity === "positive").slice(0, 3)
  const negativeThemes = rawThemes.filter(t => t.polarity === "negative").slice(0, 2)

  if (aggregate.confidence === "insufficient_data") {
    return (
      <div className="card p-4 flex items-center gap-3">
        <Clock className="h-5 w-5 text-surface-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-text-secondary">Avaliacoes em coleta</p>
          <p className="text-xs text-text-muted">Estamos reunindo avaliacoes de multiplas fontes para este produto.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-4" data-track-block="review-summary">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Star className="h-4 w-4 text-accent-orange" /> Avaliacao Consolidada
        </h3>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${conf.color}`}>
          <ConfIcon className="h-3 w-3" />
          {conf.label}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="text-2xl font-bold font-display text-text-primary">
          {aggregate.rating.toFixed(1)}
        </div>
        <div>
          <StarRating value={aggregate.rating} />
          <p className="text-xs text-text-muted mt-0.5">
            {aggregate.totalReviews} avaliacoes de {aggregate.sourcesCount} {aggregate.sourcesCount === 1 ? "fonte" : "fontes"}
          </p>
        </div>
      </div>

      {/* Themes — positive */}
      {positiveThemes.length > 0 && (
        <div className="mb-2">
          <p className="text-[10px] font-medium text-accent-green uppercase tracking-wider mb-1">Elogios frequentes</p>
          <div className="flex flex-wrap gap-1">
            {positiveThemes.map(t => (
              <span key={t.theme} className="px-2 py-0.5 rounded-full bg-accent-green/8 text-accent-green text-[11px] font-medium border border-accent-green/15">
                {t.theme} ({t.mentions})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Themes — negative */}
      {negativeThemes.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-accent-red uppercase tracking-wider mb-1">Reclamacoes frequentes</p>
          <div className="flex flex-wrap gap-1">
            {negativeThemes.map(t => (
              <span key={t.theme} className="px-2 py-0.5 rounded-full bg-accent-red/8 text-accent-red text-[11px] font-medium border border-accent-red/15">
                {t.theme} ({t.mentions})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Freshness indicator */}
      {aggregate.dataFreshness === "stale" && (
        <p className="text-[10px] text-text-muted mt-2 flex items-center gap-1">
          <Clock className="h-3 w-3" /> Dados podem estar desatualizados
        </p>
      )}
    </div>
  )
}
