"use client"

import { useState, useEffect } from "react"
import { Bell, Trash2, Plus, TrendingDown, Loader2, Search, Mail } from "lucide-react"
import { formatPrice } from "@/lib/utils"
import Link from "next/link"

interface Alert {
  id: string
  targetPrice: number
  isActive: boolean
  createdAt: string
  listing: {
    rawTitle: string
    imageUrl: string | null
    product: {
      slug: string
      name: string
    } | null
  }
}

interface Suggestion {
  productId: string
  productName: string
  productSlug: string
  imageUrl: string | null
  currentPrice: number
  suggestedTargetPrice: number
  reason: string
}

export default function AlertasPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Load saved email from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("ps:alert-email")
    if (saved) {
      setEmail(saved)
      loadAlerts(saved)
    }
  }, [])

  async function loadAlerts(e: string) {
    setLoading(true)
    try {
      const [alertsRes, suggestionsRes] = await Promise.all([
        fetch(`/api/alerts?email=${encodeURIComponent(e)}`),
        fetch(`/api/alerts/suggestions`),
      ])

      if (alertsRes.ok) {
        const data = await alertsRes.json()
        setAlerts(data.alerts ?? [])
      }
      if (suggestionsRes.ok) {
        const data = await suggestionsRes.json()
        setSuggestions(data.suggestions ?? [])
      }
      setSubmitted(true)
      localStorage.setItem("ps:alert-email", e)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  async function handleDeactivate(alertId: string) {
    setDeleting(alertId)
    try {
      await fetch(`/api/alerts?id=${alertId}`, { method: "DELETE" })
      setAlerts(prev => prev.filter(a => a.id !== alertId))
    } catch {
      // silent
    } finally {
      setDeleting(null)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (email.includes("@")) loadAlerts(email)
  }

  const activeAlerts = alerts.filter(a => a.isActive)
  const triggeredAlerts = alerts.filter(a => !a.isActive)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 text-brand-500 text-sm font-medium mb-3">
          <Bell className="w-4 h-4" />
          Alertas de Preço
        </div>
        <h1 className="font-display text-3xl font-bold text-text-primary">
          Meus Alertas
        </h1>
        <p className="text-text-secondary mt-2">
          Monitore preços e receba notificações quando atingir o valor desejado.
        </p>
      </div>

      {/* Email form */}
      {!submitted && (
        <form onSubmit={handleSubmit} className="flex gap-2 mb-8 max-w-md mx-auto">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Seu email"
            className="flex-1 px-4 py-2.5 rounded-lg border border-surface-300 bg-surface-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-bold hover:bg-brand-600 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ver Alertas"}
          </button>
        </form>
      )}

      {submitted && (
        <>
          {/* Active alerts */}
          <section className="mb-8">
            <h2 className="font-display font-bold text-lg text-text-primary mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-500" />
              Alertas Ativos ({activeAlerts.length})
            </h2>

            {activeAlerts.length === 0 ? (
              <div className="py-10 px-6 bg-surface-50 rounded-xl border border-surface-200">
                {/* Icon + Title */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand-500/10 mb-3">
                    <Bell className="w-6 h-6 text-brand-500" />
                  </div>
                  <p className="text-sm font-semibold text-text-primary">Nenhum alerta ativo</p>
                </div>

                {/* 3-step tutorial */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-center gap-4 sm:gap-8 mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-500/10 flex-shrink-0">
                      <Search className="w-4 h-4 text-brand-500" />
                    </div>
                    <p className="text-xs text-text-secondary">Encontre um produto que deseja</p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-500/10 flex-shrink-0">
                      <Bell className="w-4 h-4 text-brand-500" />
                    </div>
                    <p className="text-xs text-text-secondary">Defina o preço desejado na página do produto</p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-500/10 flex-shrink-0">
                      <Mail className="w-4 h-4 text-brand-500" />
                    </div>
                    <p className="text-xs text-text-secondary">Receba um email quando o preço baixar</p>
                  </div>
                </div>

                {/* CTA */}
                <div className="text-center">
                  <Link
                    href="/ofertas"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-bold hover:bg-brand-600 transition-colors"
                  >
                    Explorar ofertas
                  </Link>
                  <p className="text-xs text-text-muted mt-3">
                    Dica: nas páginas de produto, toque no ícone 🔔 para criar alertas rápidos.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {activeAlerts.map(alert => (
                  <div key={alert.id} className="flex items-center gap-3 p-3 rounded-lg border border-surface-200 bg-surface-50">
                    {alert.listing.imageUrl && (
                      <img
                        src={alert.listing.imageUrl}
                        alt=""
                        className="w-12 h-12 object-contain rounded bg-white flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/produto/${alert.listing.product?.slug ?? ''}`}
                        className="text-sm font-medium text-text-primary hover:text-brand-500 line-clamp-1"
                      >
                        {alert.listing.product?.name ?? alert.listing.rawTitle}
                      </Link>
                      <p className="text-xs text-text-muted">
                        Alerta quando ≤ <span className="font-bold text-accent-green">{formatPrice(alert.targetPrice)}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeactivate(alert.id)}
                      disabled={deleting === alert.id}
                      className="p-2 rounded-lg hover:bg-accent-red/10 text-text-muted hover:text-accent-red transition-colors"
                      title="Desativar alerta"
                    >
                      {deleting === alert.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Triggered alerts */}
          {triggeredAlerts.length > 0 && (
            <section className="mb-8">
              <h2 className="font-display font-bold text-lg text-text-primary mb-3 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-accent-green" />
                Alertas Disparados ({triggeredAlerts.length})
              </h2>
              <div className="space-y-2">
                {triggeredAlerts.slice(0, 5).map(alert => (
                  <div key={alert.id} className="flex items-center gap-3 p-3 rounded-lg border border-accent-green/20 bg-accent-green/5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary line-clamp-1">
                        {alert.listing.product?.name ?? alert.listing.rawTitle}
                      </p>
                      <p className="text-xs text-accent-green font-medium">
                        Preço atingiu {formatPrice(alert.targetPrice)} ✓
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <section className="mb-8">
              <h2 className="font-display font-bold text-lg text-text-primary mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4 text-brand-500" />
                Sugestoes de Alerta
              </h2>
              <div className="space-y-2">
                {suggestions.map(s => (
                  <Link
                    key={s.productId}
                    href={`/produto/${s.productSlug}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-surface-200 bg-surface-50 hover:bg-surface-100 transition-colors"
                  >
                    {s.imageUrl && (
                      <img src={s.imageUrl} alt="" className="w-12 h-12 object-contain rounded bg-white flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary line-clamp-1">{s.productName}</p>
                      <p className="text-xs text-text-muted">{s.reason}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-text-primary">{formatPrice(s.currentPrice)}</p>
                      <p className="text-[10px] text-accent-orange">Alerta: {formatPrice(s.suggestedTargetPrice)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Change email */}
          <div className="text-center">
            <button
              onClick={() => { setSubmitted(false); setAlerts([]); setSuggestions([]) }}
              className="text-sm text-text-muted hover:text-brand-500 transition-colors"
            >
              Trocar email
            </button>
          </div>
        </>
      )}
    </div>
  )
}
