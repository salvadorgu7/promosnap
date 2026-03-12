"use client"

import { AlertTriangle, RefreshCw, WifiOff, ServerCrash, ShieldAlert, type LucideIcon } from "lucide-react"

type ErrorVariant = "generic" | "network" | "server" | "permission"

const variantDefaults: Record<ErrorVariant, { icon: LucideIcon; title: string; message: string; iconBg: string; iconColor: string }> = {
  generic: {
    icon: AlertTriangle,
    title: "Algo deu errado",
    message: "Ocorreu um erro inesperado. Tente novamente em alguns instantes.",
    iconBg: "bg-red-50",
    iconColor: "text-accent-red",
  },
  network: {
    icon: WifiOff,
    title: "Falha na conexao",
    message: "Nao foi possivel conectar ao servidor. Verifique sua conexao e tente novamente.",
    iconBg: "bg-amber-50",
    iconColor: "text-accent-orange",
  },
  server: {
    icon: ServerCrash,
    title: "Erro no servidor",
    message: "Nossos servidores estao com dificuldades. Tente novamente em alguns minutos.",
    iconBg: "bg-red-50",
    iconColor: "text-accent-red",
  },
  permission: {
    icon: ShieldAlert,
    title: "Acesso restrito",
    message: "Voce nao tem permissao para acessar este recurso.",
    iconBg: "bg-purple-50",
    iconColor: "text-accent-purple",
  },
}

interface ErrorStateProps {
  icon?: LucideIcon
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
  variant?: ErrorVariant
  /** Compact mode for inline error states */
  compact?: boolean
}

export default function ErrorState({
  icon,
  title,
  message,
  onRetry,
  retryLabel = "Tentar novamente",
  variant = "generic",
  compact = false,
}: ErrorStateProps) {
  const defaults = variantDefaults[variant]
  const Icon = icon || defaults.icon
  const displayTitle = title || defaults.title
  const displayMessage = message || defaults.message
  const iconBg = defaults.iconBg
  const iconColor = defaults.iconColor

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50/50 border border-red-100">
        <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`h-4.5 w-4.5 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">{displayTitle}</p>
          <p className="text-xs text-text-muted mt-0.5 truncate">{displayMessage}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="btn-secondary text-xs px-3 py-1.5 flex-shrink-0"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className={`w-16 h-16 rounded-2xl ${iconBg} flex items-center justify-center mb-5 shadow-sm`}>
        <Icon className={`h-7 w-7 ${iconColor}`} />
      </div>
      <h2 className="font-display font-semibold text-lg text-text-primary mb-1.5">{displayTitle}</h2>
      <p className="text-sm text-text-muted max-w-sm mb-6 leading-relaxed">{displayMessage}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-secondary flex items-center gap-2 px-5 py-2.5 hover:shadow-sm transition-all"
        >
          <RefreshCw className="h-4 w-4" />
          {retryLabel}
        </button>
      )}
    </div>
  )
}
