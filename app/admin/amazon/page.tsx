import { ShoppingBag, Check, X, ArrowRight, Zap, Link2, Search, ExternalLink, RefreshCw, Database } from "lucide-react"
import { checkAmazonReadiness, getActiveCampaigns, detectAmazonApiPath } from "@/lib/amazon/strategy"
import { adapterRegistry } from "@/lib/adapters/registry"
import prisma from "@/lib/db/prisma"

export const dynamic = "force-dynamic"

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
      ok ? "bg-green-50 text-accent-green" : "bg-red-50 text-accent-red"
    }`}>
      {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {label}
    </span>
  )
}

export default async function AmazonAdminPage() {
  const readiness = checkAmazonReadiness()
  const apiStatus = detectAmazonApiPath()
  const campaigns = getActiveCampaigns()

  // Live DB metrics for Amazon
  const amazonAdapter = adapterRegistry.get('amazon-br')
  const adapterStatus = amazonAdapter?.getStatus()
  const capTruth = amazonAdapter?.getCapabilityTruth?.()
  const healthCheck = amazonAdapter?.healthCheck?.()

  const [amazonListings, amazonOffers, amazonProducts] = await Promise.all([
    prisma.listing.count({
      where: { source: { slug: 'amazon-br' }, status: 'ACTIVE' },
    }).catch(() => 0),
    prisma.offer.count({
      where: { listing: { source: { slug: 'amazon-br' } }, isActive: true },
    }).catch(() => 0),
    prisma.$queryRaw<Array<{ cnt: bigint }>>`
      SELECT COUNT(DISTINCT l."productId") AS cnt
      FROM "listings" l
      JOIN "sources" s ON l."sourceId" = s."id"
      WHERE s."slug" = 'amazon-br' AND l."status" = 'ACTIVE' AND l."productId" IS NOT NULL
    `.then(r => Number(r[0]?.cnt ?? 0)).catch(() => 0),
  ])

  const levelLabels: Record<string, { text: string; color: string }> = {
    "not-configured": { text: "Não Configurado", color: "bg-red-50 text-red-700 border-red-200" },
    "affiliate-only": { text: "Affiliate Only", color: "bg-amber-50 text-amber-700 border-amber-200" },
    "api-partial": { text: "API Parcial", color: "bg-blue-50 text-blue-700 border-blue-200" },
    "api-full": { text: "Integração Completa", color: "bg-green-50 text-green-700 border-green-200" },
  }

  const levelInfo = levelLabels[readiness.level] || levelLabels["not-configured"]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#FF9900]/10 flex items-center justify-center">
          <ShoppingBag className="w-5 h-5 text-[#FF9900]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary">Amazon</h1>
          <p className="text-sm text-text-muted">Integração, tracking e status operacional</p>
        </div>
        <div className="ml-auto">
          <span className={`text-sm font-semibold px-3 py-1.5 rounded-lg border ${levelInfo.color}`}>
            {levelInfo.text}
          </span>
        </div>
      </div>

      {/* Tracking Tag */}
      <div className="bg-white rounded-xl border border-surface-200 p-6 mb-6">
        <h2 className="text-lg font-bold font-display text-text-primary mb-1">Tracking Tag</h2>
        <p className="text-xs text-text-muted mb-4">
          Identificador de afiliado usado em todos os links Amazon — gera comissão para o PromoSnap
        </p>
        <div className="flex items-center gap-3 p-4 rounded-lg bg-surface-50">
          <Link2 className="w-5 h-5 text-[#FF9900] flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">
              tag={" "}
              <span className="font-mono font-bold text-[#FF9900]">{readiness.affiliateTag.value || "—"}</span>
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">
              {readiness.affiliateTag.ok
                ? "Ativo — clickouts Amazon usam esta tag para atribuição de comissão"
                : "NÃO configurado — clickouts Amazon não geram comissão"}
            </p>
          </div>
          <StatusBadge ok={readiness.affiliateTag.ok} label={readiness.affiliateTag.ok ? "Ativo" : "Ausente"} />
        </div>
        <p className="text-[10px] text-text-muted mt-2 ml-1">
          Importante: promosnap-20 é uma tag de afiliado, NÃO um cupom de desconto. O usuário não recebe desconto — o PromoSnap recebe comissão.
        </p>
      </div>

      {/* API Path Detection */}
      <div className="bg-white rounded-xl border border-surface-200 p-6 mb-6">
        <h2 className="text-lg font-bold font-display text-text-primary mb-1">Caminhos Oficiais</h2>
        <p className="text-xs text-text-muted mb-4">
          Qual API Amazon está disponível para esta conta
        </p>
        <div className="space-y-3">
          {/* Creators API */}
          <div className={`p-4 rounded-lg border ${apiStatus.path === "creators" ? "border-green-200 bg-green-50/50" : "border-surface-100 bg-surface-50"}`}>
            <div className="flex items-center gap-3">
              <Zap className={`w-4 h-4 flex-shrink-0 ${apiStatus.path === "creators" ? "text-accent-green" : "text-surface-400"}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">Creators API</p>
                <p className="text-[11px] text-text-muted">Caminho recomendado — programa mais recente para content creators</p>
              </div>
              <StatusBadge ok={apiStatus.creatorsApi.configured} label={apiStatus.creatorsApi.configured ? "Configurada" : "Pendente"} />
            </div>
            {!apiStatus.creatorsApi.configured && (
              <p className="text-[10px] text-text-muted mt-2 ml-7">
                Env vars necessárias: {apiStatus.creatorsApi.envVars.join(", ")}
              </p>
            )}
          </div>

          {/* PA-API */}
          <div className={`p-4 rounded-lg border ${apiStatus.path === "pa-api" ? "border-blue-200 bg-blue-50/50" : "border-surface-100 bg-surface-50"}`}>
            <div className="flex items-center gap-3">
              <Search className={`w-4 h-4 flex-shrink-0 ${apiStatus.path === "pa-api" ? "text-accent-blue" : "text-surface-400"}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">PA-API 5.0</p>
                <p className="text-[11px] text-text-muted">API clássica de Product Advertising — ponte temporária</p>
              </div>
              <StatusBadge ok={apiStatus.paApi.configured} label={apiStatus.paApi.configured ? "Configurada" : "Pendente"} />
            </div>
            {!apiStatus.paApi.configured && (
              <p className="text-[10px] text-text-muted mt-2 ml-7">
                Env vars necessárias: {apiStatus.paApi.envVars.join(", ")}
              </p>
            )}
          </div>

          {/* Associates Only */}
          <div className={`p-4 rounded-lg border ${apiStatus.path === "associates-only" ? "border-amber-200 bg-amber-50/50" : "border-surface-100 bg-surface-50"}`}>
            <div className="flex items-center gap-3">
              <Link2 className={`w-4 h-4 flex-shrink-0 ${apiStatus.path === "associates-only" ? "text-amber-500" : "text-surface-400"}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">Associates Only (Manual)</p>
                <p className="text-[11px] text-text-muted">Links de afiliado sem API — funciona agora</p>
              </div>
              <StatusBadge ok={readiness.affiliateTag.ok} label={readiness.affiliateTag.ok ? "Funcional" : "Sem tag"} />
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 rounded-lg bg-surface-50 border border-surface-100">
          <p className="text-xs text-text-secondary">
            <span className="font-semibold">Caminho detectado:</span> {apiStatus.description}
          </p>
        </div>
      </div>

      {/* Live Metrics */}
      <div className="bg-white rounded-xl border border-surface-200 p-6 mb-6">
        <h2 className="text-lg font-bold font-display text-text-primary mb-1 flex items-center gap-2">
          <Database className="w-4 h-4 text-[#FF9900]" />
          Métricas Live Amazon
        </h2>
        <p className="text-xs text-text-muted mb-4">Dados reais do banco de dados</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-surface-50 text-center">
            <p className="text-2xl font-bold text-text-primary">{amazonProducts}</p>
            <p className="text-xs text-text-muted mt-1">Produtos Canônicos</p>
          </div>
          <div className="p-4 rounded-lg bg-surface-50 text-center">
            <p className="text-2xl font-bold text-text-primary">{amazonListings}</p>
            <p className="text-xs text-text-muted mt-1">Listings Activos</p>
          </div>
          <div className="p-4 rounded-lg bg-surface-50 text-center">
            <p className="text-2xl font-bold text-text-primary">{amazonOffers}</p>
            <p className="text-xs text-text-muted mt-1">Ofertas Activas</p>
          </div>
        </div>
        {adapterStatus && (
          <div className="mt-4 flex items-center gap-3 p-3 rounded-lg border border-surface-100">
            <span className={`inline-block w-2 h-2 rounded-full ${adapterStatus.health === 'READY' ? 'bg-green-500' : adapterStatus.health === 'MOCK' ? 'bg-amber-500' : 'bg-red-500'}`} />
            <span className="text-sm text-text-secondary flex-1">{adapterStatus.message}</span>
            <span className="text-xs font-mono text-text-muted">{capTruth?.status ?? 'unknown'}</span>
          </div>
        )}
      </div>

      {/* Import Methods */}
      <div className="bg-white rounded-xl border border-surface-200 p-6 mb-6">
        <h2 className="text-base font-bold font-display text-text-primary mb-1 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-accent-blue" />
          Importar Produtos Amazon
        </h2>
        <p className="text-xs text-text-muted mb-4">
          PA-API indisponível para cadastro / Creators API requer 3 vendas — usar import manual
        </p>
        <div className="space-y-3">
          <a
            href="/admin/ingestao"
            className="block p-4 rounded-lg bg-[#FF9900]/5 border border-[#FF9900]/20 hover:bg-[#FF9900]/10 transition-colors"
          >
            <p className="text-sm font-medium text-text-primary flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#FF9900]" />
              Ingestão Manual → Aba Amazon
            </p>
            <p className="text-xs text-text-muted mt-1">
              Cole URLs Amazon + título + preço. ASIN é extraído automaticamente. Merge canónico com ML.
            </p>
          </a>
          <div className="p-4 rounded-lg bg-surface-50 border border-surface-100">
            <p className="text-sm text-text-secondary mb-2">Ou via API:</p>
            <code className="block text-xs font-mono bg-surface-100 p-3 rounded-lg text-text-primary overflow-x-auto">
              POST /api/admin/ingest-amazon {`{ "products": [{ "url": "...", "title": "...", "price": 1999 }] }`}
            </code>
          </div>
        </div>
      </div>

      {/* What Works NOW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <h2 className="text-base font-bold font-display text-text-primary mb-3 flex items-center gap-2">
            <Check className="w-4 h-4 text-accent-green" />
            Funciona Agora
          </h2>
          <div className="space-y-2">
            {[
              "Clickout com tag de afiliado (tag=promosnap-20)",
              "Attribution no pipeline de clickout",
              "Import automático via syncFeed() + runImportPipeline()",
              "Merge canónico Amazon↔ML (mesmo produto, múltiplas ofertas)",
              "Refresh de preços via update-prices cron job",
              "Discovery automática via discover-import cron job",
              "Comparação multi-fonte nas páginas de produto",
              "Source routing reconhece amazon-br (quality 0.95, revenue 4%)",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-accent-green flex-shrink-0 mt-0.5" />
                <span className="text-sm text-text-secondary">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <h2 className="text-base font-bold font-display text-text-primary mb-3 flex items-center gap-2">
            <X className="w-4 h-4 text-accent-red" />
            Precisa de API
          </h2>
          <div className="space-y-2">
            {[
              "Migração para Creators API (PA-API deprecated May 2026)",
              "OAuth flow completo para Creators API",
              "Webhook de price drop Amazon → alerta",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <X className="w-3.5 h-3.5 text-surface-300 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-text-muted">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Capabilities */}
      {readiness.capabilities.length > 0 && (
        <div className="bg-white rounded-xl border border-surface-200 p-6 mb-6">
          <h2 className="text-base font-bold font-display text-text-primary mb-3">Capabilities Ativas</h2>
          <div className="flex flex-wrap gap-2">
            {readiness.capabilities.map((cap) => (
              <span key={cap} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-surface-100 text-text-secondary">
                {cap}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Active Campaigns */}
      <div className="bg-white rounded-xl border border-surface-200 p-6 mb-6">
        <h2 className="text-base font-bold font-display text-text-primary mb-3">Campanhas Ativas</h2>
        {campaigns.length > 0 ? (
          <div className="space-y-3">
            {campaigns.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-surface-100">
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">{c.name}</p>
                  <p className="text-[11px] text-text-muted">{c.description}</p>
                </div>
                <span className="text-xs font-mono font-bold text-[#FF9900] bg-[#FF9900]/10 px-2 py-1 rounded">
                  {c.tag}
                </span>
                <a
                  href={c.landingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded text-surface-400 hover:text-[#FF9900] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">Nenhuma campanha ativa</p>
        )}
      </div>

      {/* Next Step */}
      <div className="bg-white rounded-xl border border-surface-200 p-6">
        <h2 className="text-base font-bold font-display text-text-primary mb-3 flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-accent-blue" />
          Próximo Passo
        </h2>
        <div className="p-4 rounded-lg bg-accent-blue/5 border border-accent-blue/10">
          <p className="text-sm text-text-primary font-medium">{readiness.nextStep}</p>
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Checklist para avançar</p>
          <div className="space-y-1.5">
            {[
              { done: readiness.affiliateTag.ok, text: "Configurar tag de afiliado (AMAZON_AFFILIATE_TAG)" },
              { done: readiness.paApi.ok, text: "Configurar credenciais PA-API 5.0" },
              { done: true, text: "Implementar syncFeed() com import pipeline real" },
              { done: true, text: "Implementar importBatch() com import pipeline real" },
              { done: true, text: "Integrar Amazon no discover-import cron job" },
              { done: true, text: "Merge canónico cross-source (Amazon↔ML)" },
              { done: false, text: "Migrar para Creators API (PA-API deprecated May 2026)" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                {item.done ? (
                  <Check className="w-3 h-3 text-accent-green flex-shrink-0" />
                ) : (
                  <div className="w-3 h-3 rounded-full border border-surface-300 flex-shrink-0" />
                )}
                <span className={`text-xs ${item.done ? "text-text-muted line-through" : "text-text-secondary"}`}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
