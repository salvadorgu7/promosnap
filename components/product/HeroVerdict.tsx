import { CheckCircle, Clock, AlertTriangle, ExternalLink } from "lucide-react"
import { formatPrice } from "@/lib/utils"
import type { BuySignal } from "@/lib/decision/buy-signal"

type Verdict = "comprar" | "esperar" | "evitar"

interface HeroVerdictProps {
  buySignal: BuySignal
  price: number
  sourceName: string
  offerId: string
  discount?: number | null
  isNearAllTimeLow: boolean
  priceBelowAvg30d: number | null
}

function computeVerdict(signal: BuySignal, discount?: number | null): Verdict {
  if (signal.level === "excelente") return "comprar"
  if (signal.level === "bom" && (discount ?? 0) >= 15) return "comprar"
  if (signal.level === "bom") return "comprar"
  if (signal.level === "aguarde") return "esperar"
  if (signal.level === "neutro" && signal.color === "gray") return "esperar"
  return "comprar"
}

const VERDICT_CONFIG: Record<Verdict, {
  label: string
  icon: typeof CheckCircle
  bg: string
  border: string
  text: string
  iconColor: string
  btnClass: string
}> = {
  comprar: {
    label: "Bom momento para comprar",
    icon: CheckCircle,
    bg: "bg-accent-green/8",
    border: "border-accent-green/20",
    text: "text-accent-green",
    iconColor: "text-accent-green",
    btnClass: "bg-accent-green hover:bg-accent-green/90 text-white",
  },
  esperar: {
    label: "Considere aguardar",
    icon: Clock,
    bg: "bg-accent-orange/8",
    border: "border-accent-orange/20",
    text: "text-accent-orange",
    iconColor: "text-accent-orange",
    btnClass: "bg-accent-orange hover:bg-accent-orange/90 text-white",
  },
  evitar: {
    label: "Preco acima da media",
    icon: AlertTriangle,
    bg: "bg-accent-red/8",
    border: "border-accent-red/20",
    text: "text-accent-red",
    iconColor: "text-accent-red",
    btnClass: "bg-surface-200 hover:bg-surface-300 text-text-primary",
  },
}

export default function HeroVerdict({
  buySignal,
  price,
  sourceName,
  offerId,
  discount,
  isNearAllTimeLow,
  priceBelowAvg30d,
}: HeroVerdictProps) {
  const verdict = computeVerdict(buySignal, discount)
  const config = VERDICT_CONFIG[verdict]
  const Icon = config.icon

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} p-4`}>
      <div className="flex items-center gap-4 flex-wrap">
        {/* Left: icon + verdict */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`flex-shrink-0 w-10 h-10 rounded-full ${config.bg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${config.iconColor}`} />
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-bold ${config.text}`}>{config.label}</p>
            <p className="text-xs text-text-muted line-clamp-1">{buySignal.detail}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {isNearAllTimeLow && (
                <span className="text-[10px] font-semibold text-accent-green bg-accent-green/10 px-1.5 py-0.5 rounded-full">
                  Menor preco historico
                </span>
              )}
              {priceBelowAvg30d && priceBelowAvg30d >= 3 && (
                <span className="text-[10px] font-semibold text-accent-blue bg-accent-blue/10 px-1.5 py-0.5 rounded-full">
                  {priceBelowAvg30d}% abaixo da media
                </span>
              )}
              {discount && discount >= 15 && (
                <span className="text-[10px] font-semibold text-accent-purple bg-accent-purple/10 px-1.5 py-0.5 rounded-full">
                  -{discount}% OFF
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: price + CTA */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="text-xl font-bold font-display text-text-primary">{formatPrice(price)}</p>
            <p className="text-[10px] text-text-muted">em {sourceName}</p>
          </div>
          <a
            href={`/api/clickout/${offerId}?page=product`}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${config.btnClass}`}
          >
            <ExternalLink className="h-4 w-4" /> Ver oferta
          </a>
        </div>
      </div>
    </div>
  )
}
