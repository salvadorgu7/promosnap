"use client"

import { Bell } from "lucide-react"
import { formatPrice } from "@/lib/utils"

interface Props {
  productName: string
  currentPrice: number
  suggestedTargetPrice: number
  slug: string
}

export default function AlertSuggestion({ productName, currentPrice, suggestedTargetPrice, slug }: Props) {
  const savings = Math.round(currentPrice - suggestedTargetPrice)

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 mt-2">
      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
        <Bell className="w-4 h-4 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-amber-800">
          Quer pagar menos?
        </p>
        <p className="text-[11px] text-amber-700 mt-0.5">
          Crie um alerta para <span className="font-medium">{productName.slice(0, 40)}</span> e
          economize até <span className="font-bold">{formatPrice(savings)}</span>
        </p>
      </div>
      <a
        href={`/produto/${slug}#alerta`}
        className="text-[11px] font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
      >
        Criar alerta
      </a>
    </div>
  )
}
