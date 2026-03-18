"use client"

import { useEffect } from "react"

export default function MinhaContaError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Error is captured by monitoring (Sentry/Vercel) via the digest
    if (error.digest) console.error("[PromoSnap] digest:", error.digest)
  }, [error])

  return (
    <div className="max-w-3xl mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
        <span className="text-2xl">⚠️</span>
      </div>
      <h2 className="text-xl font-bold font-display text-text-primary mb-2">
        Ops, algo deu errado
      </h2>
      <p className="text-sm text-text-muted mb-6">
        Nao foi possivel carregar esta pagina. Tente novamente ou volte ao inicio.
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
