import { Search } from "lucide-react";
import Link from "next/link";
import OfferCard from "@/components/cards/OfferCard";
import EmptyState from "@/components/ui/EmptyState";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo/metadata";
import { getMostSearchedProducts } from "@/lib/db/queries";
import { getBaseUrl } from "@/lib/seo/url";

export const revalidate = 3600;

const APP_URL = getBaseUrl();

export async function generateMetadata() {
  return buildMetadata({
    title: "Mais Buscados — Produtos em Alta no PromoSnap",
    description:
      "Os produtos mais buscados pelos usuários do PromoSnap. Descubra o que está em alta e compare preços em tempo real.",
    path: "/mais-buscados",
  });
}

export default async function MaisBuscadosPage() {
  const products = await getMostSearchedProducts(40);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Mais Buscados", url: "/mais-buscados" },
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
              name: "Produtos Mais Buscados",
              description: "Os produtos mais procurados no PromoSnap agora",
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
          { label: "Mais Buscados" },
        ]}
      />

      <div className="flex items-center gap-2 mb-6">
        <Search className="h-6 w-6 text-brand-purple" />
        <div>
          <h1 className="text-3xl font-bold font-display text-text-primary">
            Mais Buscados
          </h1>
          <p className="text-sm text-text-muted">
            O que os usuários do PromoSnap mais procuram agora
          </p>
        </div>
      </div>

      {products.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {products.map((p) => (
              <OfferCard key={p.id} product={p} railSource="most-searched" page="most-searched" />
            ))}
          </div>

          <div className="mt-10 pt-6 border-t border-surface-200">
            <p className="text-sm font-medium text-text-secondary mb-3">Explorar mais</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Mais Vendidos", href: "/mais-vendidos" },
                { label: "Queda de Preço", href: "/queda-de-preco" },
                { label: "Menor Preço Histórico", href: "/menor-preco" },
                { label: "Ofertas Quentes", href: "/ofertas" },
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
          title="Ainda sem dados de busca"
          description="À medida que mais pessoas usam o PromoSnap, vamos mostrar aqui o que está em alta."
          ctaLabel="Ir para Home"
          ctaHref="/"
        />
      )}
    </div>
  );
}
