"use client"

import { useState, useEffect } from "react"
import { Smartphone, Laptop, Headphones, Tv, Gamepad2, Home, Sparkles, X } from "lucide-react"

const CATEGORIES = [
  { slug: "celulares", label: "Celulares", icon: Smartphone },
  { slug: "notebooks", label: "Notebooks", icon: Laptop },
  { slug: "audio", label: "Fones", icon: Headphones },
  { slug: "smart-tvs", label: "TVs", icon: Tv },
  { slug: "gamer", label: "Games", icon: Gamepad2 },
  { slug: "casa", label: "Casa", icon: Home },
]

/**
 * First-visit onboarding — asks user what categories they're interested in.
 * Saves to localStorage for personalization. Shows only once.
 */
export default function OnboardingWizard() {
  const [show, setShow] = useState(false)
  const [selected, setSelected] = useState<string[]>([])

  useEffect(() => {
    if (localStorage.getItem("ps_onboarded")) return
    // Show after 2 second delay on first visit
    const timer = setTimeout(() => setShow(true), 2000)
    return () => clearTimeout(timer)
  }, [])

  const handleComplete = () => {
    localStorage.setItem("ps_onboarded", "true")
    localStorage.setItem("ps_interests", JSON.stringify(selected))
    setShow(false)
  }

  const handleSkip = () => {
    localStorage.setItem("ps_onboarded", "true")
    setShow(false)
  }

  const toggleCategory = (slug: string) => {
    setSelected(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    )
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in zoom-in-95">
        <button
          onClick={handleSkip}
          className="absolute top-3 right-3 text-surface-400 hover:text-text-primary"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-brand-600" />
          </div>
          <h2 className="text-lg font-bold text-text-primary">Bem-vindo ao PromoSnap!</h2>
          <p className="text-sm text-text-muted mt-1">
            O que você está buscando? Vamos personalizar sua experiência.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5">
          {CATEGORIES.map(({ slug, label, icon: Icon }) => (
            <button
              key={slug}
              onClick={() => toggleCategory(slug)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                selected.includes(slug)
                  ? "border-brand-500 bg-brand-50 text-brand-600"
                  : "border-surface-200 text-text-muted hover:border-brand-300"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleComplete}
          className="w-full py-3 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 transition-colors"
        >
          {selected.length > 0 ? `Personalizar (${selected.length})` : "Explorar tudo"}
        </button>

        <button
          onClick={handleSkip}
          className="w-full text-center text-xs text-text-muted mt-2 py-2 hover:text-text-secondary"
        >
          Pular
        </button>
      </div>
    </div>
  )
}
