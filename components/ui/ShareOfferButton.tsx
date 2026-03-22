"use client"

import { useState, useRef, useEffect } from "react"
import { Share2, Link2, Check, X, Send } from "lucide-react"
import { formatPrice } from "@/lib/utils"
import { analytics } from "@/lib/analytics/events"

interface ShareOfferButtonProps {
  productName: string
  productSlug: string
  productId?: string
  price: number
  originalPrice?: number | null
  discount?: number | null
  sourceName: string
  /** "sm" for card overlay, "md" for inline */
  size?: "sm" | "md"
  /** Show only WhatsApp icon (no dropdown) */
  whatsappOnly?: boolean
}

/**
 * Botao de compartilhamento com WhatsApp como canal principal.
 * Mostra dropdown com: WhatsApp, Telegram, Copiar Link.
 * Em mobile, usa Web Share API como fallback.
 */
export default function ShareOfferButton({
  productName,
  productSlug,
  productId,
  price,
  originalPrice,
  discount,
  sourceName,
  size = "sm",
  whatsappOnly = false,
}: ShareOfferButtonProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.promosnap.com.br"
  const productUrl = `${appUrl}/produto/${productSlug}?utm_source=share&utm_medium=social`

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const trackShare = (method: string) => {
    analytics.shareClick({
      contentType: "offer",
      contentId: productId || productSlug,
      method,
    })
  }

  // Texto formatado para compartilhamento
  const shareText = [
    `🔥 ${productName}`,
    `💰 ${formatPrice(price)}${discount && discount > 0 ? ` (-${discount}%)` : ""}`,
    originalPrice && originalPrice > price ? `De: ~${formatPrice(originalPrice)}~` : null,
    `📦 ${sourceName}`,
    ``,
    `👉 ${productUrl}`,
  ].filter(Boolean).join("\n")

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(productUrl)}&text=${encodeURIComponent(shareText)}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(productUrl)
    } catch {
      const input = document.createElement("input")
      input.value = productUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand("copy")
      document.body.removeChild(input)
    }
    setCopied(true)
    trackShare("copy_link")
    setTimeout(() => { setCopied(false); setOpen(false) }, 1500)
  }

  // WhatsApp direto (sem dropdown)
  if (whatsappOnly) {
    return (
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackShare("whatsapp")}
        aria-label="Compartilhar no WhatsApp"
        className={`inline-flex items-center justify-center rounded-lg transition-all ${
          size === "sm"
            ? "w-7 h-7 bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366]"
            : "gap-2 px-3 py-2 bg-[#25D366] hover:bg-[#20BD5A] text-white text-sm font-medium"
        }`}
      >
        <WhatsAppIcon className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
        {size === "md" && <span>Compartilhar</span>}
      </a>
    )
  }

  // Dropdown com multiplas opcoes
  const handleClick = async () => {
    // Em mobile, usar Web Share API se disponivel
    if (typeof navigator !== "undefined" && navigator.share && "ontouchstart" in window) {
      try {
        await navigator.share({
          title: productName,
          text: `${productName} por ${formatPrice(price)}${discount ? ` (-${discount}%)` : ""} no ${sourceName}`,
          url: productUrl,
        })
        trackShare("native_share")
        return
      } catch {
        // Cancelado ou sem suporte — abre dropdown
      }
    }
    setOpen(!open)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleClick}
        aria-label="Compartilhar"
        className={`inline-flex items-center justify-center rounded-lg border transition-all ${
          size === "sm"
            ? "w-7 h-7 bg-white/90 backdrop-blur-sm border-surface-200 text-text-muted hover:text-[#25D366] hover:border-[#25D366]/30 hover:bg-[#25D366]/5"
            : "gap-1.5 px-3 py-2 bg-surface-50 border-surface-200 text-text-secondary hover:text-[#25D366] hover:border-[#25D366]/30 text-sm"
        }`}
      >
        <Share2 className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
        {size === "md" && <span>Enviar</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-white rounded-xl shadow-lg border border-surface-200 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-surface-100">
            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Compartilhar</span>
            <button onClick={() => setOpen(false)} className="p-0.5 rounded hover:bg-surface-100">
              <X className="w-3 h-3 text-text-muted" />
            </button>
          </div>

          {/* WhatsApp — destaque principal */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => { trackShare("whatsapp"); setOpen(false) }}
            className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#25D366]/5 transition-colors group"
          >
            <span className="w-8 h-8 rounded-lg bg-[#25D366] flex items-center justify-center">
              <WhatsAppIcon className="w-4.5 h-4.5 text-white" />
            </span>
            <div>
              <span className="text-sm font-semibold text-text-primary group-hover:text-[#25D366]">WhatsApp</span>
              <span className="block text-[10px] text-text-muted">Enviar para contato ou grupo</span>
            </div>
          </a>

          {/* Telegram */}
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => { trackShare("telegram"); setOpen(false) }}
            className="flex items-center gap-2.5 px-3 py-2 hover:bg-blue-50 transition-colors group"
          >
            <span className="w-8 h-8 rounded-lg bg-[#0088cc]/10 flex items-center justify-center">
              <Send className="w-4 h-4 text-[#0088cc]" />
            </span>
            <span className="text-sm font-medium text-text-primary group-hover:text-[#0088cc]">Telegram</span>
          </a>

          {/* Copiar link */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-2.5 px-3 py-2 w-full hover:bg-surface-50 transition-colors group"
          >
            <span className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center">
              {copied ? (
                <Check className="w-4 h-4 text-accent-green" />
              ) : (
                <Link2 className="w-4 h-4 text-text-secondary" />
              )}
            </span>
            <span className={`text-sm font-medium ${copied ? "text-accent-green" : "text-text-primary group-hover:text-text-secondary"}`}>
              {copied ? "Link copiado!" : "Copiar link"}
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

// SVG do WhatsApp (mais reconhecivel que icone generico)
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}
