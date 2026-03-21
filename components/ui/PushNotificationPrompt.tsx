"use client"

import { useState, useEffect } from "react"
import { Bell, X } from "lucide-react"

/**
 * Prompt to enable push notifications.
 * Shows after 3rd page view, can be dismissed.
 * Registers service worker and requests notification permission.
 */
export default function PushNotificationPrompt() {
  const [show, setShow] = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    // Check if push is supported and not already granted/denied
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return
    if (Notification.permission !== "default") return

    setSupported(true)

    // Show after 3 page views
    const key = "ps_page_views"
    const views = parseInt(localStorage.getItem(key) || "0") + 1
    localStorage.setItem(key, String(views))

    if (views >= 3 && !localStorage.getItem("ps_push_dismissed")) {
      setShow(true)
    }
  }, [])

  const handleEnable = async () => {
    try {
      // Register service worker
      const reg = await navigator.serviceWorker.register("/sw.js")
      // Request permission
      const permission = await Notification.requestPermission()
      if (permission === "granted") {
        localStorage.setItem("ps_push_enabled", "true")
      }
    } catch {
      // SW registration failed
    }
    setShow(false)
  }

  const handleDismiss = () => {
    localStorage.setItem("ps_push_dismissed", "true")
    setShow(false)
  }

  if (!show || !supported) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50 animate-in slide-in-from-bottom-4">
      <div className="bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-2xl shadow-xl p-4">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-surface-400 hover:text-text-primary"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-brand-600" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-text-primary">
              Alertas de preço no celular
            </h4>
            <p className="text-xs text-text-muted mt-1">
              Receba notificações quando o preço cair nos produtos que você acompanha.
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={handleEnable}
            className="flex-1 px-3 py-2 rounded-lg bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition-colors"
          >
            Ativar alertas
          </button>
          <button
            onClick={handleDismiss}
            className="px-3 py-2 rounded-lg text-xs text-text-muted hover:bg-surface-100 transition-colors"
          >
            Depois
          </button>
        </div>
      </div>
    </div>
  )
}
