import { Scale } from "lucide-react"
import Link from "next/link"
import { generateComparisonExplanation } from "@/lib/comparison/structured-explanation"

interface ComparisonContextProps {
  product: { name: string; title: string; price: number; discount?: number; isFreeShipping?: boolean }
  alternative: { name: string; title: string; price: number; slug: string; discount?: number; isFreeShipping?: boolean }
  categorySlug: string
}

export default function ComparisonContext({ product, alternative, categorySlug }: ComparisonContextProps) {
  const explanation = generateComparisonExplanation(product, alternative, categorySlug)
  if (!explanation) return null

  const productExpl = explanation.products.find(p => p.name === product.name)
  const altExpl = explanation.products.find(p => p.name === alternative.name)

  const strengths = productExpl?.strengths?.slice(0, 2) || []
  const altStrengths = altExpl?.strengths?.slice(0, 2) || []

  if (strengths.length === 0 && altStrengths.length === 0) return null

  return (
    <div className="p-4 rounded-xl bg-surface-50 border border-surface-200" data-track-block="comparison-context">
      <div className="flex items-center gap-2 mb-3">
        <Scale className="w-4 h-4 text-brand-500" />
        <h3 className="text-sm font-semibold text-text-primary">vs {alternative.name}</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        {strengths.length > 0 && (
          <div>
            <p className="font-medium text-accent-green mb-1">Vantagens deste</p>
            <ul className="space-y-0.5 text-text-secondary">
              {strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="text-accent-green mt-0.5">+</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {altStrengths.length > 0 && (
          <div>
            <p className="font-medium text-accent-blue mb-1">Vantagens de {alternative.name.split(" ").slice(0, 3).join(" ")}</p>
            <ul className="space-y-0.5 text-text-secondary">
              {altStrengths.map((s, i) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="text-accent-blue mt-0.5">+</span> {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {explanation.bestBuy && (
        <p className="mt-2 text-[11px] text-text-muted">
          Melhor compra hoje: <span className="font-medium text-text-secondary">{explanation.bestBuy.productName}</span> — {explanation.bestBuy.reason}
        </p>
      )}

      <Link
        href={`/comparar/${product.name.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}-vs-${alternative.name.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}`}
        className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-brand-500 hover:text-brand-600"
      >
        Ver comparacao completa →
      </Link>
    </div>
  )
}
