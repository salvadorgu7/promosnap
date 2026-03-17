import { ExternalLink, ShoppingBag } from "lucide-react"

interface AmazonAlternativeProps {
  productName: string
  category?: string
}

export default function AmazonAlternative({ productName, category }: AmazonAlternativeProps) {
  const searchQuery = encodeURIComponent(productName)
  const amazonUrl = `https://www.amazon.com.br/s?k=${searchQuery}&tag=promosnap-20`

  return (
    <div className="rounded-xl border border-[#FF9900]/20 bg-gradient-to-r from-[#FF9900]/5 to-amber-50/50 p-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#FF9900]/10 flex items-center justify-center flex-shrink-0">
          <ShoppingBag className="w-4 h-4 text-[#FF9900]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary">
            Veja tambem na Amazon
          </p>
          <p className="text-[11px] text-text-muted mt-0.5">
            Compare preco e condicoes — compra por este link apoia o PromoSnap
          </p>
        </div>
        <a
          href={amazonUrl}
          target="_blank"
          rel="noopener noreferrer nofollow sponsored"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#FF9900] text-white text-xs font-semibold hover:bg-[#E8890A] transition-colors flex-shrink-0"
        >
          <ExternalLink className="w-3 h-3" />
          Buscar
        </a>
      </div>
    </div>
  )
}
