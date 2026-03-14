import { ShoppingBag, Check, X, ArrowRight, Zap, Link2, Search, ExternalLink } from "lucide-react"
import { checkAmazonReadiness, getActiveCampaigns, detectAmazonApiPath } from "@/lib/amazon/strategy"

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

  const levelLabels: Record<string, { text: string; color: string }> = {
    "not-configured": { text: "Nao Configurado", color: "bg-red-50 text-red-700 border-red-200" },
    "affiliate-only": { text: "Affiliate Only", color: "bg-amber-50 text-amber-700 border-amber-200" },
    "api-partial": { text: "API Parcial", color: "bg-blue-50 text-blue-700 border-blue-200" },
    "api-full": { text: "Integracao Completa", color: "bg-green-50 text-green-700 border-green-200" },
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
          <p className="text-sm text-text-muted">Integracao, tracking e status operacional</p>
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
          Identificador de afiliado usado em todos os links Amazon — gera comissao para o PromoSnap
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
                ? "Ativo — clickouts Amazon usam esta tag para atribuicao de comissao"
                : "NAO configurado — clickouts Amazon nao geram comissao"}
            </p>
          </div>
          <StatusBadge ok={readiness.affiliateTag.ok} label={readiness.affiliateTag.ok ? "Ativo" : "Ausente"} />
        </div>
        <p className="text-[10px] text-text-muted mt-2 ml-1">
          Importante: promosnap-20 e uma tag de afiliado, NAO um cupom de desconto. O usuario nao recebe desconto — o PromoSnap recebe comissao.
        </p>
      </div>

      {/* API Path Detection */}
      <div className="bg-white rounded-xl border border-surface-200 p-6 mb-6">
        <h2 className="text-lg font-bold font-display text-text-primary mb-1">Caminhos Oficiais</h2>
        <p className="text-xs text-text-muted mb-4">
          Qual API Amazon esta disponivel para esta conta
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
                Env vars necessarias: {apiStatus.creatorsApi.envVars.join(", ")}
              </p>
            )}
          </div>

          {/* PA-API */}
          <div className={`p-4 rounded-lg border ${apiStatus.path === "pa-api" ? "border-blue-200 bg-blue-50/50" : "border-surface-100 bg-surface-50"}`}>
            <div className="flex items-center gap-3">
              <Search className={`w-4 h-4 flex-shrink-0 ${apiStatus.path === "pa-api" ? "text-accent-blue" : "text-surface-400"}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-text-primary">PA-API 5.0</p>
                <p className="text-[11px] text-text-muted">API classica de Product Advertising — ponte temporaria</p>
              </div>
              <StatusBadge ok={apiStatus.paApi.configured} label={apiStatus.paApi.configured ? "Configurada" : "Pendente"} />
            </div>
            {!apiStatus.paApi.configured && (
              <p className="text-[10px] text-text-muted mt-2 ml-7">
                Env vars necessarias: {apiStatus.paApi.envVars.join(", ")}
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
              "Banner na homepage com link de afiliado",
              "Bloco 'Veja na Amazon' nas paginas de produto",
              "Import manual de produtos Amazon via pipeline",
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
              "Busca automatica de produtos Amazon",
              "Sincronizacao de precos em tempo real",
              "Feed sync periodico (cron)",
              "Comparacao automatica Amazon vs ML",
              "Ingestao automatizada de catalogo",
              "Refresh de ofertas Amazon",
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
          Proximo Passo
        </h2>
        <div className="p-4 rounded-lg bg-accent-blue/5 border border-accent-blue/10">
          <p className="text-sm text-text-primary font-medium">{readiness.nextStep}</p>
        </div>
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Checklist para avançar</p>
          <div className="space-y-1.5">
            {[
              { done: readiness.affiliateTag.ok, text: "Configurar tag de afiliado (AMAZON_AFFILIATE_TAG)" },
              { done: false, text: "Verificar acesso a Creators API no Amazon Associates" },
              { done: readiness.creatorsApi.ok, text: "Configurar credenciais Creators API (se disponivel)" },
              { done: readiness.paApi.ok, text: "Ou configurar credenciais PA-API 5.0 (alternativa)" },
              { done: false, text: "Implementar feed sync com API escolhida" },
              { done: readiness.feedSync, text: "Ativar sync periodico via cron" },
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
