import { TrendingDown } from "lucide-react";
import Link from "next/link";
import OfferCard from "@/components/cards/OfferCard";
import EmptyState from "@/components/ui/EmptyState";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo/metadata";
import { getLowestPrices } from "@/lib/db/queries";
import { getBaseUrl } from "@/lib/seo/url";

export const dynamic = "force-dynamic";

const APP_URL = getBaseUrl();

export async function generateMetadata() {
  return buildMetadata({
    title: "Menor Preço Histórico – Mínimo Registrado",
    description:
      "Produtos que nunca estiveram tão baratos. Lista atualizada com os menores preços históricos registrados — dados reais, sem inflação artificial.",
    path: "/menor-preco",
  });
}

export default async function MenorPrecoPage() {
  const products = await getLowestPrices(40);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Breadcrumb schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Menor Preço Histórico", url: "/menor-preco" },
            ])
          ),
        }}
      />

      {/* ItemList schema for Google rich results */}
      {products.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: "Produtos no Menor Preço Histórico",
              description: "Produtos que estão registrando o menor preço histórico agora",
              numberOfItems: products.length,
              itemListElement: products.slice(0, 10).map((p, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: p.name,
                url: `${APP_URL}/produto/${p.slug}`,
              })),
            }),
          }}
        />
      )}

      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Menor Preço Histórico" },
        ]}
      />

      <div className="flex items-center gap-2 mb-6">
        <TrendingDown className="h-6 w-6 text-accent-blue" />
        <div>
          <h1 className="text-3xl font-bold font-display text-text-primary">
            Menor Preço Histórico
          </h1>
          <p className="text-sm text-text-muted">
            Nunca estiveram tão baratos — dados reais de acompanhamento
          </p>
        </div>
      </div>

      {products.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {products.map((p) => (
              <OfferCard key={p.id} product={p} railSource="lowest-prices" page="lowest-prices" />
            ))}
          </div>

          {/* Internal links for crawlability */}
          <div className="mt-10 pt-6 border-t border-surface-200">
            <p className="text-sm font-medium text-text-secondary mb-3">Explorar mais</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Mais Vendidos", href: "/mais-vendidos" },
                { label: "Ofertas Quentes", href: "/ofertas" },
                { label: "Todas as Categorias", href: "/categorias" },
                { label: "Comparar Preços", href: "/busca" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-surface-100 text-text-secondary hover:bg-surface-200 transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          title="Nenhum produto encontrado"
          description="Estamos monitorando preços para encontrar as maiores quedas. Volte em breve!"
          ctaLabel="Ir para Home"
          ctaHref="/"
        />
      )}
    </div>
  );
}
