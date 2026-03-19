import { TrendingDown } from "lucide-react";
import Link from "next/link";
import OfferCard from "@/components/cards/OfferCard";
import EmptyState from "@/components/ui/EmptyState";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo/metadata";
import { getPriceDrops } from "@/lib/db/queries";
import { getBaseUrl } from "@/lib/seo/url";

export const revalidate = 3600;

const APP_URL = getBaseUrl();

export async function generateMetadata() {
  return buildMetadata({
    title: "Queda de Preço — Produtos que Ficaram Mais Baratos Hoje",
    description:
      "Produtos com maior queda de preço nas últimas 72 horas. Descontos reais verificados com histórico — sem inflação artificial de preço.",
    path: "/queda-de-preco",
  });
}

export default async function QuedaDePrecoPage() {
  const products = await getPriceDrops(40);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Queda de Preço", url: "/queda-de-preco" },
            ])
          ),
        }}
      />

      {products.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: "Produtos com Maior Queda de Preço",
              description: "Produtos que tiveram as maiores quedas de preço nas últimas 72 horas",
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
          { label: "Queda de Preço" },
        ]}
      />

      <div className="flex items-center gap-2 mb-6">
        <TrendingDown className="h-6 w-6 text-accent-green" />
        <div>
          <h1 className="text-3xl font-bold font-display text-text-primary">
            Queda de Preço
          </h1>
          <p className="text-sm text-text-muted">
            Maiores quedas nas últimas 72h — descontos reais verificados
          </p>
        </div>
      </div>

      {products.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {products.map((p) => (
              <OfferCard key={p.id} product={p} railSource="price-drops" page="price-drops" />
            ))}
          </div>

          <div className="mt-10 pt-6 border-t border-surface-200">
            <p className="text-sm font-medium text-text-secondary mb-3">Explorar mais</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Mais Vendidos", href: "/mais-vendidos" },
                { label: "Menor Preço Histórico", href: "/menor-preco" },
                { label: "Ofertas Quentes", href: "/ofertas" },
                { label: "Todas as Categorias", href: "/categorias" },
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
          title="Nenhuma queda detectada"
          description="Estamos monitorando preços 24/7. Volte em breve para ver as últimas quedas!"
          ctaLabel="Ir para Home"
          ctaHref="/"
        />
      )}
    </div>
  );
}
