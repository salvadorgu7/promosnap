"use client"

import { useState } from "react"
import { Star, Send, Plus, X } from "lucide-react"

interface Props {
  productId: string
  productName: string
  onSubmitted?: () => void
}

export default function UserReviewForm({ productId, productName, onSubmitted }: Props) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [pros, setPros] = useState<string[]>([])
  const [cons, setCons] = useState<string[]>([])
  const [proInput, setProInput] = useState("")
  const [conInput, setConInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const addPro = () => {
    if (proInput.trim() && pros.length < 5) {
      setPros([...pros, proInput.trim()])
      setProInput("")
    }
  }
  const addCon = () => {
    if (conInput.trim() && cons.length < 5) {
      setCons([...cons, conInput.trim()])
      setConInput("")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0 || !name.trim()) return

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId, rating, title, content,
          pros, cons, authorName: name, authorEmail: email || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Erro ao enviar")
        return
      }

      setSuccess(true)
      onSubmitted?.()
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
        <p className="text-sm font-semibold text-emerald-700">Avaliação enviada!</p>
        <p className="text-xs text-emerald-600 mt-1">Será publicada após moderação.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 rounded-xl bg-surface-50 border border-surface-200">
      <h4 className="text-sm font-semibold text-text-primary">
        Avalie: {productName.slice(0, 50)}
      </h4>

      {/* Star rating */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            type="button"
            onClick={() => setRating(i)}
            onMouseEnter={() => setHoverRating(i)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-0.5"
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                i <= (hoverRating || rating)
                  ? "text-amber-400 fill-amber-400"
                  : "text-surface-300"
              }`}
            />
          </button>
        ))}
        <span className="text-xs text-text-muted ml-2">
          {rating > 0 ? ["", "Ruim", "Regular", "Bom", "Muito bom", "Excelente"][rating] : "Selecione"}
        </span>
      </div>

      {/* Name + Email */}
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="Seu nome *"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          maxLength={50}
          className="px-3 py-2 rounded-lg border border-surface-200 text-sm outline-none focus:border-brand-500"
        />
        <input
          type="email"
          placeholder="Email (opcional)"
          value={email}
          onChange={e => setEmail(e.target.value)}
          maxLength={100}
          className="px-3 py-2 rounded-lg border border-surface-200 text-sm outline-none focus:border-brand-500"
        />
      </div>

      {/* Title */}
      <input
        type="text"
        placeholder="Título da avaliação (opcional)"
        value={title}
        onChange={e => setTitle(e.target.value)}
        maxLength={100}
        className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm outline-none focus:border-brand-500"
      />

      {/* Content */}
      <textarea
        placeholder="Conte sua experiência com o produto..."
        value={content}
        onChange={e => setContent(e.target.value)}
        maxLength={1000}
        rows={3}
        className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm outline-none focus:border-brand-500 resize-none"
      />

      {/* Pros */}
      <div>
        <label className="text-xs font-medium text-emerald-600 mb-1 block">Pontos positivos</label>
        <div className="flex gap-1 flex-wrap mb-1">
          {pros.map((p, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
              {p}
              <button type="button" onClick={() => setPros(pros.filter((_, j) => j !== i))}><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
        {pros.length < 5 && (
          <div className="flex gap-1">
            <input
              type="text"
              placeholder="Ex: Bateria dura muito"
              value={proInput}
              onChange={e => setProInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addPro())}
              maxLength={100}
              className="flex-1 px-2 py-1.5 rounded-lg border border-surface-200 text-xs outline-none"
            />
            <button type="button" onClick={addPro} className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Cons */}
      <div>
        <label className="text-xs font-medium text-red-500 mb-1 block">Pontos negativos</label>
        <div className="flex gap-1 flex-wrap mb-1">
          {cons.map((c, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
              {c}
              <button type="button" onClick={() => setCons(cons.filter((_, j) => j !== i))}><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
        {cons.length < 5 && (
          <div className="flex gap-1">
            <input
              type="text"
              placeholder="Ex: Esquenta um pouco"
              value={conInput}
              onChange={e => setConInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCon())}
              maxLength={100}
              className="flex-1 px-2 py-1.5 rounded-lg border border-surface-200 text-xs outline-none"
            />
            <button type="button" onClick={addCon} className="p-1.5 rounded-lg bg-red-100 text-red-600">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading || rating === 0 || !name.trim()}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-40 transition-colors"
      >
        <Send className="w-4 h-4" />
        {loading ? "Enviando..." : "Enviar avaliação"}
      </button>
    </form>
  )
}
