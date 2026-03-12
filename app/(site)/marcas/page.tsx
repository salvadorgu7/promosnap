import Link from "next/link";
import { Building2 } from "lucide-react";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo/metadata";
import { getBrands } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Marcas - Todas as Marcas",
  description:
    "Explore todas as marcas no PromoSnap. Compare precos de Apple, Samsung, Xiaomi, Sony, LG e dezenas de outras marcas.",
  path: "/marcas",
});

export default async function MarcasPage() {
  const brands = await getBrands();

  // Group brands by first letter
  const grouped = brands.reduce<Record<string, typeof brands>>((acc, brand) => {
    const letter = brand.name.charAt(0).toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(brand);
    return acc;
  }, {});

  const letters = Object.keys(grouped).sort();

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Marcas", url: "/marcas" },
            ])
          ),
        }}
      />

      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Marcas" },
        ]}
      />

      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-text-primary">
          Marcas
        </h1>
        <p className="text-sm text-text-muted mt-1">
          {brands.length} marcas com precos comparados
        </p>
      </div>

      {/* Letter index */}
      {letters.length > 5 && (
        <div className="flex flex-wrap gap-1.5 mb-6">
          {letters.map((letter) => (
            <a
              key={letter}
              href={`#letter-${letter}`}
              className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center
                         text-xs font-semibold text-text-secondary hover:bg-brand-50
                         hover:text-brand-600 transition-colors"
            >
              {letter}
            </a>
          ))}
        </div>
      )}

      {/* Brand grid grouped by letter */}
      <div className="space-y-8">
        {letters.map((letter) => (
          <section key={letter} id={`letter-${letter}`}>
            <h2 className="text-lg font-bold font-display text-text-primary mb-3 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 text-sm font-bold">
                {letter}
              </span>
              <span className="text-xs text-text-muted font-normal">
                {grouped[letter].length} {grouped[letter].length === 1 ? "marca" : "marcas"}
              </span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {grouped[letter].map((brand) => {
                const count = brand._count?.products ?? 0;
                return (
                  <Link
                    key={brand.id}
                    href={`/marca/${brand.slug}`}
                    className="group flex items-center gap-3 rounded-xl border border-surface-200 bg-white px-4 py-3.5
                               hover:border-brand-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center flex-shrink-0
                                    group-hover:bg-brand-50 transition-colors">
                      {brand.logoUrl ? (
                        <img
                          src={brand.logoUrl}
                          alt={brand.name}
                          className="w-6 h-6 object-contain"
                        />
                      ) : (
                        <Building2 className="w-5 h-5 text-surface-400 group-hover:text-brand-500 transition-colors" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-text-primary group-hover:text-brand-600 transition-colors truncate">
                        {brand.name}
                      </h3>
                      <p className="text-xs text-text-muted">
                        {count} {count === 1 ? "produto" : "produtos"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {brands.length === 0 && (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 text-surface-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-text-primary mb-1">
            Nenhuma marca encontrada
          </h2>
          <p className="text-sm text-text-muted">
            Estamos cadastrando as marcas. Volte em breve!
          </p>
        </div>
      )}
    </div>
  );
}
