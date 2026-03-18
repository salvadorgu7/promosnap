import { BarChart3, ShieldCheck, TrendingDown, Bell, Store, Zap } from "lucide-react";
import Link from "next/link";

const PILLARS = [
  {
    icon: TrendingDown,
    color: "text-accent-blue",
    bg: "bg-accent-blue/8",
    title: "Historico real de precos",
    desc: "90 dias de dados para saber se o desconto e verdadeiro",
  },
  {
    icon: Store,
    color: "text-accent-purple",
    bg: "bg-accent-purple/8",
    title: "Multiplas lojas",
    desc: "Amazon, Mercado Livre, Shopee e Shein num so lugar",
  },
  {
    icon: ShieldCheck,
    color: "text-accent-green",
    bg: "bg-accent-green/8",
    title: "Score de oferta",
    desc: "Algoritmo que avalia desconto, frete, reputacao e tendencia",
  },
  {
    icon: Zap,
    color: "text-accent-orange",
    bg: "bg-accent-orange/8",
    title: "Atualizacao constante",
    desc: "Precos verificados automaticamente, varias vezes ao dia",
  },
  {
    icon: Bell,
    color: "text-accent-red",
    bg: "bg-accent-red/8",
    title: "Alertas de queda",
    desc: "Avise-me quando o preco cair no produto que voce quer",
  },
  {
    icon: BarChart3,
    color: "text-brand-500",
    bg: "bg-brand-500/8",
    title: "Decisao inteligente",
    desc: "Recomendacoes baseadas em dados, nao em achismo",
  },
];

export default function WhyPromoSnap() {
  return (
    <section className="py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-6">
          <h2 className="font-display font-bold text-xl text-text-primary">
            Por que usar o PromoSnap?
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Mais do que um comparador — uma central de inteligencia de compra
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="card p-3 text-center hover:shadow-md transition-shadow group"
              >
                <div className={`w-10 h-10 rounded-xl ${p.bg} flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-5 h-5 ${p.color}`} />
                </div>
                <h3 className="text-xs font-bold text-text-primary mb-1 leading-tight">
                  {p.title}
                </h3>
                <p className="text-[10px] text-text-muted leading-relaxed">
                  {p.desc}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/transparencia"
            className="text-xs text-text-muted hover:text-brand-500 underline underline-offset-2 transition-colors"
          >
            Saiba como funciona a comparacao e os links de afiliado
          </Link>
        </div>
      </div>
    </section>
  );
}
