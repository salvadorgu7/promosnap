"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Bell, TrendingDown, Sparkles, Mail } from "lucide-react"

export default function ExitIntentCapture() {
  const [show, setShow] = useState(false)
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleShow = useCallback(() => {
    // Check limits
    const sessionShown = sessionStorage.getItem("ps:exit-shown")
    if (sessionShown) return

    const totalShown = parseInt(localStorage.getItem("ps:exit-total") || "0", 10)
    if (totalShown >= 3) return

    // Check if already subscribed
    const alreadySubscribed = localStorage.getItem("ps:subscribed")
    if (alreadySubscribed) return

    setShow(true)
    sessionStorage.setItem("ps:exit-shown", "1")
    localStorage.setItem("ps:exit-total", String(totalShown + 1))
  }, [])

  useEffect(() => {
    // Desktop: detect mouse leaving viewport
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) handleShow()
    }

    // Mobile: detect rapid scroll up (back-to-top gesture)
    let lastScrollY = 0
    let scrollUpCount = 0
    const handleScroll = () => {
      const currentY = window.scrollY
      if (currentY < lastScrollY && currentY > 300) {
        scrollUpCount++
        if (scrollUpCount >= 5) {
          handleShow()
          scrollUpCount = 0
        }
      } else {
        scrollUpCount = 0
      }
      lastScrollY = currentY
    }

    // Delay listeners to avoid triggering on page load
    const timer = setTimeout(() => {
      document.addEventListener("mouseleave", handleMouseLeave)
      window.addEventListener("scroll", handleScroll, { passive: true })
    }, 10000) // Wait 10s before enabling

    return () => {
      clearTimeout(timer)
      document.removeEventListener("mouseleave", handleMouseLeave)
      window.removeEventListener("scroll", handleScroll)
    }
  }, [handleShow])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes("@") || loading) return

    setLoading(true)
    try {
      await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "exit-intent" }),
      })
      setSubmitted(true)
      localStorage.setItem("ps:subscribed", "1")
      localStorage.setItem("ps:alert-email", email)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8">
        {/* Close button */}
        <button
          onClick={() => setShow(false)}
          className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-surface-100 text-text-muted"
        >
          <X className="w-4 h-4" />
        </button>

        {submitted ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-accent-green/10 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-7 h-7 text-accent-green" />
            </div>
            <h3 className="font-display text-lg font-bold text-text-primary mb-1">Pronto!</h3>
            <p className="text-sm text-text-secondary">Voce recebera alertas de queda de preco por email.</p>
            <button
              onClick={() => setShow(false)}
              className="mt-4 px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-bold hover:bg-brand-600 transition-colors"
            >
              Continuar navegando
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-brand-500/10 flex items-center justify-center mx-auto mb-3">
                <TrendingDown className="w-7 h-7 text-brand-500" />
              </div>
              <h3 className="font-display text-lg font-bold text-text-primary">
                Antes de sair...
              </h3>
              <p className="text-sm text-text-secondary mt-1">
                Quer ser avisado quando os precos cairem?
              </p>
            </div>

            {/* Benefits */}
            <div className="space-y-2 mb-5">
              {[
                { icon: Bell, text: "Alertas de queda de preco por email" },
                { icon: Mail, text: "Ofertas semanais personalizadas" },
                { icon: Sparkles, text: "Acesso ao assistente IA de compras" },
              ].map((b, i) => {
                const Icon = b.icon
                return (
                  <div key={i} className="flex items-center gap-2 text-sm text-text-secondary">
                    <Icon className="w-4 h-4 text-brand-500 flex-shrink-0" />
                    {b.text}
                  </div>
                )
              })}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Seu melhor email"
                className="flex-1 px-4 py-2.5 rounded-lg border border-surface-300 bg-surface-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-bold hover:bg-brand-600 transition-colors disabled:opacity-50 flex-shrink-0"
              >
                {loading ? "..." : "Sim!"}
              </button>
            </form>

            <p className="text-[10px] text-text-muted text-center mt-3">
              Sem spam. Cancelamento a qualquer momento.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
