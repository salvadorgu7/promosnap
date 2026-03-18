"use client"

import { useEffect } from "react"

export default function SearchError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[PromoSnap] Search page error:", error)
  }, [error])

  return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
        <span className="text-2xl">🔍</span>
      </div>
      <h2 className="text-xl font-bold font-display text-text-primary mb-2">
        Erro na busca
      </h2>
      <p className="text-sm text-text-muted mb-6">
        Nao foi possivel realizar a busca. Tente novamente em alguns instantes.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={reset}
          className="btn-primary px-6 py-2.5 text-sm font-semibold"
        >
          Tentar novamente
        </button>
        <a href="/" className="btn-secondary px-6 py-2.5 text-sm font-semibold">
          Voltar ao inicio
        </a>
      </div>
    </div>
  )
}
