"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BEST_PAGE_SLUGS, BEST_PAGES } from "@/lib/seo/best-pages";
import { OFFER_PAGE_SLUGS, OFFER_PAGES } from "@/lib/seo/offer-pages";
import {
  CLUSTERS,
  findClusterByCategory,
  getClusterLinksForMelhores,
  type ClusterDef,
} from "@/lib/seo/clusters";
import { COMPARISON_LIST } from "@/lib/seo/comparisons";

interface InternalLinksProps {
  type: "product" | "category" | "brand" | "melhores" | "ofertas";
  currentSlug?: string;
  /** Category slug to find matching cluster */
  category?: string;
  brand?: string;
}

interface LinkGroup {
  title: string;
  links: { href: string; label: string }[];
}

// ── Cluster-aware link building ───────────────────────────────

function getMelhoresLinksForCluster(cluster: ClusterDef, currentSlug?: string) {
  return cluster.melhores
    .filter((m) => m.exists && m.href !== `/melhores/${currentSlug}`)
    .slice(0, 4)
    .map((m) => ({ href: m.href, label: m.label }));
}

function getOfertasLinksForCluster(cluster: ClusterDef) {
  return cluster.offers
    .filter((o) => o.exists)
    .slice(0, 3)
    .map((o) => ({ href: o.href, label: o.label }));
}

function getComparisonsForCluster(cluster: ClusterDef, currentSlug?: string) {
  return cluster.comparisons
    .filter((c) => c.exists && c.href !== `/comparar/${currentSlug}`)
    .slice(0, 4)
    .map((c) => ({ href: c.href, label: c.label }));
}

// ── Fallbacks when no cluster context ───────────────────────────────

function getGenericMelhoresLinks(currentSlug?: string) {
  return BEST_PAGE_SLUGS
    .filter((s) => s !== currentSlug)
    .slice(0, 6)
    .map((s) => ({ href: `/melhores/${s}`, label: BEST_PAGES[s].title }));
}

function getGenericOfertasLinks(currentSlug?: string) {
  return OFFER_PAGE_SLUGS
    .filter((s) => s !== currentSlug)
    .slice(0, 4)
    .map((s) => ({ href: `/ofertas/${s}`, label: OFFER_PAGES[s].title }));
}

// ── Link group builders per page type ───────────────────────────────

function buildMelhoresGroups(currentSlug?: string): LinkGroup[] {
  const groups: LinkGroup[] = [];

  // Try cluster context first
  const clusterLinks = currentSlug ? getClusterLinksForMelhores(currentSlug) : null;

  if (clusterLinks && (clusterLinks.offers.length > 0 || clusterLinks.comparisons.length > 0)) {
    // Sibling melhores pages in same cluster
    if (clusterLinks.sibling.length > 0) {
      groups.push({
        title: "Outros Rankings",
        links: clusterLinks.sibling.map((s) => ({ href: s.href, label: s.label })),
      });
    }

    // Offer pages in same cluster
    if (clusterLinks.offers.length > 0) {
      groups.push({
        title: "Ofertas do Segmento",
        links: clusterLinks.offers.map((o) => ({ href: o.href, label: o.label })),
      });
    }

    // Comparisons in same cluster
    if (clusterLinks.comparisons.length > 0) {
      groups.push({
        title: "Comparativos",
        links: clusterLinks.comparisons.map((c) => ({ href: c.href, label: c.label })),
      });
    }

    // Vale-a-pena in same cluster
    if (clusterLinks.valeAPena.length > 0) {
      groups.push({
        title: "Vale a Pena?",
        links: clusterLinks.valeAPena.map((v) => ({ href: v.href, label: v.label })),
      });
    }
  } else {
    // Generic fallback
    groups.push({
      title: "Outros Rankings de Melhores",
      links: getGenericMelhoresLinks(currentSlug).slice(0, 6),
    });
    groups.push({
      title: "Ofertas Quentes",
      links: getGenericOfertasLinks().slice(0, 3),
    });
  }

  // Universal footers
  groups.push({
    title: "Mais do PromoSnap",
    links: [
      { href: "/ofertas", label: "Todas as Ofertas" },
      { href: "/menor-preco", label: "Menor Preço Histórico" },
      { href: "/cupons", label: "Cupons de Desconto" },
    ],
  });

  return groups;
}

