import { Loader2 } from "lucide-react"

interface LoadingStateProps {
  variant?: "skeleton" | "spinner" | "dots"
  message?: string
  /** Number of skeleton rows to show (skeleton variant only) */
  rows?: number
  /** Size for spinner variant */
  size?: "sm" | "md" | "lg"
}

export default function LoadingState({
  variant = "spinner",
  message,
  rows = 3,
  size = "md",
}: LoadingStateProps) {
  if (variant === "skeleton") {
    return (
      <div className="space-y-4 py-4" role="status" aria-label="Carregando">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2.5">
            <div className="shimmer h-4 rounded-md" style={{ width: `${85 - i * 10}%` }} />
            <div className="shimmer h-3 rounded-md" style={{ width: `${65 - i * 8}%` }} />
          </div>
        ))}
        {message && (
          <p className="text-xs text-text-muted text-center pt-3">{message}</p>
        )}
        <span className="sr-only">Carregando...</span>
      </div>
    )
  }

  if (variant === "dots") {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 px-4"
        role="status"
        aria-label="Carregando"
      >
        <div className="flex items-center gap-1.5 mb-3">
          <span className="w-2 h-2 rounded-full bg-accent-blue animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 rounded-full bg-accent-blue animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 rounded-full bg-accent-blue animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
        {message && (
          <p className="text-sm text-text-muted">{message}</p>
        )}
        <span className="sr-only">Carregando...</span>
      </div>
    )
  }

  const spinnerSizes = {
    sm: { icon: "h-5 w-5", py: "py-8" },
    md: { icon: "h-7 w-7", py: "py-16" },
    lg: { icon: "h-10 w-10", py: "py-20" },
  }
  const s = spinnerSizes[size]

  return (
    <div
      className={`flex flex-col items-center justify-center ${s.py} px-4`}
      role="status"
      aria-label="Carregando"
    >
      <div className="relative">
        <div className={`${s.icon} rounded-full border-2 border-surface-200 absolute inset-0`} />
        <Loader2 className={`${s.icon} text-accent-blue animate-spin`} />
      </div>
      <p className="text-sm text-text-muted mt-3">
        {message || "Carregando..."}
      </p>
      <span className="sr-only">Carregando...</span>
    </div>
  )
}
