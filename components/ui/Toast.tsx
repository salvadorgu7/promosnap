"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react"
import { useToast, type ToastVariant, type ToastItem } from "@/lib/toast/context"

const variantStyles: Record<ToastVariant, {
  bg: string
  border: string
  icon: typeof Info
  iconColor: string
}> = {
  success: {
    bg: "bg-emerald-600",
    border: "border-emerald-500",
    icon: CheckCircle2,
    iconColor: "text-emerald-200",
  },
  error: {
    bg: "bg-red-600",
    border: "border-red-500",
    icon: XCircle,
    iconColor: "text-red-200",
  },
  warning: {
    bg: "bg-amber-500",
    border: "border-amber-400",
    icon: AlertTriangle,
    iconColor: "text-amber-200",
  },
  info: {
    bg: "bg-accent-blue",
    border: "border-blue-400",
    icon: Info,
    iconColor: "text-blue-200",
  },
}

function ToastMessage({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [leaving, setLeaving] = useState(false)
  const { bg, border, icon: Icon, iconColor } = variantStyles[toast.variant]

  useEffect(() => {
    const timer = setTimeout(() => setLeaving(true), 4500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium border ${bg} ${border} backdrop-blur-sm ${
        leaving ? "toast-exit" : "toast-enter"
      }`}
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
