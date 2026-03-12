import {
  Send,
  MessageCircle,
  Mail,
  Smartphone,
  Gamepad2,
  Shirt,
  Home as HomeIcon,
  Sparkles,
  Users,
  Bell,
  ArrowRight,
  Zap,
  Clock,
} from "lucide-react";
import Link from "next/link";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo/metadata";

export function generateMetadata() {
  return buildMetadata({
    title: "Canais da Comunidade — PromoSnap",
    description:
      "Entre nos canais do PromoSnap e receba ofertas verificadas direto no Telegram, WhatsApp ou e-mail. Canais por categoria: eletronicos, moda, casa, games e mais.",
    path: "/canais",
  });
}

const MAIN_CHANNELS = [
  {
    id: "telegram-geral",
    name: "Telegram Geral",
    description:
      "Ofertas verificadas com score alto, alertas de preco historico e cupons exclusivos. O canal mais ativo da comunidade.",
    icon: Send,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    memberCount: "Novo",
    envKey: "TELEGRAM_CHAT_ID",
    href: process.env.TELEGRAM_CHAT_ID
      ? `https://t.me/${process.env.TELEGRAM_CHAT_ID}`
      : null,
    ctaLabel: "Entrar no Telegram",
    status: "active" as const,
  },
  {
    id: "whatsapp-geral",
    name: "WhatsApp Geral",
    description:
      "Receba as melhores ofertas do dia direto no WhatsApp. Formato resumido e sem spam — so o que vale a pena.",
    icon: MessageCircle,
    color: "text-green-500",
    bg: "bg-green-500/10",
    borderColor: "border-green-500/20",
    memberCount: "Novo",
    envKey: "WHATSAPP_GROUP_LINK",
    href: process.env.WHATSAPP_GROUP_LINK || null,
    ctaLabel: "Entrar no WhatsApp",
    status: "active" as const,
  },
  {
    id: "email-daily",
    name: "E-mail / Daily Deals",
    description:
      "Resumo diario das melhores ofertas, alertas de preco e cupons. Receba tudo organizado na sua caixa de entrada.",
    icon: Mail,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
    memberCount: "Novo",
    envKey: null,
    href: "/#newsletter",
    ctaLabel: "Cadastrar e-mail",
    status: "active" as const,
  },
];

const CATEGORY_CHANNELS = [
  {
    id: "eletronicos",
    slug: "eletronicos",
    name: "Eletronicos",
    description:
      "Smartphones, notebooks, fones, TVs e acessorios com as melhores ofertas e alertas de preco.",
    icon: Smartphone,
    color: "text-accent-blue",
    bg: "bg-accent-blue/10",
    borderColor: "border-accent-blue/20",
  },
  {
    id: "moda",
    slug: "moda",
    name: "Moda",
    description:
      "Roupas, calcados e acessorios com cupons e ofertas das melhores lojas online.",
    icon: Shirt,
    color: "text-accent-red",
    bg: "bg-accent-red/10",
    borderColor: "border-accent-red/20",
  },
  {
    id: "casa",
    slug: "casa",
    name: "Casa & Decoracao",
    description:
      "Moveis, eletrodomesticos, decoracao e utilidades com precos verificados.",
    icon: HomeIcon,
    color: "text-accent-orange",
    bg: "bg-accent-orange/10",
    borderColor: "border-accent-orange/20",
  },
  {
    id: "games",
    slug: "games",
    name: "Games",
    description:
      "Consoles, jogos, perifericos e acessorios gamer com ofertas exclusivas e alertas.",
    icon: Gamepad2,
    color: "text-accent-green",
    bg: "bg-accent-green/10",
    borderColor: "border-accent-green/20",
  },
];

