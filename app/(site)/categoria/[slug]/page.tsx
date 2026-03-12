import Link from "next/link";
import OfferCard from "@/components/cards/OfferCard";
import Breadcrumb from "@/components/ui/Breadcrumb";
import EmptyState from "@/components/ui/EmptyState";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo/metadata";
import { MOCK_HOT_OFFERS } from "@/lib/mock-data";
import { SlidersHorizontal } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const name = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return buildMetadata({ title: `${name} - Ofertas`, path: `/categoria/${slug}` });
}

export default async function CategoriaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const name = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // TODO: Fetch from DB filtered by category
  const products = MOCK_HOT_OFFERS.filter((p) => p.categorySlug === slug);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Breadcrumb items={[
        { label: "Home", href: "/" },
        { label: name },
      ]} />

      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema([{ name: "Home", url: "/" }, { name, url: `/categoria/${slug}` }])) }} />

      <h1 className="text-3xl font-bold font-display text-surface-900 mb-2">{name}</h1>
      <p className="text-sm text-surface-500 mb-6">As melhores ofertas de {name} com preço comparado.</p>

      {products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {products.map((p) => <OfferCard key={p.id} product={p} />)}
        </div>
      ) : (
        <EmptyState
          icon={SlidersHorizontal}
          title="Em breve"
          description={`Indexando ofertas para ${name}. Volte em breve!`}
          actionLabel="Ver todas ofertas"
          actionHref="/ofertas"
        />
      )}
    </div>
  );
}
