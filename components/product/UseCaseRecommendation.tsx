import { Target } from "lucide-react"
import { getCategoryConfig, extractAttributes } from "@/lib/comparison/category-specs"

interface UseCaseRecommendationProps {
  productName: string
  productTitle: string
  categorySlug?: string
  specsJson?: Record<string, unknown> | null
}

interface UseCaseScore {
  slug: string
  label: string
  score: number // 0-100
}

function scoreProductForUseCases(
  title: string,
  specsJson: Record<string, unknown> | null,
  categorySlug: string
): UseCaseScore[] {
  const config = getCategoryConfig(categorySlug)
  if (!config) return []

  const attrs = extractAttributes(title, specsJson, categorySlug)
  if (attrs.length === 0) return []

  // Normalize attribute values (0-1) against typical ranges
  const attrMap = new Map(attrs.map(a => [a.key, typeof a.value === 'number' ? a.value : parseFloat(String(a.value)) || 0]))

  return config.useCases.map(uc => {
    let weightedSum = 0
    let totalWeight = 0

    for (const attr of config.attributes) {
      const val = attrMap.get(attr.key)
      if (val == null) continue

      const weight = uc.weights[attr.key] ?? attr.baseWeight
      // Normalize against typical max values per attribute
      const MAX_VALUES: Record<string, number> = {
        camera: 200, battery: 6000, storage: 512, ram: 16,
        screen: 6.7, ssd: 2048, weight: 3, processor: 100,
        refresh: 240, resolution: 8, driver: 50, anc: 1,
      }
      const maxVal = MAX_VALUES[attr.key] ?? 100
      const normalized = Math.min(val / maxVal, 1)
      weightedSum += normalized * weight
      totalWeight += weight
    }

    const score = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0
    return { slug: uc.slug, label: uc.label, score }
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score)
}

export default function UseCaseRecommendation({
  productName,
  productTitle,
  categorySlug,
  specsJson,
}: UseCaseRecommendationProps) {
  if (!categorySlug) return null

  const scores = scoreProductForUseCases(productTitle || productName, specsJson as Record<string, unknown> | null, categorySlug)
  if (scores.length === 0) return null

  const best = scores[0]
  const worst = scores[scores.length - 1]

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-brand-50/50 border border-brand-500/10" data-track-block="use-case">
      <Target className="w-4 h-4 text-brand-500 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text-primary">Melhor para</p>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {scores.slice(0, 3).map(s => (
            <span
              key={s.slug}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                s.score >= 70
                  ? "bg-accent-green/10 text-accent-green border border-accent-green/20"
                  : s.score >= 40
                  ? "bg-accent-blue/10 text-accent-blue border border-accent-blue/20"
                  : "bg-surface-100 text-text-muted border border-surface-200"
              }`}
            >
              {s.label}
              <span className="text-[10px] opacity-70">{s.score}/100</span>
            </span>
          ))}
        </div>
        {worst && worst.score < 30 && scores.length > 1 && (
          <p className="text-[10px] text-text-muted mt-1">
            Menos indicado para {worst.label.toLowerCase()}
          </p>
        )}
      </div>
    </div>
  )
}