function buildCategoryGroups(category?: string): LinkGroup[] {
  const groups: LinkGroup[] = [];
  const cluster = category ? findClusterByCategory(category) : null;

  if (cluster) {
    const melhoresLinks = getMelhoresLinksForCluster(cluster);
    if (melhoresLinks.length > 0) {
      groups.push({ title: "Mais Escolhidos", links: melhoresLinks });
    }

    const comparisonsLinks = getComparisonsForCluster(cluster);
    if (comparisonsLinks.length > 0) {
      groups.push({ title: "Comparativos", links: comparisonsLinks });
    }

    const ofertasLinks = getOfertasLinksForCluster(cluster);
    if (ofertasLinks.length > 0) {
      groups.push({ title: "Ofertas do Segmento", links: ofertasLinks });
    }
  } else {
    groups.push({
      title: "Rankings de Melhores",
      links: getGenericMelhoresLinks().slice(0, 4),
    });
    groups.push({
      title: "Ofertas por Categoria",
      links: getGenericOfertasLinks().slice(0, 3),
    });
  }

  groups.push({
    title: "Explorar",
    links: [
      { href: "/categorias", label: "Todas as Categorias" },
      { href: "/mais-vendidos", label: "Mais Vendidos" },
      { href: "/menor-preco", label: "Menor Preço Histórico" },
    ],
  });

  return groups;
}

function buildBrandGroups(brand?: string): LinkGroup[] {
  const groups: LinkGroup[] = [];

  // Find clusters that have this brand in their keywords
  const relatedClusters = brand
    ? Object.values(CLUSTERS).filter((c) =>
        c.keywords.some((k) => brand.toLowerCase().includes(k) || k.includes(brand.toLowerCase()))
      )
    : [];

  if (relatedClusters.length > 0) {
    const cluster = relatedClusters[0];
    const melhoresLinks = getMelhoresLinksForCluster(cluster);
    if (melhoresLinks.length > 0) {
      groups.push({ title: `Rankings de ${cluster.name}`, links: melhoresLinks });
    }
  } else {
    groups.push({
      title: "Rankings de Melhores",
      links: getGenericMelhoresLinks().slice(0, 4),
    });
  }

  groups.push({
    title: "Explorar Marcas",
    links: [
      { href: "/marcas", label: "Todas as Marcas" },
      { href: "/mais-vendidos", label: "Mais Vendidos" },
      { href: "/ofertas", label: "Ofertas do Dia" },
    ],
  });

  return groups;
}

function buildProductGroups(category?: string): LinkGroup[] {
  const groups: LinkGroup[] = [];
  const cluster = category ? findClusterByCategory(category) : null;

  if (cluster) {
    const melhoresLinks = getMelhoresLinksForCluster(cluster);
    if (melhoresLinks.length > 0) {
      groups.push({ title: `Melhores ${cluster.name}`, links: melhoresLinks });
    }

    const comparisonsLinks = getComparisonsForCluster(cluster);
    if (comparisonsLinks.length > 0) {
      groups.push({ title: "Compare Antes de Comprar", links: comparisonsLinks.slice(0, 3) });
    }

    const ofertasLinks = getOfertasLinksForCluster(cluster);
    if (ofertasLinks.length > 0) {
      groups.push({ title: "Ofertas do Segmento", links: ofertasLinks });
    }
  } else {
    groups.push({
      title: "Mais Escolhidos",
      links: getGenericMelhoresLinks().slice(0, 4),
    });
  }

  groups.push({
    title: "Comparar Preços",
    links: [
      { href: "/busca", label: "Buscar Produtos" },
      { href: "/menor-preco", label: "Menor Preço Histórico" },
      { href: "/cupons", label: "Cupons de Desconto" },
    ],
  });

  return groups;
}

function buildOfertasGroups(currentSlug?: string): LinkGroup[] {
  return [
    {
      title: "Mais Ofertas",
      links: getGenericOfertasLinks(currentSlug),
    },
    {
      title: "Rankings de Melhores",
      links: getGenericMelhoresLinks().slice(0, 4),
    },
    {
      title: "Explorar",
      links: [
        { href: "/cupons", label: "Cupons de Desconto" },
        { href: "/mais-vendidos", label: "Mais Vendidos" },
        { href: "/menor-preco", label: "Menor Preço Histórico" },
      ],
    },
  ];
}

// ── Main component ───────────────────────────────────────────────────

export default function InternalLinks({ type, currentSlug, category, brand }: InternalLinksProps) {
  let groups: LinkGroup[] = [];

  switch (type) {
    case "melhores":
      groups = buildMelhoresGroups(currentSlug);
      break;
    case "category":
      groups = buildCategoryGroups(category);
      break;
    case "brand":
      groups = buildBrandGroups(brand);
      break;
    case "product":
      groups = buildProductGroups(category);
      break;
    case "ofertas":
      groups = buildOfertasGroups(currentSlug);
      break;
  }

  // Filter out empty groups
  groups = groups.filter((g) => g.links.length > 0);

  if (groups.length === 0) return null;

  return (
    <section className="mt-12 mb-8 space-y-6">
      {groups.map((group) => (
        <div key={group.title}>
          <h3 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wide">
            {group.title}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {group.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center gap-2 px-4 py-3 rounded-lg bg-surface-50 border border-surface-200 hover:border-accent-blue/30 hover:bg-accent-blue/5 transition-colors"
              >
                <span className="text-sm text-text-secondary group-hover:text-accent-blue transition-colors truncate flex-1">
                  {link.label}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-surface-400 group-hover:text-accent-blue flex-shrink-0 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
