import { Loader2 } from "lucide-react"

interface LoadingStateProps {
  variant?: "skeleton" | "spinner"
  message?: string
  /** Number of skeleton rows to show (skeleton variant only) */
  rows?: number
}

export default function LoadingState({
  variant = "spinner",
  message,
  rows = 3,
}: LoadingStateProps) {
  if (variant === "skeleton") {
    return (
      <div className="space-y-3 py-4" role="status" aria-label="Carregando">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="skeleton h-4 rounded-md" style={{ width: `${80 - i * 10}%` }} />
            <div className="skeleton h-3 rounded-md" style={{ width: `${60 - i * 5}%` }} />
          </div>
        ))}
        {message && (
          <p className="text-xs text-text-muted text-center pt-2">{message}</p>
        )}
        <span className="sr-only">Carregando...</span>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-4"
      role="status"
      aria-label="Carregando"
    >
      <Loader2 className="h-8 w-8 text-accent-blue animate-spin mb-3" />
      {message ? (
        <p className="text-sm text-text-muted">{message}</p>
      ) : (
        <p className="text-sm text-text-muted">Carregando...</p>
      )}
      <span className="sr-only">Carregando...</span>
    </div>
  )
}
