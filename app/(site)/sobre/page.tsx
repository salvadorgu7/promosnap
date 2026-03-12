import {
  Search,
  BarChart3,
  Bell,
  ShieldCheck,
  Store,
  Heart,
  Zap,
  Eye,
  TrendingUp,
  Layers,
  Target,
  Users,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo/metadata";

export function generateMetadata() {
  return buildMetadata({
    title: "Sobre o PromoSnap — Inteligencia de Compras",
    description:
      "O PromoSnap e sua camada de inteligencia sobre os maiores marketplaces do Brasil. Compare precos, veja historico real, avaliacoes consolidadas e encontre ofertas que realmente valem a pena.",
    path: "/sobre",
  });
}

const PILLARS = [
  {
    icon: Layers,
    color: "text-accent-blue",
    bg: "bg-accent-blue/10",
    title: "Camada de Inteligencia",
    description:
      "O PromoSnap nao e uma loja. E uma camada acima dos marketplaces que organiza, compara e contextualiza precos para que voce tome decisoes melhores.",
  },
  {
    icon: Target,
    color: "text-accent-green",
    bg: "bg-accent-green/10",
    title: "Radar de Ofertas Reais",
    description:
      "Nosso algoritmo analisa historico de preco, volume de vendas, avaliacoes e confiabilidade da loja para separar ofertas reais de marketing enganoso.",
  },
  {
    icon: BarChart3,
    color: "text-accent-purple",
    bg: "bg-accent-purple/10",
    title: "Comparador com Contexto",
    description:
      "Nao basta mostrar precos lado a lado. Contextualizamos com historico de 90 dias, score de oferta, frete e prazos de entrega de cada loja.",
  },
];

const STEPS = [
  {
    icon: Search,
    title: "Monitoramos continuamente",
    description:
      "Nossos sistemas verificam precos em Amazon, Mercado Livre, Shopee e Shein varias vezes ao dia, construindo um historico real e confiavel.",
  },
  {
    icon: BarChart3,
    title: "Analisamos com profundidade",
    description:
      "Cada oferta recebe um score baseado em preco atual vs. historico, avaliacoes consolidadas, volume de vendas e confiabilidade da fonte.",
  },
  {
    icon: TrendingUp,
    title: "Destacamos o que importa",
    description:
      "Filtramos o ruido e apresentamos apenas ofertas com score alto. Quando o preco esta realmente baixo, voce sabe — com dados, nao achismo.",
  },
  {
    icon: Bell,
    title: "Alertamos na hora certa",
    description:
      "Defina alertas de preco e receba notificacoes quando o produto atingir o valor desejado. Timing e tudo em compras online.",
  },
];

const TRUST_POINTS = [
  {
    icon: Eye,
    title: "Historico transparente",
    description:
      "Cada produto mostra o historico de precos dos ultimos 90 dias. Se o preco subiu antes de uma promocao, voce vai saber imediatamente.",
  },
  {
    icon: ShieldCheck,
    title: "Dados direto da fonte",
    description:
      "Todos os precos sao coletados diretamente das APIs e paginas dos marketplaces. Nao inventamos descontos e nao manipulamos valores.",
  },
  {
    icon: Zap,
    title: "Atualizacao em tempo real",
    description:
      "Precos sao verificados varias vezes ao dia. Quando uma oferta real surge, ela e destacada imediatamente no nosso radar.",
  },
  {
    icon: Users,
    title: "Feito para o consumidor",
    description:
      "Rankings e scores nunca sao influenciados por comissoes. Nosso incentivo e o mesmo que o seu: encontrar o melhor negocio.",
  },
];

const SOURCES = [
  { name: "Amazon", description: "O maior marketplace do mundo com milhoes de produtos e entrega rapida via Prime" },
  { name: "Mercado Livre", description: "O maior marketplace da America Latina com frete gratis e protecao ao comprador" },
  { name: "Shopee", description: "Ofertas competitivas com cupons frequentes e frete gratis em milhares de produtos" },
  { name: "Shein", description: "Moda, acessorios e casa com precos acessiveis e colecoes renovadas constantemente" },
];

const DIFFERENTIALS = [
  "Historico de preco de 90 dias para cada produto",
  "Score de oferta inteligente baseado em dados reais",
  "Comparacao de precos entre 4+ marketplaces",
  "Avaliacoes consolidadas de multiplas fontes",
  "Alertas de preco personalizados",
  "Informacoes de frete e prazo de cada loja",
  "Curadoria que filtra ofertas falsas",
  "100% gratuito e independente",
];

export default function SobrePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Sobre", url: "/sobre" },
            ])
          ),
        }}
      />

      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Sobre o PromoSnap" },
        ]}
      />

      {/* Hero */}
      <section className="text-center max-w-3xl mx-auto mb-16 mt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-xs font-semibold mb-5">
          <Sparkles className="w-3.5 h-3.5" />
          Inteligencia de compras
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold font-display text-text-primary mb-5 tracking-tight leading-[1.1]">
          Sua camada de{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-accent-blue to-brand-500">
            inteligencia
          </span>{" "}
          sobre os marketplaces
        </h1>
        <p className="text-lg text-text-secondary leading-relaxed max-w-2xl mx-auto">
          O PromoSnap reune dados de preco, avaliacoes e disponibilidade dos maiores marketplaces do Brasil em um unico lugar. Nosso objetivo: dar contexto para que voce compre melhor, nao apenas mais barato.
        </p>
      </section>

      {/* Pillars */}
      <section className="mb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PILLARS.map((pillar, i) => (
            <div key={i} className="card-depth p-7">
              <div className={`w-14 h-14 rounded-2xl ${pillar.bg} flex items-center justify-center mb-5`}>
                <pillar.icon className={`w-7 h-7 ${pillar.color}`} />
              </div>
              <h3 className="font-display font-bold text-lg text-text-primary mb-3">
                {pillar.title}
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mb-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold font-display text-text-primary mb-3">
            Como funciona
          </h2>
          <p className="text-sm text-text-muted max-w-lg mx-auto">
            Do monitoramento ao alerta — cada etapa e projetada para dar contexto e confianca na sua decisao de compra.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map((step, i) => (
            <div key={i} className="card p-6 relative">
              <div className="absolute top-5 right-5 font-display font-extrabold text-3xl text-surface-100">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="w-12 h-12 rounded-xl bg-accent-blue/10 flex items-center justify-center mb-4">
                <step.icon className="w-6 h-6 text-accent-blue" />
              </div>
              <h3 className="font-display font-bold text-text-primary mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Differentials checklist */}
      <section className="mb-16">
        <div className="card-depth p-8 md:p-10 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-extrabold font-display text-text-primary mb-6 text-center">
              O que voce encontra no PromoSnap
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DIFFERENTIALS.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/80 transition-colors">
                  <CheckCircle2 className="w-5 h-5 text-accent-green flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-text-secondary font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why trust us */}
      <section className="mb-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold font-display text-text-primary mb-3">
            Por que confiar no PromoSnap
          </h2>
          <p className="text-sm text-text-muted max-w-lg mx-auto">
            Transparencia e a base do nosso produto. Voce sempre sabe de onde vem cada dado.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {TRUST_POINTS.map((point, i) => (
            <div key={i} className="card p-6 flex gap-5">
              <div className="w-12 h-12 rounded-xl bg-accent-green/10 flex items-center justify-center flex-shrink-0">
                <point.icon className="w-6 h-6 text-accent-green" />
              </div>
              <div>
                <h3 className="font-display font-bold text-text-primary mb-1.5">
                  {point.title}
                </h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  {point.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How we make money */}
      <section className="mb-16 max-w-3xl mx-auto">
        <div className="card-depth p-8 bg-gradient-to-r from-accent-blue/5 to-brand-500/5">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-accent-red/10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-accent-red" />
            </div>
            <h2 className="text-xl font-extrabold font-display text-text-primary">
              Como nos sustentamos
            </h2>
          </div>
          <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
            <p>
              O PromoSnap usa links de afiliado. Quando voce clica em uma oferta e realiza uma compra, podemos receber uma pequena comissao da loja, sem nenhum custo adicional para voce.
            </p>
            <p>
              Isso nos permite manter o servico gratuito e independente. Nossa receita vem exclusivamente dessas comissoes, o que significa que nosso incentivo e o mesmo que o seu: encontrar as melhores ofertas reais.
            </p>
            <p>
              Os rankings e scores de oferta nunca sao influenciados por comissoes. Mostramos sempre a melhor oferta para o consumidor, independentemente da loja de origem.
            </p>
          </div>
        </div>
      </section>

      {/* Sources */}
      <section className="mb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-extrabold font-display text-text-primary mb-3">
            Lojas que monitoramos
          </h2>
          <p className="text-sm text-text-muted">
            Dados coletados diretamente dos maiores marketplaces do Brasil.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SOURCES.map((source) => (
            <div key={source.name} className="card p-5 hover:-translate-y-1 transition-transform">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center">
                  <Store className="w-5 h-5 text-surface-500" />
                </div>
                <h3 className="font-display font-bold text-text-primary">
                  {source.name}
                </h3>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                {source.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="text-center mb-8">
        <div className="card-depth p-10 md:p-12 bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/40">
          <h2 className="text-2xl md:text-3xl font-extrabold font-display text-text-primary mb-3">
            Pronto para comprar com inteligencia?
          </h2>
          <p className="text-sm text-text-muted mb-7 max-w-md mx-auto">
            Compare precos, veja historico real e encontre ofertas que realmente valem a pena.
          </p>
          <Link
            href="/"
            className="btn-primary inline-flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-semibold"
          >
            Explorar ofertas
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