export default function CanaisPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Canais", url: "/canais" },
            ])
          ),
        }}
      />

      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Canais da Comunidade" },
        ]}
      />

      {/* Hero */}
      <section className="text-center max-w-3xl mx-auto mb-14 mt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-blue/10 border border-accent-blue/20 text-accent-blue text-xs font-semibold mb-5">
          <Users className="w-3.5 h-3.5" />
          Comunidade PromoSnap
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold font-display text-text-primary mb-5 tracking-tight leading-[1.1]">
          Ofertas verificadas,{" "}
          <span className="text-gradient">direto no seu canal</span>
        </h1>
        <p className="text-lg text-text-secondary leading-relaxed max-w-2xl mx-auto">
          Receba alertas de preco, cupons e ofertas com score alto no Telegram,
          WhatsApp ou e-mail. Escolha seu canal preferido e nunca mais perca uma
          oportunidade real.
        </p>
      </section>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-14">
        <div className="card-depth text-center p-4">
          <div className="font-display font-extrabold text-2xl text-accent-blue">
            3+
          </div>
          <div className="text-xs text-text-muted mt-1">Canais ativos</div>
        </div>
        <div className="card-depth text-center p-4">
          <div className="font-display font-extrabold text-2xl text-accent-green">
            24h
          </div>
          <div className="text-xs text-text-muted mt-1">
            Monitoramento diario
          </div>
        </div>
        <div className="card-depth text-center p-4">
          <div className="font-display font-extrabold text-2xl text-accent-orange">
            100%
          </div>
          <div className="text-xs text-text-muted mt-1">Ofertas verificadas</div>
        </div>
      </div>

      {/* Main channels */}
      <section className="mb-16">
        <div className="flex items-center gap-2 mb-6">
          <Zap className="w-5 h-5 text-brand-500" />
          <h2 className="font-display font-bold text-xl text-text-primary">
            Canais Principais
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {MAIN_CHANNELS.map((channel) => {
            const Icon = channel.icon;
            const isConfigured = !!channel.href;
            return (
              <div
                key={channel.id}
                className={`card-depth p-6 flex flex-col border ${channel.borderColor} hover:border-opacity-50`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl ${channel.bg} flex items-center justify-center`}
                  >
                    <Icon className={`w-6 h-6 ${channel.color}`} />
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-green/10 text-accent-green border border-accent-green/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse" />
                    {channel.memberCount}
                  </span>
                </div>
                <h3 className="font-display font-bold text-lg text-text-primary mb-2">
                  {channel.name}
                </h3>
                <p className="text-sm text-text-muted leading-relaxed mb-5 flex-1">
                  {channel.description}
                </p>
                {isConfigured ? (
                  <a
                    href={channel.href!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary w-full text-center text-sm"
                  >
                    {channel.ctaLabel}
                    <ArrowRight className="w-4 h-4" />
                  </a>
                ) : (
                  <Link
                    href={channel.id === "email-daily" ? "/#newsletter" : "#"}
                    className="btn-primary w-full text-center text-sm"
                  >
                    {channel.ctaLabel}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Category channels */}
      <section className="mb-16">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-5 h-5 text-accent-orange" />
          <h2 className="font-display font-bold text-xl text-text-primary">
            Canais por Categoria
          </h2>
        </div>
        <p className="text-sm text-text-muted mb-6">
          Receba ofertas filtradas por categoria. Cadastre seu interesse e seja
          notificado quando o canal abrir.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATEGORY_CHANNELS.map((channel) => {
            const Icon = channel.icon;
            return (
              <div
                key={channel.id}
                className={`card p-5 flex flex-col border ${channel.borderColor} hover:-translate-y-1 transition-transform`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-lg ${channel.bg} flex items-center justify-center`}
                  >
                    <Icon className={`w-5 h-5 ${channel.color}`} />
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-100 text-surface-500 border border-surface-200">
                    <Clock className="w-3 h-3" />
                    Em breve
                  </span>
                </div>
                <h3 className="font-display font-bold text-text-primary mb-1.5">
                  {channel.name}
                </h3>
                <p className="text-xs text-text-muted leading-relaxed mb-4 flex-1">
                  {channel.description}
                </p>
                <Link
                  href={`/canais/${channel.slug}`}
                  className="btn-secondary w-full text-center text-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Quero ser avisado
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="mb-16">
        <div className="card-depth p-8 md:p-10 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-extrabold font-display text-text-primary mb-6">
              Como funciona
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-accent-blue/10 flex items-center justify-center mb-3">
                  <Bell className="w-6 h-6 text-accent-blue" />
                </div>
                <h3 className="font-display font-bold text-text-primary mb-1">
                  1. Escolha seu canal
                </h3>
                <p className="text-sm text-text-muted">
                  Telegram, WhatsApp ou e-mail — onde voce preferir receber.
                </p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-accent-green/10 flex items-center justify-center mb-3">
                  <Zap className="w-6 h-6 text-accent-green" />
                </div>
                <h3 className="font-display font-bold text-text-primary mb-1">
                  2. Receba ofertas reais
                </h3>
                <p className="text-sm text-text-muted">
                  Ofertas com score alto, verificadas e com historico de preco.
                </p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-xl bg-accent-orange/10 flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6 text-accent-orange" />
                </div>
                <h3 className="font-display font-bold text-text-primary mb-1">
                  3. Compre com confianca
                </h3>
                <p className="text-sm text-text-muted">
                  Saiba se o desconto e real antes de clicar no link.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="text-center mb-8">
        <div className="card-depth p-10 md:p-12 bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/40">
          <h2 className="text-2xl md:text-3xl font-extrabold font-display text-text-primary mb-3">
            Nao perca nenhuma oferta real
          </h2>
          <p className="text-sm text-text-muted mb-7 max-w-md mx-auto">
            Junte-se a comunidade PromoSnap e receba alertas de preco, cupons e
            ofertas verificadas direto no seu canal preferido.
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
