"use client"

import { Sparkles } from "lucide-react"
import Link from "next/link"

interface AskAIBlockProps {
  productName: string
  productSlug: string
}

export default function AskAIBlock({ productName, productSlug }: AskAIBlockProps) {
  const query = encodeURIComponent(`Vale a pena comprar ${productName}?`)

  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-brand-50 to-purple-50 border border-brand-500/10" data-track-block="ask-ai">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-brand-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary">Tem duvidas sobre este produto?</p>
          <p className="text-xs text-text-muted">Pergunte ao assistente IA do PromoSnap</p>
        </div>
        <Link
          href={`/assistente?q=${query}`}
          className="flex-shrink-0 px-3 py-2 rounded-lg bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition-colors"
        >
          Perguntar
        </Link>
      </div>
    </div>
  )
}
