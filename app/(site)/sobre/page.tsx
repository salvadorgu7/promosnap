import {
  Search,
  BarChart3,
  Bell,
  ShieldCheck,
  Store,
  Heart,
  Zap,
  Eye,
} from "lucide-react";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo/metadata";

export function generateMetadata() {
  return buildMetadata({
    title: "Sobre o PromoSnap",
    description:
      "Saiba como o PromoSnap compara preços, monitora ofertas e ajuda você a economizar de verdade nas suas compras online.",
    path: "/sobre",
  });
}

const STEPS = [
  {
    icon: Search,
    title: "Monitoramos os preços",
    description:
      "Nossos sistemas verificam preços em múltiplos marketplaces várias vezes ao dia, construindo um histórico real de cada produto.",
  },
  {
    icon: BarChart3,
    title: "Analisamos as ofertas",
    description:
      "Nosso algoritmo calcula um score de oferta baseado em preço atual vs. histórico, avaliações, vendas e confiabilidade da loja.",
  },
  {
    icon: Bell,
    title: "Mostramos o melhor",
    description:
      "Apresentamos as ofertas com maior score, destacando quando o preço está realmente baixo e alertando sobre falsos descontos.",
  },
];

const TRUST_POINTS = [
  {
    icon: Eye,
    title: "Transparência total",
    description:
      "Mostramos o histórico de preços de cada produto. Se o preço subiu antes de uma promoção, você vai saber.",
  },
  {
    icon: ShieldCheck,
    title: "Dados verificados",
    description:
      "Todos os preços são coletados diretamente dos marketplaces. Não inventamos descontos nem manipulamos valores.",
  },
  {
    icon: Zap,
    title: "Atualização constante",
    description:
      "Preços são verificados várias vezes ao dia. Quando uma oferta real aparece, ela é destacada imediatamente.",
  },
];

const SOURCES = [
  { name: "Amazon", description: "O maior marketplace do mundo com milhões de produtos" },
  { name: "Mercado Livre", description: "O maior marketplace da América Latina" },
  { name: "Shopee", description: "Ofertas competitivas com frete grátis frequente" },
  { name: "Shein", description: "Moda e acessórios com preços acessíveis" },
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
      <section className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl font-extrabold font-display text-text-primary mb-4">
          O que é o PromoSnap?
        </h1>
        <p className="text-lg text-text-secondary leading-relaxed">
          O PromoSnap é um comparador de preços independente que monitora os
          maiores marketplaces do Brasil. Nosso objetivo é simples: ajudar você
          a encontrar ofertas reais e evitar falsos descontos.
        </p>
      </section>

      {/* How it works */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold font-display text-text-primary text-center mb-8">
          Como funciona
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <div key={i} className="card p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-accent-blue/10 flex items-center justify-center mx-auto mb-4">
                <step.icon className="w-7 h-7 text-accent-blue" />
              </div>
              <div className="text-xs font-bold text-accent-blue mb-2">
                Passo {i + 1}
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

      {/* Why trust us */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold font-display text-text-primary text-center mb-8">
          Por que confiar no PromoSnap
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TRUST_POINTS.map((point, i) => (
            <div key={i} className="card p-6">
              <div className="w-10 h-10 rounded-xl bg-accent-green/10 flex items-center justify-center mb-4">
                <point.icon className="w-5 h-5 text-accent-green" />
              </div>
              <h3 className="font-display font-bold text-text-primary mb-2">
                {point.title}
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How we make money */}
      <section className="mb-16 max-w-3xl mx-auto">
        <div className="card p-8 bg-gradient-to-r from-accent-blue/5 to-brand-500/5">
          <div className="flex items-center gap-3 mb-4">
            <Heart className="w-6 h-6 text-accent-red" />
            <h2 className="text-2xl font-bold font-display text-text-primary">
              Como nos sustentamos
            </h2>
          </div>
          <div className="space-y-4 text-sm text-text-secondary leading-relaxed">
            <p>
              O PromoSnap usa links de afiliado. Quando você clica em uma oferta
              e realiza uma compra, podemos receber uma pequena comissão da loja,
              sem nenhum custo adicional para você.
            </p>
            <p>
              Isso nos permite manter o serviço gratuito e independente. Nossa
              receita vem exclusivamente dessas comissões, o que significa que
              nosso incentivo é o mesmo que o seu: encontrar as melhores ofertas
              reais.
            </p>
            <p>
              Os rankings e scores de oferta nunca são influenciados por
              comissões. Mostramos sempre a melhor oferta para o consumidor,
              independentemente da loja de origem.
            </p>
          </div>
        </div>
      </section>

      {/* Sources */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold font-display text-text-primary text-center mb-8">
          Lojas que monitoramos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SOURCES.map((source) => (
            <div key={source.name} className="card p-5">
              <div className="flex items-center gap-3 mb-2">
                <Store className="w-5 h-5 text-surface-400" />
                <h3 className="font-semibold text-text-primary">
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
        <h2 className="text-xl font-bold font-display text-text-primary mb-2">
          Pronto para economizar?
        </h2>
        <p className="text-sm text-text-muted mb-6">
          Comece a comparar preços agora e encontre ofertas que valem a pena.
        </p>
        <a
          href="/"
          className="btn-primary inline-block px-8 py-3 rounded-lg text-sm font-semibold"
        >
          Explorar ofertas
        </a>
      </section>
    </div>
  );
}
