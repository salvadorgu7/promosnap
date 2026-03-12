"use client"

import { AlertTriangle, RefreshCw, type LucideIcon } from "lucide-react"

interface ErrorStateProps {
  icon?: LucideIcon
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
}

export default function ErrorState({
  icon: Icon = AlertTriangle,
  title = "Algo deu errado",
  message = "Ocorreu um erro inesperado. Tente novamente.",
  onRetry,
  retryLabel = "Tentar novamente",
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-accent-red" />
      </div>
      <h2 className="font-display font-semibold text-lg text-text-primary mb-1">{title}</h2>
      <p className="text-sm text-text-muted max-w-sm mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          {retryLabel}
        </button>
      )}
    </div>
  )
}
