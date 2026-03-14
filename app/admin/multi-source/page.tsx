import { Prisma } from "@prisma/client"
import prisma from "@/lib/db/prisma"
import { Store, Package, Zap, Shield } from "lucide-react"
import { getAllSourceProfiles } from "@/lib/source/routing"
import { computeSourceTrust } from "@/lib/source/source-trust"

export const dynamic = "force-dynamic"

export default async function MultiSourcePage() {
  const profiles = getAllSourceProfiles()

  // Get source stats from DB
  let sourceStats: Array<{ slug: string; products: number; offers: number; activeOffers: number; lastSeen: string | null }> = []

  try {
    const stats = await prisma.$queryRaw<Array<{
      slug: string; products: bigint; offers: bigint; active_offers: bigint; last_seen: Date | null
    }>>(
      Prisma.sql`
        SELECT
          s."slug",
          COUNT(DISTINCT p.id) as products,
          COUNT(DISTINCT o.id) as offers,
          COUNT(DISTINCT o.id) FILTER (WHERE o."isActive" = true) as active_offers,
          MAX(o."lastSeenAt") as last_seen
        FROM "Source" s
        LEFT JOIN "Listing" l ON l."sourceId" = s.id
        LEFT JOIN "Product" p ON p.id = l."productId" AND p."status" = 'ACTIVE'
        LEFT JOIN "Offer" o ON o."listingId" = l.id
        GROUP BY s."slug"
        ORDER BY products DESC
      `
    )
    sourceStats = stats.map(s => ({
      slug: s.slug,
      products: Number(s.products),
      offers: Number(s.offers),
      activeOffers: Number(s.active_offers),
      lastSeen: s.last_seen?.toISOString() || null,
    }))
  } catch {
    // DB query failed — sourceStats stays empty
  }

  // Cross-source coverage: products with offers from multiple sources
  let crossSourceProducts = 0
  let totalProducts = 0
  try {
    const coverage = await prisma.$queryRaw<[{ total: bigint; multi: bigint }]>(
      Prisma.sql`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE source_count > 1) as multi
        FROM (
          SELECT p.id, COUNT(DISTINCT s."slug") as source_count
          FROM "Product" p
          JOIN "Listing" l ON l."productId" = p.id
          JOIN "Source" s ON s.id = l."sourceId"
          WHERE p."status" = 'ACTIVE'
          GROUP BY p.id
        ) sub
      `
    )
    totalProducts = Number(coverage[0]?.total || 0)
    crossSourceProducts = Number(coverage[0]?.multi || 0)
  } catch {
    // DB query failed — coverage stays at 0
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
          <Store className="w-5 h-5 text-brand-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary">Multi-Source</h1>
          <p className="text-sm text-text-muted">Status das fontes, cobertura e operações</p>
        </div>
      </div>

      {/* Coverage summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Store className="w-4 h-4 text-brand-500" />
            <span className="text-xs text-text-muted">Fontes configuradas</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">{profiles.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-accent-blue" />
            <span className="text-xs text-text-muted">Produtos ativos</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">{totalProducts}</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-accent-green" />
            <span className="text-xs text-text-muted">Cross-source</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">
            {crossSourceProducts}
            <span className="text-sm text-text-muted font-normal ml-1">
              ({totalProducts > 0 ? Math.round((crossSourceProducts / totalProducts) * 100) : 0}%)
            </span>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-accent-purple" />
            <span className="text-xs text-text-muted">Fontes com dados</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">
            {sourceStats.filter(s => s.products > 0).length} / {profiles.length}
          </p>
        </div>
      </div>

      {/* Source cards */}
      <div className="space-y-4 mb-8">
        {profiles.map(profile => {
          const stats = sourceStats.find(s => s.slug === profile.slug)
          const trust = computeSourceTrust(profile.slug)
          const hasData = stats && stats.products > 0

          return (
            <div key={profile.slug} className="bg-white rounded-xl border border-surface-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold font-display text-text-primary">{profile.name}</h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      hasData ? 'bg-green-50 text-accent-green' : 'bg-orange-50 text-accent-orange'
                    }`}>
                      {hasData ? 'Ativo' : 'Sem dados'}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      trust.trustLevel === 'high' ? 'bg-blue-50 text-accent-blue' :
                      trust.trustLevel === 'medium' ? 'bg-orange-50 text-accent-orange' :
                      'bg-red-50 text-accent-red'
                    }`}>
                      Confiança: {trust.overallTrust}%
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    <span>Qualidade: {Math.round(profile.quality * 100)}%</span>
                    <span>Revenue: {(profile.revenueRate * 100).toFixed(1)}%</span>
                    {profile.avgDeliveryDays && <span>Entrega: ~{profile.avgDeliveryDays}d</span>}
                    {profile.returnPolicy && <span>Devolução: {profile.returnPolicy}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold font-display text-text-primary">{stats?.products || 0}</p>
                  <p className="text-[10px] text-text-muted">produtos</p>
                </div>
              </div>

              {stats && (
                <div className="mt-3 flex items-center gap-6 text-xs text-text-muted">
                  <span>{stats.offers} ofertas totais</span>
                  <span>{stats.activeOffers} ofertas ativas</span>
                  {stats.lastSeen && (
                    <span>Última atualização: {new Date(stats.lastSeen).toLocaleDateString("pt-BR")}</span>
                  )}
                </div>
              )}

              {trust.badges.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {trust.badges.map(badge => (
                    <span key={badge} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-50 text-text-muted">
                      {badge}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Readiness summary */}
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <h2 className="text-lg font-bold font-display text-text-primary mb-4">Status Multi-Source</h2>
        <div className="space-y-2 text-sm text-text-secondary">
          <p>✅ Modelo de dados suporta múltiplas fontes (Source → Listing → Offer)</p>
          <p>✅ Source routing engine com modos: balanced, cheapest, revenue, trust-first</p>
          <p>✅ Cross-source comparison engine implementado</p>
          <p>✅ Source trust scoring por fonte</p>
          <p>✅ Import pipeline aceita qualquer sourceSlug</p>
          <p>✅ Clickout pipeline com affiliate params por fonte</p>
          <p className="pt-2 border-t border-surface-100">⚠️ Amazon: modo manual (PA-API pendente)</p>
          <p>⚠️ Shopee/Shein: sources configuradas mas sem adapter ativo</p>
          <p>⚠️ Cross-source coverage: {totalProducts > 0 ? Math.round((crossSourceProducts / totalProducts) * 100) : 0}% dos produtos</p>
          <p className="pt-2 border-t border-surface-100 font-medium text-text-primary">
            Próximo passo: ativar PA-API Amazon para aumentar cobertura cross-source
          </p>
        </div>
      </div>
    </div>
  )
}
