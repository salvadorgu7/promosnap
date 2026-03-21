"use client"

import { TrendingDown, TrendingUp, Minus, Info } from "lucide-react"

interface PricePredictionData {
  verdict: "vai_cair" | "vai_subir" | "estavel" | "incerto"
  confidence: "alta" | "media" | "baixa"
  headline: string
  detail: string
  estimatedPrice7d?: number
  potentialSavings?: number
  factors: string[]
}

const VERDICT_STYLES = {
  vai_cair: { bg: "bg-emerald-50", border: "border-emerald-200", icon: TrendingDown, iconColor: "text-emerald-500", headColor: "text-emerald-700" },
  vai_subir: { bg: "bg-red-50", border: "border-red-200", icon: TrendingUp, iconColor: "text-red-500", headColor: "text-red-700" },
  estavel: { bg: "bg-blue-50", border: "border-blue-200", icon: Minus, iconColor: "text-blue-500", headColor: "text-blue-700" },
  incerto: { bg: "bg-gray-50", border: "border-gray-200", icon: Info, iconColor: "text-gray-500", headColor: "text-gray-600" },
}

export default function PricePrediction({ prediction }: { prediction: PricePredictionData }) {
  const style = VERDICT_STYLES[prediction.verdict]
  const Icon = style.icon

  return (
    <div className={`rounded-xl ${style.bg} border ${style.border} p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-5 h-5 ${style.iconColor}`} />
        <h4 className={`font-semibold text-sm ${style.headColor}`}>
          {prediction.headline}
        </h4>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/60 text-text-muted font-medium ml-auto">
          Confiança {prediction.confidence}
        </span>
      </div>

      <p className="text-xs text-text-secondary mb-3">
        {prediction.detail}
      </p>

      {prediction.factors.length > 0 && (
        <ul className="space-y-1">
          {prediction.factors.slice(0, 3).map((f, i) => (
            <li key={i} className="text-[11px] text-text-muted flex items-start gap-1.5">
              <span className="text-text-muted mt-0.5">•</span>
              {f}
            </li>
          ))}
        </ul>
      )}

      {prediction.potentialSavings && prediction.potentialSavings > 0 && (
        <div className="mt-3 text-xs font-medium text-emerald-600 bg-emerald-100/50 rounded-lg px-3 py-1.5 inline-block">
          Economia potencial: R$ {prediction.potentialSavings.toFixed(0)}
        </div>
      )}
    </div>
  )
}
