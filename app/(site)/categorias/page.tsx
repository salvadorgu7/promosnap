import Link from "next/link";
import {
  Smartphone, Laptop, Headphones, Tv, Camera, Gamepad2,
  Home, ShoppingBag, Dumbbell, Baby, Sparkles, Package,
  Monitor, Watch, Speaker, Refrigerator, Shirt, Book,
} from "lucide-react";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo/metadata";
import { getCategories } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Categorias - Todas as Categorias",
  description:
    "Explore todas as categorias de produtos no PromoSnap. Compare precos, encontre ofertas e economize em celulares, notebooks, eletrodomesticos e mais.",
  path: "/categorias",
});

// Map category slugs to lucide icons
const CATEGORY_ICONS: Record<string, typeof Smartphone> = {
  celulares: Smartphone,
  smartphones: Smartphone,
  notebooks: Laptop,
  laptops: Laptop,
  informatica: Laptop,
  fones: Headphones,
  "fones-de-ouvido": Headphones,
  audio: Speaker,
  tvs: Tv,
  "smart-tvs": Tv,
  "tv-audio": Tv,
  televisores: Tv,
  cameras: Camera,
  fotografia: Camera,
  games: Gamepad2,
  gamer: Gamepad2,
  "video-games": Gamepad2,
  casa: Home,
  "casa-e-decoracao": Home,
  moda: ShoppingBag,
  roupas: Shirt,
  esportes: Dumbbell,
  esporte: Dumbbell,
  fitness: Dumbbell,
  infantil: Baby,
  bebe: Baby,
  beleza: Sparkles,
  perfumes: Sparkles,
  monitores: Monitor,
  eletronicos: Monitor,
  smartwatches: Watch,
  relogios: Watch,
  eletrodomesticos: Refrigerator,
  livros: Book,
};

function getCategoryIcon(slug: string) {
  return CATEGORY_ICONS[slug] || Package;
}

export default async function CategoriasPage() {
  const allCategories = await getCategories();
  // Only show categories that have at least 1 product
  const categories = allCategories.filter((cat: { _count?: { products: number } }) => (cat._count?.products ?? 0) > 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Categorias", url: "/categorias" },
            ])
          ),
        }}
      />

      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Categorias" },
        ]}
      />

      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-text-primary">
          Categorias
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Explore {categories.length} categorias de produtos com precos comparados
        </p>
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {categories.map((cat: { id: string; name: string; slug: string; _count?: { products: number } }) => {
          const Icon = getCategoryIcon(cat.slug);
          const count = cat._count?.products ?? 0;

          return (
            <Link
              key={cat.id}
              href={`/categoria/${cat.slug}`}
              className="group flex flex-col items-center gap-3 rounded-xl border border-surface-200 bg-white p-5
                         hover:border-brand-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-50 to-surface-100 flex items-center justify-center
                              group-hover:from-brand-100 group-hover:to-brand-50 transition-colors">
                <Icon className="w-6 h-6 text-brand-500" />
              </div>
              <div className="text-center">
                <h2 className="text-sm font-semibold text-text-primary group-hover:text-brand-600 transition-colors">
                  {cat.name}
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  {count} {count === 1 ? "produto" : "produtos"}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-surface-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-text-primary mb-1">
            Nenhuma categoria encontrada
          </h2>
          <p className="text-sm text-text-muted">
            Estamos preparando as categorias. Volte em breve!
          </p>
        </div>
      )}
    </div>
  );
}
