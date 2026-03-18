import {
  Smartphone,
  Shirt,
  Home as HomeIcon,
  Gamepad2,
  Tag,
  Flame,
  ArrowRight,
  Bell,
  CheckCircle2,
  Sparkles,
  Users,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import Breadcrumb from "@/components/ui/Breadcrumb";
import OfferCard from "@/components/cards/OfferCard";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo/metadata";
import { getProductsByCategory } from "@/lib/db/queries";

// ============================================
// Channel definitions
// ============================================

interface ChannelDef {
  slug: string;
  name: string;
  description: string;
  longDescription: string;
  icon: typeof Smartphone;
  color: string;
  bg: string;
  borderColor: string;
  categorySlugs: string[];
  benefits: string[];
}

const CHANNELS: Record<string, ChannelDef> = {
  eletronicos: {
    slug: "eletronicos",
    name: "Eletrônicos",
    description:
      "Ofertas verificadas de smartphones, notebooks, fones, TVs e acessórios com alertas de preço e histórico real.",
    longDescription:
      "O canal de Eletrônicos do PromoSnap monitora continuamente os preços dos produtos mais procurados em tecnologia. Smartphones, notebooks, fones de ouvido, smart TVs, tablets e acessórios — tudo com score de oferta, histórico de 90 dias e comparação entre lojas. Receba notificações quando o preço atingir o menor valor histórico.",
    icon: Smartphone,
    color: "text-accent-blue",
    bg: "bg-accent-blue/10",
    borderColor: "border-accent-blue/20",
    categorySlugs: ["eletronicos", "smartphones", "notebooks", "fones", "tvs"],
    benefits: [
      "Alertas de preço para smartphones e notebooks",
      "Comparação entre Amazon, Mercado Livre, Shopee e Shein",
      "Histórico de 90 dias para não cair em falso desconto",
      "Cupons exclusivos de lojas de tecnologia",
      "Score de oferta calculado em tempo real",
    ],
  },
  cupons: {
    slug: "cupons",
    name: "Cupons e Descontos",
    description:
      "Cupons ativos, códigos promocionais e descontos exclusivos de todas as lojas monitoradas pelo PromoSnap.",
    longDescription:
      "O canal de Cupons consolida todos os códigos promocionais ativos dos marketplaces monitorados. Receba alertas quando novos cupons forem detectados, com informações de validade, loja de origem e produtos elegíveis. Nunca mais perca um cupom por falta de informação.",
    icon: Tag,
    color: "text-accent-orange",
    bg: "bg-accent-orange/10",
    borderColor: "border-accent-orange/20",
    categorySlugs: [],
    benefits: [
      "Cupons verificados de Amazon, Mercado Livre, Shopee e Shein",
      "Alertas de novos cupons em tempo real",
      "Informações de validade e restrições",
      "Códigos exclusivos negociados pelo PromoSnap",
      "Histórico de cupons para prever promoções",
    ],
  },
  "ofertas-quentes": {
    slug: "ofertas-quentes",
    name: "Ofertas Quentes",
    description:
      "As ofertas com maior score do PromoSnap. Produtos com desconto real, preço histórico baixo e alta demanda.",
    longDescription:
      "O canal de Ofertas Quentes destaca apenas produtos com score acima de 70 — ou seja, ofertas que combinam preço baixo real, histórico favorável, avaliação positiva e alta demanda. Ideal para quem quer ser avisado só quando realmente vale a pena comprar.",
    icon: Flame,
    color: "text-accent-red",
    bg: "bg-accent-red/10",
    borderColor: "border-accent-red/20",
    categorySlugs: [],
    benefits: [
      "Apenas ofertas com score acima de 70",
      "Preço verificado vs histórico de 90 dias",
      "Alertas imediatos quando o preço cai",
      "Comparação automática entre lojas",
      "Avaliações consolidadas de múltiplas fontes",
    ],
  },
  moda: {
    slug: "moda",
    name: "Moda",
    description:
      "Roupas, calçados e acessórios com cupons frequentes e ofertas das melhores lojas online do Brasil.",
    longDescription:
      "O canal de Moda do PromoSnap acompanha preços e promoções de roupas, calçados, bolsas e acessórios nos maiores marketplaces. Com foco em Shein, Shopee e Amazon, você recebe alertas de ofertas reais com histórico de preço e avaliações consolidadas.",
    icon: Shirt,
    color: "text-accent-red",
    bg: "bg-accent-red/10",
    borderColor: "border-accent-red/20",
    categorySlugs: ["moda", "roupas", "calcados"],
    benefits: [
      "Ofertas verificadas de Shein, Shopee e Amazon",
      "Cupons exclusivos para moda e acessórios",
      "Alertas de queda de preço em itens favoritos",
      "Comparação de preços entre lojas",
      "Avaliações consolidadas de compradores reais",
    ],
  },
  casa: {
    slug: "casa",
    name: "Casa & Decoração",
    description:
      "Móveis, eletrodomésticos, decoração e utilidades com preços verificados e histórico real.",
    longDescription:
      "O canal de Casa & Decoração monitora preços de móveis, eletrodomésticos, itens de cozinha, decoração e utilidades domésticas. Ideal para quem está montando ou renovando a casa e quer aproveitar ofertas reais com confiança.",
    icon: HomeIcon,
    color: "text-accent-orange",
    bg: "bg-accent-orange/10",
    borderColor: "border-accent-orange/20",
    categorySlugs: ["casa", "decoracao", "eletrodomesticos", "moveis", "cozinha"],
    benefits: [
      "Monitoramento de preços em eletrodomésticos",
      "Ofertas de móveis e decoração com histórico",
      "Alertas para itens de cozinha e utilidades",
      "Comparação entre Amazon, Mercado Livre e Shopee",
      "Frete e prazo de entrega de cada loja",
    ],
  },
  games: {
    slug: "games",
    name: "Games",
    description:
      "Consoles, jogos, periféricos e acessórios gamer com ofertas exclusivas e alertas de preço.",
    longDescription:
      "O canal de Games do PromoSnap é dedicado a gamers que buscam os melhores preços em consoles, jogos, periféricos e acessórios. Monitoramos PS5, Xbox, Nintendo Switch, headsets, teclados mecânicos e muito mais — tudo com score de oferta e histórico real.",
    icon: Gamepad2,
    color: "text-accent-green",
    bg: "bg-accent-green/10",
    borderColor: "border-accent-green/20",
    categorySlugs: ["games", "consoles", "jogos", "perifericos"],
    benefits: [
      "Alertas de preço para consoles e jogos",
      "Ofertas de periféricos gamer verificadas",
      "Histórico de preço para não cair em falso desconto",
      "Cupons de lojas de games e tecnologia",
      "Comparação entre todas as lojas monitoradas",
    ],
  },
};

const VALID_SLUGS = Object.keys(CHANNELS);

// ============================================
// Static params & metadata
// ============================================

export function generateStaticParams() {
  return VALID_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const channel = CHANNELS[slug];
  if (!channel) {
    return buildMetadata({
      title: "Canal não encontrado",
      description: "Este canal não existe no PromoSnap.",
      path: `/canais/${slug}`,
      noIndex: true,
    });
  }
  return buildMetadata({
    title: `${channel.name} — Canais PromoSnap`,
    description: channel.description,
    path: `/canais/${channel.slug}`,
    noIndex: true, // Canal individual — CTA page, sem intenção de busca orgânica
  });
}

// ============================================
// Page
// ============================================

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const channel = CHANNELS[slug];

  if (!channel) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="empty-state">
          <div className="empty-state-icon">
            <Bell className="w-8 h-8 text-surface-400" />
          </div>
          <h1 className="empty-state-title">Canal não encontrado</h1>
          <p className="empty-state-text">
            Este canal ainda não existe. Explore os canais disponíveis.
          </p>
          <Link href="/canais" className="btn-primary">
            Ver canais
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const Icon = channel.icon;

  // Fetch recent offers in this category
  let categoryOffers: any[] = [];
  if (channel.categorySlugs.length > 0) {
    try {
      const { products } = await getProductsByCategory(
        channel.categorySlugs[0],
        { limit: 8 }
      );
      categoryOffers = products;
    } catch {
      // DB not available — empty state
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Canais", url: "/canais" },
              { name: channel.name, url: `/canais/${channel.slug}` },
            ])
          ),
        }}
      />

      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Canais", href: "/canais" },
          { label: channel.name },
        ]}
      />

      {/* Hero */}
      <section className="mb-12 mt-4">
        <div className="card-depth p-8 md:p-10 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div
              className={`w-16 h-16 rounded-2xl ${channel.bg} flex items-center justify-center flex-shrink-0`}
            >
              <Icon className={`w-8 h-8 ${channel.color}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h1 className="text-3xl md:text-4xl font-extrabold font-display text-text-primary tracking-tight">
                  {channel.name}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-100 text-surface-500 border border-surface-200">
                  Em breve
                </span>
              </div>
              <p className="text-text-secondary leading-relaxed max-w-2xl">
                {channel.longDescription}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-5 h-5 text-brand-500" />
          <h2 className="font-display font-bold text-xl text-text-primary">
            O que você recebe neste canal
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {channel.benefits.map((benefit, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-4 rounded-xl card hover:bg-surface-50/80 transition-colors"
            >
              <CheckCircle2 className="w-5 h-5 text-accent-green flex-shrink-0 mt-0.5" />
              <span className="text-sm text-text-secondary font-medium">
                {benefit}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Recent offers in this category */}
      {categoryOffers.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent-blue" />
              <h2 className="font-display font-bold text-xl text-text-primary">
                Ofertas recentes em {channel.name}
              </h2>
            </div>
            <Link
              href={`/categoria/${channel.categorySlugs[0]}`}
              className="text-sm text-accent-blue hover:text-brand-500 font-medium flex items-center gap-1"
            >
              Ver mais <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categoryOffers.slice(0, 8).map((p: any) => (
              <OfferCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Subscribe interest CTA */}
      <section className="mb-12">
        <div className="card-depth p-8 md:p-10 bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/40 text-center">
          <div className="w-14 h-14 rounded-2xl bg-accent-blue/10 flex items-center justify-center mx-auto mb-5">
            <Users className="w-7 h-7 text-accent-blue" />
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold font-display text-text-primary mb-3">
            Quer ser avisado quando este canal abrir?
          </h2>
          <p className="text-sm text-text-muted mb-7 max-w-md mx-auto">
            Cadastre seu interesse e você será notificado assim que o canal de{" "}
            {channel.name} estiver disponível no Telegram ou WhatsApp.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/#newsletter"
              className="btn-primary inline-flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-semibold"
            >
              <Bell className="w-4 h-4" />
              Cadastrar interesse
            </Link>
            <Link
              href="/canais"
              className="btn-secondary inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm"
            >
              Ver todos os canais
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
