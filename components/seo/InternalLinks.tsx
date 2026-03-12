import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BEST_PAGE_SLUGS, BEST_PAGES } from "@/lib/seo/best-pages";
import { OFFER_PAGE_SLUGS, OFFER_PAGES } from "@/lib/seo/offer-pages";

interface InternalLinksProps {
  type: "product" | "category" | "brand" | "melhores" | "ofertas";
  currentSlug?: string;
  category?: string;
  brand?: string;
}

interface LinkItem {
  href: string;
  label: string;
}

function getMelhoresLinks(currentSlug?: string): LinkItem[] {
  return BEST_PAGE_SLUGS
    .filter((s) => s !== currentSlug)
    .slice(0, 8)
    .map((s) => ({
      href: `/melhores/${s}`,
      label: BEST_PAGES[s].title,
    }));
}

function getOfertasLinks(currentSlug?: string): LinkItem[] {
  return OFFER_PAGE_SLUGS
    .filter((s) => s !== currentSlug)
    .slice(0, 8)
    .map((s) => ({
      href: `/ofertas/${s}`,
      label: OFFER_PAGES[s].title,
    }));
}

function getRelatedLinks(type: InternalLinksProps["type"], currentSlug?: string, category?: string): LinkItem[] {
  const links: LinkItem[] = [];

  // Always add some "melhores" links
  const melhores = getMelhoresLinks(currentSlug).slice(0, 4);
  links.push(...melhores);

  // Add some ofertas links
  const ofertas = getOfertasLinks(currentSlug).slice(0, 4);
  links.push(...ofertas);

  // Add contextual navigation
  if (type === "product" || type === "category") {
    links.push({ href: "/ofertas", label: "Todas as Ofertas" });
    links.push({ href: "/cupons", label: "Cupons de Desconto" });
  }
  if (type === "brand") {
    links.push({ href: "/marcas", label: "Todas as Marcas" });
    links.push({ href: "/ofertas", label: "Ofertas do Dia" });
  }
  if (type === "melhores") {
    links.push({ href: "/ofertas", label: "Ofertas Quentes" });
    links.push({ href: "/trending", label: "Produtos em Alta" });
  }
  if (type === "ofertas") {
    links.push({ href: "/cupons", label: "Cupons de Desconto" });
    links.push({ href: "/mais-vendidos", label: "Mais Vendidos" });
  }

  return links;
}

export default function InternalLinks({ type, currentSlug, category, brand }: InternalLinksProps) {
  const links = getRelatedLinks(type, currentSlug, category);

  if (links.length === 0) return null;

  return (
    <section className="mt-12 mb-8">
      <h2 className="font-display font-bold text-lg text-text-primary mb-4">
        Veja Também
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex items-center gap-2 px-4 py-3 rounded-lg bg-surface-50 border border-surface-200 hover:border-accent-blue/30 hover:bg-accent-blue/5 transition-colors"
          >
            <span className="text-sm text-text-secondary group-hover:text-accent-blue transition-colors truncate">
              {link.label}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-surface-400 group-hover:text-accent-blue flex-shrink-0 transition-colors" />
          </Link>
        ))}
      </div>
    </section>
  );
}
