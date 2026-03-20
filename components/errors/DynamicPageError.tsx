"use client"

import { AlertTriangle, RotateCcw, Home } from "lucide-react"
import Link from "next/link"

export default function DynamicPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-accent-red/10 flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-7 h-7 text-accent-red" />
      </div>
      <h2 className="font-display text-xl font-bold text-text-primary mb-2">
        Algo deu errado
      </h2>
      <p className="text-sm text-text-muted mb-6">
        Nao conseguimos carregar esta pagina. Pode ser um problema temporario.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-bold hover:bg-brand-600 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Tentar novamente
        </button>
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-surface-300 text-sm font-medium text-text-secondary hover:bg-surface-50 transition-colors"
        >
          <Home className="w-4 h-4" />
          Ir para home
        </Link>
      </div>
    </div>
  )
}
