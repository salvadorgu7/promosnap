import Link from "next/link";
import { Compass, Scale, Award, Radar, ArrowRight, Tag, BarChart3 } from "lucide-react";
import { findComparisonsForProduct } from "@/lib/seo/comparisons";
import { BEST_PAGES } from "@/lib/seo/best-pages";

interface ContinueExploringProps {
  productName: string;
  categorySlug?: string;
  categoryName?: string;
}

interface ExploreLink {
  href: string;
  label: string;
  icon: typeof Compass;
}

export default function ContinueExploring({
  productName,
  categorySlug,
  categoryName,
}: ContinueExploringProps) {
  const links: ExploreLink[] = [];

  // Find related comparisons
  const comparisons = findComparisonsForProduct(productName);
  for (const c of comparisons) {
    links.push({
      href: `/comparar/${c.slug}`,
      label: `vs ${c.otherProduct}`,
      icon: Scale,
    });
  }

  // Find related "melhores" pages
  if (categorySlug) {
    for (const [slug, def] of Object.entries(BEST_PAGES)) {
      if (def.query.categories?.includes(categorySlug)) {
        links.push({
          href: `/melhores/${slug}`,
          label: def.title,
          icon: Award,
        });
      }
    }
  }

  // Always include Radar and Preco Hoje
  links.push({
    href: "/radar",
    label: "Meu Radar",
    icon: Radar,
  });

  links.push({
    href: "/preco-hoje",
    label: "Preco Hoje",
    icon: BarChart3,
  });

  // Category link if available
  if (categorySlug && categoryName) {
    links.push({
      href: `/categoria/${categorySlug}`,
      label: categoryName,
      icon: Tag,
    });
  }

  return (
    <section className="mt-8">
      <h3 className="font-display font-bold text-lg text-text-primary mb-3 flex items-center gap-2">
        <Compass className="w-5 h-5 text-brand-500" /> Continue Explorando
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="card p-3 flex items-center gap-2 hover:border-brand-500/30 transition-colors group"
          >
            <link.icon className="w-4 h-4 text-text-muted group-hover:text-brand-500 flex-shrink-0" />
            <span className="text-sm text-text-secondary group-hover:text-text-primary truncate">
              {link.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
