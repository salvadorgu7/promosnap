import prisma from "@/lib/db/prisma"
import {
  PRIORITY_CATEGORIES,
  getCategoryDensity,
  type CategoryTier,
} from "@/lib/catalog/density"
import {
  Package,
  Target,
  TrendingUp,
  ArrowRight,
  Layers,
  AlertTriangle,
} from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

// ─── Helpers ────────────────────────────────────────────────────────────────

function tierBadge(tier: CategoryTier) {
  const map: Record<CategoryTier, { label: string; cls: string }> = {
    dense: { label: "Dense", cls: "bg-green-100 text-green-800" },
    promising: { label: "Promising", cls: "bg-blue-100 text-blue-800" },
    sparse: { label: "Sparse", cls: "bg-orange-100 text-orange-800" },
    ignore: { label: "Ignore", cls: "bg-gray-100 text-gray-500" },
  }
  const t = map[tier]
  return (
    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${t.cls}`}>
      {t.label}
    </span>
  )
}

function densityColor(pct: number): string {
  if (pct < 25) return "bg-red-500"
  if (pct < 50) return "bg-orange-400"
  if (pct < 75) return "bg-yellow-400"
  return "bg-green-500"
}

function densityTextColor(pct: number): string {
  if (pct < 25) return "text-red-600"
  if (pct < 50) return "text-orange-500"
  if (pct < 75) return "text-yellow-600"
  return "text-green-600"
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function SupplyCommandCenter() {
  // Fetch density data for all priority categories in parallel
  const densities = await Promise.all(
    PRIORITY_CATEGORIES.map(async (cat) => {
      const density = await getCategoryDensity(cat.slug)
      return { config: cat, density }
    })
  )

  // Compute global totals
  let totalProducts = 0
  let totalActiveOffers = 0
  let totalTarget = 0

  for (const { config, density } of densities) {
    totalProducts += density?.current.totalProducts ?? 0
    totalActiveOffers += density?.current.withActiveOffers ?? 0
    totalTarget += config.target
  }

  const overallDensity =
    totalTarget > 0 ? Math.round((totalProducts / totalTarget) * 100) : 0

  // Sort by density ascending (emptiest first = most urgent)
  const sorted = [...densities].sort((a, b) => {
    const dA = a.density?.readiness.densityScore ?? 0
    const dB = b.density?.readiness.densityScore ?? 0
    return dA - dB
  })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
          <Layers className="w-5 h-5 text-accent-orange" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary">
            Supply Command Center
          </h1>
          <p className="text-sm text-text-muted">
            Visao operacional do catalogo — preencha as lacunas, aumente a densidade
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-accent-blue" />
            <span className="text-xs text-text-muted">Produtos Totais</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">
            {totalProducts.toLocaleString("pt-BR")}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-accent-green" />
            <span className="text-xs text-text-muted">Ofertas Ativas</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">
            {totalActiveOffers.toLocaleString("pt-BR")}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-accent-purple" />
            <span className="text-xs text-text-muted">Categorias</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">
            {PRIORITY_CATEGORIES.length}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Layers className={`w-4 h-4 ${densityTextColor(overallDensity)}`} />
            <span className="text-xs text-text-muted">Densidade Geral</span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className={`text-2xl font-bold font-display ${densityTextColor(overallDensity)}`}>
              {overallDensity}%
            </p>
            <span className="text-xs text-text-muted">
              ({totalProducts} / {totalTarget})
            </span>
          </div>
        </div>
      </div>

      {/* Category rows */}
      <div className="space-y-4">
        {sorted.map(({ config, density }) => {
          const current = density?.current.totalProducts ?? 0
          const target = config.target
          const pct = target > 0 ? Math.round((current / target) * 100) : 0
          const clampedPct = Math.min(pct, 100)
          const commercial = density?.readiness.commercialScore ?? 0
          const tier = config.tier

          return (
            <div
              key={config.slug}
              className="bg-white rounded-xl border border-surface-200 p-5"
            >
              {/* Top row: name + tier + scores */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <h2 className="text-base font-bold font-display text-text-primary">
                    {config.name}
                  </h2>
                  {tierBadge(tier)}
                </div>

                <div className="flex items-center gap-5 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-text-muted" />
                    <span className="text-text-secondary">
                      Densidade:{" "}
                      <span className={`font-bold ${densityTextColor(pct)}`}>
                        {pct}%
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-text-muted" />
                    <span className="text-text-secondary">
                      Comercial:{" "}
                      <span className="font-bold text-text-primary">
                        {commercial}
                      </span>
                    </span>
                  </div>
                  {pct < 50 && (
                    <div className="flex items-center gap-1 text-orange-500">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span className="text-xs font-semibold">Urgente</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-text-muted mb-1">
                  <span>
                    {current} / {target} produtos
                  </span>
                  <span>{clampedPct}%</span>
                </div>
                <div className="h-2.5 bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${densityColor(pct)}`}
                    style={{ width: `${clampedPct}%` }}
                  />
                </div>
              </div>

              {/* Anchor queries — next actions */}
              <div>
                <p className="text-xs font-semibold text-text-secondary mb-2">
                  Proximas acoes — queries de ancoragem:
                </p>
                <div className="flex flex-wrap gap-2">
                  {config.anchorQueries.slice(0, 6).map((q) => (
                    <Link
                      key={q}
                      href={`/admin/ingestao?q=${encodeURIComponent(q)}`}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg
                        bg-surface-50 border border-surface-200 text-text-secondary
                        hover:bg-brand-50 hover:border-brand-300 hover:text-brand-600
                        transition-colors"
                    >
                      <Package className="w-3 h-3" />
                      {q}
                      <ArrowRight className="w-3 h-3 opacity-50" />
                    </Link>
                  ))}
                  {config.anchorQueries.length > 6 && (
                    <span className="text-[10px] text-text-muted self-center">
                      +{config.anchorQueries.length - 6} mais
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
