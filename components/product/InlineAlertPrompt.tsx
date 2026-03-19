"use client"

import { useEffect, useState } from "react"
import { Bell } from "lucide-react"

interface InlineAlertPromptProps {
  listingId: string
  currentPrice: number
  productName: string
}

export default function InlineAlertPrompt({ listingId, currentPrice, productName }: InlineAlertPromptProps) {
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    const hasAlert = localStorage.getItem(`ps_alert_${listingId}`)
    setHidden(!!hasAlert)
  }, [listingId])

  if (hidden) return null

  const scrollToAlert = () => {
    const el = document.getElementById("price-alert")
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      window.dispatchEvent(new CustomEvent("ps:open-alert"))
    }
  }

  return (
    <button
      onClick={scrollToAlert}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-accent-orange/8 border border-accent-orange/20 hover:bg-accent-orange/12 transition-colors text-left"
    >
      <Bell className="h-4 w-4 text-accent-orange flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">Quer pagar menos?</p>
        <p className="text-xs text-text-muted">Crie um alerta e avisamos quando o preco baixar</p>
      </div>
      <span className="text-xs font-semibold text-accent-orange flex-shrink-0">Criar alerta</span>
    </button>
  )
}
