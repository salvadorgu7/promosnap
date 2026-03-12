"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react"
import { useToast, type ToastVariant, type ToastItem } from "@/lib/toast/context"

const variantStyles: Record<ToastVariant, { bg: string; icon: typeof Info }> = {
  success: { bg: "bg-emerald-600", icon: CheckCircle2 },
  error: { bg: "bg-red-600", icon: XCircle },
  warning: { bg: "bg-amber-500", icon: AlertTriangle },
  info: { bg: "bg-accent-blue", icon: Info },
}

function ToastMessage({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [leaving, setLeaving] = useState(false)
  const { bg, icon: Icon } = variantStyles[toast.variant]

  useEffect(() => {
    const timer = setTimeout(() => setLeaving(true), 4500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${bg} ${
        leaving ? "toast-exit" : "toast-enter"
      }`}
      role="alert"
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={onDismiss}
        className="p-0.5 rounded hover:bg-white/20 transition-colors flex-shrink-0"
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
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <ToastMessage
          key={toast.id}
          toast={toast}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}
