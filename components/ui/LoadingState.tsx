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
          <div key={i} className="space-y-2.5" style={{ animationDelay: `${i * 80}ms` }}>
            <div
              className="shimmer h-4 rounded-md"
              style={{ width: `${85 - i * 10}%`, animationDelay: `${i * 100}ms` }}
            />
            <div
              className="shimmer h-3 rounded-md"
              style={{ width: `${65 - i * 8}%`, animationDelay: `${i * 100 + 50}ms` }}
            />
          </div>
        ))}
        {message && (
          <p className="text-xs text-text-muted text-center pt-3 animate-fade-in">{message}</p>
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
        <div className="flex items-center gap-2 mb-3">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-accent-blue"
              style={{
                animation: "dots-pulse 1.4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                animationDelay: `${i * 160}ms`,
              }}
            />
          ))}
        </div>
        {message && (
          <p className="text-sm text-text-muted animate-fade-in">{message}</p>
        )}
        <span className="sr-only">Carregando...</span>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes dots-pulse {
            0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
            40% { opacity: 1; transform: scale(1.1); }
          }
        ` }} />
      </div>
    )
  }

  const spinnerSizes = {
    sm: { icon: "h-5 w-5", ring: "h-5 w-5", py: "py-8" },
    md: { icon: "h-7 w-7", ring: "h-7 w-7", py: "py-16" },
    lg: { icon: "h-10 w-10", ring: "h-10 w-10", py: "py-20" },
  }
  const s = spinnerSizes[size]

  return (
    <div
      className={`flex flex-col items-center justify-center ${s.py} px-4`}
      role="status"
      aria-label="Carregando"
    >
      <div className="relative">
        <div className={`${s.ring} rounded-full border-2 border-surface-200/60 absolute inset-0`} />
        <Loader2
          className={`${s.icon} text-accent-blue`}
          style={{ animation: "spin 0.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite" }}
        />
      </div>
      <p className="text-sm text-text-muted mt-3 animate-fade-in">
        {message || "Carregando..."}
      </p>
      <span className="sr-only">Carregando...</span>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      ` }} />
    </div>
  )
}
