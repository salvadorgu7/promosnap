"use client"

import { useState, useEffect } from "react"
import { Gift, Copy, Check, Share2, Users } from "lucide-react"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.promosnap.com.br"

/**
 * Referral Program — generates unique referral link, tracks shares.
 * Uses localStorage for link persistence (no auth required).
 */
export default function ReferralProgram() {
  const [code, setCode] = useState("")
  const [copied, setCopied] = useState(false)
  const [shares, setShares] = useState(0)

  useEffect(() => {
    let existing = localStorage.getItem("ps_referral_code")
    if (!existing) {
      existing = generateCode()
      localStorage.setItem("ps_referral_code", existing)
    }
    setCode(existing)
    setShares(parseInt(localStorage.getItem("ps_referral_shares") || "0"))
  }, [])

  const referralUrl = `${APP_URL}/?ref=${code}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)

    const newShares = shares + 1
    setShares(newShares)
    localStorage.setItem("ps_referral_shares", String(newShares))
  }

  const handleWhatsAppShare = () => {
    const text = `🔥 Descobri o PromoSnap — compara preços entre Amazon, ML, Shopee e Shein automaticamente!\n\nVeja: ${referralUrl}`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank")

    const newShares = shares + 1
    setShares(newShares)
    localStorage.setItem("ps_referral_shares", String(newShares))
  }

  if (!code) return null

  return (
    <div className="bg-gradient-to-br from-brand-50 to-purple-50 border border-brand-200 rounded-2xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
          <Gift className="w-5 h-5 text-brand-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-text-primary">Indique o PromoSnap</h3>
          <p className="text-xs text-text-muted">Compartilhe e ajude amigos a economizar</p>
        </div>
      </div>

      {/* Referral link */}
      <div className="flex items-center gap-2 bg-white rounded-lg border border-surface-200 p-2 mb-3">
        <input
          type="text"
          value={referralUrl}
          readOnly
          className="flex-1 text-xs text-text-secondary bg-transparent outline-none truncate"
        />
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copiado!" : "Copiar"}
        </button>
      </div>

      {/* Share buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleWhatsAppShare}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#25D366] text-white text-xs font-semibold hover:bg-[#20BD5A] transition-colors"
        >
          <Share2 className="w-3 h-3" />
          WhatsApp
        </button>
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-surface-100 text-text-secondary text-xs font-semibold hover:bg-surface-200 transition-colors"
        >
          <Copy className="w-3 h-3" />
          Copiar link
        </button>
      </div>

      {/* Stats */}
      {shares > 0 && (
        <div className="flex items-center gap-2 mt-3 text-xs text-text-muted">
          <Users className="w-3.5 h-3.5" />
          <span>Você compartilhou {shares}x</span>
        </div>
      )}
    </div>
  )
}

function generateCode(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}
