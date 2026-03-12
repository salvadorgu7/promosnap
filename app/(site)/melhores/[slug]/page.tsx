import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, ChevronRight, HelpCircle, Sparkles } from "lucide-react";
import OfferCard from "@/components/cards/OfferCard";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo/metadata";
import { getProductsByCategory } from "@/lib/db/queries";

interface CuratedPage {
  title: string;
  description: string;
  intro: string;
  categorySlug: string;
  faqs: Array<{ q: string; a: string }>;
}

const CURATED_PAGES: Record<string, CuratedPage> = {
  "melhores-smartphones": {
    title: "Melhores Smartphones",
    description:
      "Os melhores celulares com os menores preços. Comparamos ofertas de todos os marketplaces para você encontrar o smartphone ideal.",
    intro:
      "Escolher o smartphone certo pode ser desafiador com tantas opções no mercado. Reunimos os celulares com melhor custo-benefício, analisando preço real, avaliações de compradores e histórico de preços para garantir que você faça a melhor escolha.",
    categorySlug: "celulares",
    faqs: [
      {
        q: "Como o PromoSnap escolhe os melhores smartphones?",
        a: "Nosso algoritmo analisa o score de oferta de cada produto, considerando preço atual vs. histórico, avaliações reais de compradores, volume de vendas e disponibilidade em múltiplas lojas.",
      },
      {
        q: "Os preços mostrados são atualizados em tempo real?",
        a: "Sim. Monitoramos os preços várias vezes ao dia em todos os marketplaces parceiros, garantindo que você sempre veja o valor mais recente.",
      },
      {
        q: "Vale a pena comprar celular importado?",
        a: "Depende do modelo e da loja. Mostramos ofertas de lojas nacionais e internacionais para que você compare garantia, prazo de entrega e preço final com impostos.",
      },
      {
        q: "Como saber se um desconto é real?",
        a: "O PromoSnap mostra o histórico de preços de cada produto. Se o preço atual está abaixo da média dos últimos 30 dias, o desconto é real. Fique atento aos badges de oferta quente.",
      },
    ],
  },
  "melhores-notebooks": {
    title: "Melhores Notebooks",
    description:
      "Os melhores notebooks com preços comparados. Encontre o notebook ideal para trabalho, estudo ou jogos.",
    intro:
      "Encontrar o notebook perfeito exige equilibrar desempenho, preço e portabilidade. Selecionamos os melhores notebooks disponíveis no mercado brasileiro, com preços verificados e histórico real para que você compre no melhor momento.",
    categorySlug: "notebooks",
    faqs: [
      {
        q: "Qual a diferença entre notebook e ultrabook?",
        a: "Ultrabooks são notebooks mais finos e leves, geralmente com SSDs e processadores de baixo consumo. São ideais para quem precisa de portabilidade, enquanto notebooks tradicionais podem oferecer mais desempenho por um preço menor.",
      },
      {
        q: "Quanto de RAM é recomendado em 2025?",
        a: "Para uso básico, 8GB é suficiente. Para trabalho com múltiplas abas, edição de fotos e multitarefa, recomendamos 16GB. Para edição de vídeo ou jogos, 32GB é o ideal.",
      },
      {
        q: "Os preços incluem frete?",
        a: "Indicamos quando o frete é grátis com o badge correspondente. Em alguns casos, o preço final pode variar com o frete dependendo da sua região.",
      },
      {
        q: "Como funciona a garantia de notebooks comprados online?",
        a: "Notebooks comprados em marketplaces como Amazon e Mercado Livre contam com garantia do fabricante. Recomendamos verificar se o vendedor é oficial ou autorizado antes da compra.",
      },
    ],
  },
  "melhores-fones-bluetooth": {
    title: "Melhores Fones Bluetooth",
    description:
      "Os melhores fones de ouvido Bluetooth com preço comparado. TWS, over-ear e neckband com as melhores ofertas.",
    intro:
      "O mercado de fones Bluetooth explodiu nos últimos anos, com opções que vão de modelos acessíveis a audiofilia. Selecionamos os fones com melhor custo-benefício, qualidade de som comprovada e preços monitorados em tempo real.",
    categorySlug: "audio",
    faqs: [
      {
        q: "Qual a diferença entre TWS, over-ear e neckband?",
        a: "TWS (True Wireless Stereo) são fones totalmente sem fio. Over-ear cobrem toda a orelha e oferecem melhor isolamento. Neckband ficam ao redor do pescoço com fio entre os fones.",
      },
      {
        q: "ANC realmente funciona?",
        a: "Sim, o cancelamento ativo de ruído faz diferença significativa. Modelos premium eliminam até 90% do ruído ambiente. Modelos mais acessíveis oferecem redução parcial mas ainda perceptível.",
      },
      {
        q: "Quanto tempo dura a bateria de fones Bluetooth?",
        a: "Fones TWS duram entre 4-8 horas, com case estendendo para 20-36 horas. Over-ear podem durar 20-60 horas dependendo do modelo e uso de ANC.",
      },
    ],
  },
  "melhores-air-fryers": {
    title: "Melhores Air Fryers",
    description:
      "As melhores air fryers com preço comparado. Encontre a fritadeira sem óleo ideal para sua cozinha.",
    intro:
      "Air fryers se tornaram indispensáveis na cozinha brasileira. Comparamos os modelos mais populares, desde opções compactas até air fryers família, com preços reais e avaliações de quem já comprou.",
    categorySlug: "casa",
    faqs: [
      {
        q: "Qual o tamanho ideal de air fryer?",
        a: "Para 1-2 pessoas, modelos de 3-4L são suficientes. Para famílias, recomendamos 5-7L. Para uso intenso ou famílias maiores, modelos de 8L+ são ideais.",
      },
      {
        q: "Air fryer gasta muita energia?",
        a: "Air fryers consomem entre 1000W e 2000W, mas como cozinham mais rápido que fornos convencionais, o consumo total tende a ser menor por refeição preparada.",
      },
      {
        q: "Vale a pena comprar air fryer digital?",
        a: "Modelos digitais oferecem controle preciso de temperatura e timer, além de receitas pré-programadas. A diferença de preço geralmente compensa pela conveniência.",
      },
    ],
  },
  "melhores-smart-tvs": {
    title: "Melhores Smart TVs",
    description:
      "As melhores Smart TVs com preço comparado. 4K, OLED e QLED com as melhores ofertas do mercado.",
    intro:
      "Com tantas tecnologias de tela disponíveis, escolher a TV certa ficou mais complexo. Comparamos Smart TVs 4K, OLED, QLED e LED de todas as faixas de preço para ajudar você a encontrar a melhor opção para sua sala.",
    categorySlug: "smart-tvs",
    faqs: [
      {
        q: "Qual a diferença entre OLED, QLED e LED?",
        a: "OLED oferece preto perfeito e melhor contraste. QLED (Samsung) oferece cores vibrantes e brilho alto. LED é a tecnologia mais acessível e confiável para a maioria dos usos.",
      },
      {
        q: "Qual o tamanho de TV ideal para minha sala?",
        a: "A regra geral é que a distância até a TV deve ser 1.5x o tamanho da tela. Para 2 metros de distância, uma TV de 50-55 polegadas é ideal. Para 3 metros, considere 65 polegadas ou mais.",
      },
      {
        q: "Smart TV precisa de TV Box?",
        a: "A maioria das Smart TVs modernas roda apps como Netflix, Prime Video e YouTube nativamente. TV Boxes como Fire Stick ou Chromecast podem complementar TVs mais antigas ou com sistema operacional limitado.",
      },
      {
        q: "120Hz faz diferença para filmes e séries?",
        a: "Para filmes e séries, 60Hz é suficiente. 120Hz faz diferença real em jogos e esportes ao vivo, proporcionando movimentos mais suaves.",
      },
    ],
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = CURATED_PAGES[slug];
  if (!page) return buildMetadata({ title: "Página não encontrada" });

  return buildMetadata({
    title: page.title,
    description: page.description,
    path: `/melhores/${slug}`,
  });
}

export default async function MelhoresPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = CURATED_PAGES[slug];
  if (!page) notFound();

  const { products } = await getProductsByCategory(page.categorySlug, {
    limit: 12,
    sort: "score",
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* SEO breadcrumb schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: page.title, url: `/melhores/${slug}` },
            ])
          ),
        }}
      />

      {/* FAQ schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: page.faqs.map((faq) => ({
              "@type": "Question",
              name: faq.q,
              acceptedAnswer: {
                "@type": "Answer",
                text: faq.a,
              },
            })),
          }),
        }}
      />

      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: page.title },
        ]}
      />

      {/* Intro section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center">
            <Award className="w-5 h-5 text-accent-blue" />
          </div>
          <h1 className="text-3xl font-bold font-display text-text-primary">
            {page.title}
          </h1>
        </div>
        <p className="text-text-secondary leading-relaxed max-w-3xl">
          {page.intro}
        </p>
      </div>

      {/* Product grid */}
      {products.length > 0 ? (
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-accent-orange" />
            <h2 className="font-display font-bold text-lg text-text-primary">
              Top Ofertas
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {products.map((p) => (
              <OfferCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : (
        <div className="mb-12 card p-8 text-center">
          <p className="text-text-muted">
            Estamos indexando produtos para esta categoria. Volte em breve!
          </p>
        </div>
      )}

      {/* FAQ section */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <HelpCircle className="w-5 h-5 text-brand-500" />
          <h2 className="font-display font-bold text-lg text-text-primary">
            Perguntas Frequentes
          </h2>
        </div>
        <div className="space-y-4 max-w-3xl">
          {page.faqs.map((faq, i) => (
            <details
              key={i}
              className="card group"
            >
              <summary className="flex items-center justify-between cursor-pointer px-5 py-4 text-sm font-medium text-text-primary hover:text-accent-blue transition-colors list-none">
                {faq.q}
                <ChevronRight className="w-4 h-4 text-surface-400 group-open:rotate-90 transition-transform flex-shrink-0 ml-2" />
              </summary>
              <div className="px-5 pb-4 text-sm text-text-secondary leading-relaxed">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* CTA section */}
      <section className="card p-8 text-center bg-gradient-to-r from-accent-blue/5 to-brand-500/5">
        <h2 className="font-display font-bold text-xl text-text-primary mb-2">
          Não encontrou o que procurava?
        </h2>
        <p className="text-sm text-text-muted mb-6 max-w-lg mx-auto">
          Use nossa busca para encontrar qualquer produto com preço comparado em
          tempo real.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/busca"
            className="btn-primary px-6 py-2.5 rounded-lg text-sm font-semibold"
          >
            Buscar produtos
          </Link>
          <Link
            href="/ofertas"
            className="btn-secondary px-6 py-2.5 rounded-lg text-sm font-semibold"
          >
            Ver todas as ofertas
          </Link>
        </div>
      </section>
    </div>
  );
}
