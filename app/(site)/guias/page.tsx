import Link from "next/link";
import { BookOpen, Calendar, Tag } from "lucide-react";
import Breadcrumb from "@/components/ui/Breadcrumb";
import EmptyState from "@/components/ui/EmptyState";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo/metadata";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return buildMetadata({
    title: "Guias de Compra",
    description:
      "Guias completos para ajudar voce a escolher os melhores produtos. Dicas, comparativos e estrategias para economizar nas suas compras.",
    path: "/guias",
  });
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default async function GuiasPage() {
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Guias", url: "/guias" },
            ])
          ),
        }}
      />

      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Guias de Compra" },
        ]}
      />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-text-primary">
          Guias de Compra
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Artigos e guias para ajudar voce a comprar melhor e economizar de
          verdade.
        </p>
      </div>

      {/* Articles grid */}
      {articles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/guias/${article.slug}`}
              className="card group hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
            >
              {/* Image placeholder */}
              {article.imageUrl ? (
                <div className="aspect-video bg-surface-100 overflow-hidden">
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-accent-blue/10 to-brand-500/10 flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-accent-blue/40" />
                </div>
              )}

              <div className="p-4 flex flex-col flex-1">
                {/* Category badge */}
                {article.category && (
                  <div className="flex items-center gap-1 mb-2">
                    <Tag className="w-3 h-3 text-accent-blue" />
                    <span className="text-xs font-medium text-accent-blue uppercase tracking-wide">
                      {article.category}
                    </span>
                  </div>
                )}

                <h2 className="font-display font-bold text-text-primary group-hover:text-accent-blue transition-colors mb-1 line-clamp-2">
                  {article.title}
                </h2>

                {article.subtitle && (
                  <p className="text-xs text-text-muted line-clamp-2 mb-3 flex-1">
                    {article.subtitle}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center gap-2 mt-auto pt-2 border-t border-surface-100">
                  <Calendar className="w-3 h-3 text-text-muted flex-shrink-0" />
                  <span className="text-xs text-text-muted">
                    {article.publishedAt
                      ? formatDate(article.publishedAt)
                      : "Rascunho"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="Nenhum guia publicado"
          description="Estamos preparando guias incriveis para voce. Volte em breve!"
          ctaLabel="Ver ofertas"
          ctaHref="/ofertas"
        />
      )}
    </div>
  );
}
