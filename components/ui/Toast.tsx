"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react"
import { useToast, type ToastVariant, type ToastItem } from "@/lib/toast/context"

const variantStyles: Record<ToastVariant, {
  bg: string
  border: string
  icon: typeof Info
  iconColor: string
  progressColor: string
}> = {
  success: {
    bg: "bg-emerald-600",
    border: "border-emerald-500/60",
    icon: CheckCircle2,
    iconColor: "text-emerald-200",
    progressColor: "rgba(167,243,208,0.4)",
  },
  error: {
    bg: "bg-red-600",
    border: "border-red-500/60",
    icon: XCircle,
    iconColor: "text-red-200",
    progressColor: "rgba(254,202,202,0.4)",
  },
  warning: {
    bg: "bg-amber-500",
    border: "border-amber-400/60",
    icon: AlertTriangle,
    iconColor: "text-amber-200",
    progressColor: "rgba(253,230,138,0.4)",
  },
  info: {
    bg: "bg-accent-blue",
    border: "border-blue-400/60",
    icon: Info,
    iconColor: "text-blue-200",
    progressColor: "rgba(191,219,254,0.4)",
  },
}

function ToastMessage({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [leaving, setLeaving] = useState(false)
  const { bg, border, icon: Icon, iconColor, progressColor } = variantStyles[toast.variant]

  useEffect(() => {
    const timer = setTimeout(() => setLeaving(true), 4500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-medium border overflow-hidden ${bg} ${border} ${
        leaving ? "toast-exit" : "toast-enter"
      }`}
      style={{
        boxShadow: "0 4px 12px rgba(0,0,0,0.15), 0 12px 36px rgba(0,0,0,0.1)",
        backdropFilter: "blur(8px)",
      }}
      role="alert"
    >
      <div className="flex-shrink-0">
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={onDismiss}
        className="p-1 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0"
        aria-label="Fechar"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      {/* Auto-dismiss progress bar */}
      <div
        className="absolute bottom-0 left-0 h-[2px] rounded-b-xl"
        style={{
          background: progressColor,
          animation: "toast-progress 5s linear forwards",
        }}
      />
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      ` }} />
    </div>
  )
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastMessage
            toast={toast}
            onDismiss={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  )
}
