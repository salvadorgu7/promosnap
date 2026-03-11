import Link from "next/link";
import { ChevronRight, SlidersHorizontal } from "lucide-react";
import OfferCard from "@/components/cards/OfferCard";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo/metadata";
import { MOCK_HOT_OFFERS } from "@/lib/mock-data";

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
      <nav className="flex items-center gap-1 text-xs text-text-muted mb-4">
        <Link href="/" className="hover:text-text-secondary">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-text-secondary">{name}</span>
      </nav>

      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema([{ name: "Home", url: "/" }, { name, url: `/categoria/${slug}` }])) }} />

      <h1 className="text-3xl font-bold font-display text-text-primary mb-2">{name}</h1>
      <p className="text-sm text-text-muted mb-6">As melhores ofertas de {name} com preço comparado.</p>

      {products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {products.map((p) => <OfferCard key={p.id} product={p} />)}
        </div>
      ) : (
        <div className="text-center py-16 card">
          <SlidersHorizontal className="h-12 w-12 text-surface-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-text-primary mb-2">Em breve</h2>
          <p className="text-sm text-text-muted">Indexando ofertas para {name}. Volte em breve!</p>
        </div>
      )}
    </div>
  );
}
