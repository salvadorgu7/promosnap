import { Metadata } from "next"
import Link from "next/link"
import { Search, BarChart3, Bell, Shield, Store, TrendingDown, Sparkles, ArrowRight } from "lucide-react"

export const metadata: Metadata = {
  title: "Como Funciona o PromoSnap — Comparacao de Precos Transparente",
  description: "Entenda como o PromoSnap compara precos em Amazon, Mercado Livre, Shopee e Shein. Historico real de 90 dias, score de oferta verificado e alertas de queda.",
}

const STEPS = [
  {
    icon: Store,
    title: "Monitoramos 4+ lojas",
    description: "Rastreamos precos em Amazon, Mercado Livre, Shopee e Shein em tempo real. Nosso sistema verifica atualizacoes a cada 2 horas.",
  },
  {
    icon: BarChart3,
    title: "Historico real de 90 dias",
    description: "Guardamos cada variacao de preco dos ultimos 90 dias. Assim voce sabe se o desconto e real ou se o preco foi inflado antes da 'promoção'.",
  },
  {
    icon: TrendingDown,
    title: "Score de oferta verificado",
    description: "Cada oferta recebe um score de 0 a 100 baseado em: desconto real vs historico, frete, confiabilidade da loja e avaliacao de compradores.",
  },
  {
    icon: Bell,
    title: "Alertas de queda de preco",
    description: "Defina o preco que quer pagar e receba um email quando o produto atingir esse valor. Monitoramos 24/7 por voce.",
  },
  {
    icon: Sparkles,
    title: "Assistente IA de compras",
    description: "Nosso assistente busca, compara e recomenda produtos com base no seu orcamento e necessidade. Todos os links levam direto para as lojas.",
  },
  {
    icon: Shield,
    title: "Transparencia total",
    description: "Somos um comparador independente. Ganhamos comissao quando voce compra via nossos links, sem custo extra. Os precos sao os mesmos das lojas.",
  },
]

export default function ComoFuncionaPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-text-primary mb-3">
          Como o PromoSnap funciona
        </h1>
        <p className="text-text-secondary max-w-2xl mx-auto">
          Comparamos precos de verdade, com historico real e transparencia total.
          Sem truques, sem precos inflados — so dados reais para voce economizar.
        </p>
      </div>

      {/* Steps */}
      <div className="grid gap-6 mb-12">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <div key={i} className="flex gap-4 p-5 rounded-xl border border-surface-200 bg-surface-50">
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-6 h-6 text-brand-500" />
              </div>
              <div>
                <h2 className="font-display font-bold text-text-primary mb-1">{step.title}</h2>
                <p className="text-sm text-text-secondary leading-relaxed">{step.description}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Trust badges */}
      <div className="text-center mb-10">
        <p className="text-xs text-text-muted uppercase tracking-wider mb-3">Lojas parceiras</p>
        <div className="flex items-center justify-center gap-6 text-text-muted">
          {["Amazon", "Mercado Livre", "Shopee", "Shein"].map(store => (
            <span key={store} className="text-sm font-medium">{store}</span>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center py-8 bg-gradient-to-br from-brand-500 to-accent-purple rounded-2xl">
        <h3 className="font-display text-xl font-bold text-white mb-2">
          Pronto para economizar?
        </h3>
        <p className="text-sm text-white/80 mb-4">
          Comece a comparar precos agora — e gratis.
        </p>
        <Link
          href="/busca"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-brand-600 font-bold text-sm hover:bg-white/90 transition-colors"
        >
          <Search className="w-4 h-4" />
          Comparar Precos
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
