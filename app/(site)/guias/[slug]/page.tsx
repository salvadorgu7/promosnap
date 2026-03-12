import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Calendar,
  User,
  Tag,
  Share2,
  Link2,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import Breadcrumb from "@/components/ui/Breadcrumb";
import OfferCard from "@/components/cards/OfferCard";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo/metadata";
import { markdownToHtml, extractHeadings } from "@/lib/content/markdown";
import { getProductsByCategory } from "@/lib/db/queries";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await prisma.article.findUnique({ where: { slug } });
  if (!article) return buildMetadata({ title: "Artigo nao encontrado" });

  return buildMetadata({
    title: article.title,
    description:
      article.subtitle ||
      `${article.title} - Guia completo no PromoSnap.`,
    path: `/guias/${slug}`,
  });
}

export default async function GuiaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const article = await prisma.article.findUnique({
    where: { slug, status: "PUBLISHED" },
  });

  if (!article) notFound();

  const contentHtml = markdownToHtml(article.content);
  const headings = extractHeadings(article.content);

  // Fetch related products by category
  let relatedProducts: Awaited<
    ReturnType<typeof getProductsByCategory>
  >["products"] = [];
  if (article.category) {
    try {
      const result = await getProductsByCategory(article.category, {
        limit: 8,
        sort: "score",
      });
      relatedProducts = result.products;
    } catch {
      // Category may not exist as a product category — that's fine
    }
  }

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.promosnap.com.br"}/guias/${article.slug}`;
  const shareText = encodeURIComponent(article.title);
  const whatsappUrl = `https://wa.me/?text=${shareText}%20${encodeURIComponent(shareUrl)}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* SEO breadcrumb schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Guias", url: "/guias" },
              { name: article.title, url: `/guias/${article.slug}` },
            ])
          ),
        }}
      />

      {/* Article schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: article.title,
            description: article.subtitle,
            author: {
              "@type": "Organization",
              name: article.author,
            },
            datePublished: article.publishedAt?.toISOString(),
            dateModified: article.updatedAt.toISOString(),
            publisher: {
              "@type": "Organization",
              name: "PromoSnap",
              url: "https://www.promosnap.com.br",
            },
          }),
        }}
      />

      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Guias", href: "/guias" },
          { label: article.title },
        ]}
      />

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main content */}
        <article className="flex-1 min-w-0">
          {/* Header */}
          <header className="mb-8">
            {article.category && (
              <div className="flex items-center gap-1 mb-3">
                <Tag className="w-3.5 h-3.5 text-accent-blue" />
                <Link
                  href={`/categoria/${article.category}`}
                  className="text-xs font-medium text-accent-blue uppercase tracking-wide hover:underline"
                >
                  {article.category}
                </Link>
              </div>
            )}

            <h1 className="text-3xl sm:text-4xl font-extrabold font-display text-text-primary mb-3">
              {article.title}
            </h1>

            {article.subtitle && (
              <p className="text-lg text-text-secondary leading-relaxed mb-4">
                {article.subtitle}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted">
              <div className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                <span>{article.author}</span>
              </div>
              {article.publishedAt && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDate(article.publishedAt)}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-surface-100 text-text-secondary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          {/* Content */}
          <div
            className="prose-custom"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />

          {/* Share buttons */}
          <div className="mt-10 pt-6 border-t border-surface-200">
            <div className="flex items-center gap-3">
              <Share2 className="w-4 h-4 text-text-muted" />
              <span className="text-sm font-medium text-text-secondary">
                Compartilhar:
              </span>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
              >
                WhatsApp
              </a>
              <a
                href={twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
              >
                X / Twitter
              </a>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-surface-100 text-text-secondary hover:bg-surface-200 transition-colors"
                data-copy-url={shareUrl}
                title="Copiar link"
              >
                <Link2 className="w-3 h-3" />
                Copiar link
              </button>
            </div>
          </div>
        </article>

        {/* Sidebar */}
        <aside className="lg:w-72 xl:w-80 flex-shrink-0">
          {/* Table of contents */}
          {headings.length > 0 && (
            <div className="card p-5 mb-6 sticky top-6">
              <h3 className="font-display font-bold text-text-primary text-sm mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-accent-blue" />
                Neste artigo
              </h3>
              <nav className="space-y-1">
                {headings.map((heading) => (
                  <a
                    key={heading.id}
                    href={`#${heading.id}`}
                    className={`block text-xs hover:text-accent-blue transition-colors ${
                      heading.level === 2
                        ? "text-text-secondary font-medium py-1"
                        : "text-text-muted pl-3 py-0.5"
                    }`}
                  >
                    {heading.text}
                  </a>
                ))}
              </nav>
            </div>
          )}

          {/* Other articles */}
          <div className="card p-5">
            <h3 className="font-display font-bold text-text-primary text-sm mb-3">
              Outros guias
            </h3>
            <OtherArticles currentSlug={article.slug} />
          </div>
        </aside>
      </div>

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold font-display text-text-primary">
              Produtos relacionados
            </h2>
            {article.category && (
              <Link
                href={`/categoria/${article.category}`}
                className="text-xs font-medium text-accent-blue hover:underline flex items-center gap-1"
              >
                Ver todos <ChevronRight className="w-3 h-3" />
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {relatedProducts.map((p) => (
              <OfferCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

async function OtherArticles({ currentSlug }: { currentSlug: string }) {
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED", slug: { not: currentSlug } },
    orderBy: { publishedAt: "desc" },
    take: 5,
    select: { slug: true, title: true, category: true },
  });

  if (articles.length === 0) return null;

  return (
    <div className="space-y-2">
      {articles.map((a) => (
        <Link
          key={a.slug}
          href={`/guias/${a.slug}`}
          className="block text-xs text-text-secondary hover:text-accent-blue transition-colors py-1"
        >
          {a.title}
        </Link>
      ))}
      <Link
        href="/guias"
        className="block text-xs font-medium text-accent-blue hover:underline pt-2 mt-2 border-t border-surface-100"
      >
        Ver todos os guias
      </Link>
    </div>
  );
}
