import { AlertCircle } from "lucide-react"
import type { BuySignal } from "@/lib/decision/buy-signal"
import { formatPrice } from "@/lib/utils"

interface ProductCaveatProps {
  buySignal: BuySignal | null
  trend?: "up" | "down" | "stable"
  cheaperAlternative?: { name: string; price: number; slug: string } | null
  reviewConfidence?: "high" | "medium" | "low" | null
}

export default function ProductCaveat({
  buySignal,
  trend,
  cheaperAlternative,
  reviewConfidence,
}: ProductCaveatProps) {
  // Pick the single most relevant caveat
  let caveat: { text: string; severity: "warn" | "info" } | null = null

  if (buySignal?.level === "aguarde") {
    caveat = { text: "Tendencia de queda detectada — pode valer a pena aguardar.", severity: "warn" }
  } else if (trend === "up" && buySignal?.level === "neutro") {
    caveat = { text: "Preco em alta recente — compare com alternativas antes de decidir.", severity: "warn" }
  } else if (cheaperAlternative) {
    caveat = {
      text: `Alternativa mais barata: ${cheaperAlternative.name} por ${formatPrice(cheaperAlternative.price)}.`,
      severity: "info",
    }
  } else if (reviewConfidence === "low") {
    caveat = { text: "Poucas avaliacoes disponiveis — dados de confianca limitados.", severity: "info" }
  }

  if (!caveat) return null

  return (
    <div
      className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-xs ${
        caveat.severity === "warn"
          ? "bg-accent-orange/8 border border-accent-orange/15 text-accent-orange"
          : "bg-surface-50 border border-surface-200 text-text-muted"
      }`}
      data-track-block="product-caveat"
    >
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
      <span>{caveat.text}</span>
    </div>
  )
}
