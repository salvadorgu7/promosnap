import Link from "next/link";
import { TrendingUp, ExternalLink, Hash } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import { buildMetadata } from "@/lib/seo/metadata";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return buildMetadata({
    title: "Tendencias",
    description:
      "Veja os produtos e termos mais buscados agora no Brasil. Tendencias de busca atualizadas em tempo real.",
    path: "/trending",
  });
}

async function getLatestTrends() {
  // Get the most recent fetchedAt timestamp
  const latest = await prisma.trendingKeyword.findFirst({
    orderBy: { fetchedAt: "desc" },
    select: { fetchedAt: true },
  });

  if (!latest) return [];

  // Get all keywords from the latest batch
  return prisma.trendingKeyword.findMany({
    where: { fetchedAt: latest.fetchedAt },
    orderBy: { position: "asc" },
  });
}

export default async function TrendingPage() {
  const trends = await getLatestTrends().catch(() => []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="h-6 w-6 text-accent-orange" />
        <div>
          <h1 className="text-3xl font-bold font-display text-text-primary">
            Tendencias
          </h1>
          <p className="text-sm text-text-muted">
            Os termos mais buscados agora no Brasil
          </p>
        </div>
      </div>

      {trends.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {trends.map((trend) => (
            <div
              key={trend.id}
              className="card p-4 flex items-start gap-4 hover:-translate-y-0.5 transition-transform"
            >
              {/* Position badge */}
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-accent-orange/10 flex items-center justify-center">
                <span className="font-display font-bold text-accent-orange text-sm">
                  #{trend.position}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/busca?q=${encodeURIComponent(trend.keyword)}`}
                  className="font-display font-semibold text-text-primary hover:text-accent-blue transition-colors text-sm"
                >
                  {trend.keyword}
                </Link>

                <div className="flex items-center gap-3 mt-2">
                  <Link
                    href={`/busca?q=${encodeURIComponent(trend.keyword)}`}
                    className="inline-flex items-center gap-1 text-xs text-accent-blue hover:text-brand-500 font-medium transition-colors"
                  >
                    <Hash className="w-3 h-3" />
                    Buscar no PromoSnap
                  </Link>
                  {trend.url && (
                    <a
                      href={trend.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-accent-blue font-medium transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Ver no Mercado Livre
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nenhuma tendencia disponivel"
          description="Estamos coletando dados de tendencias. Volte em breve!"
          ctaLabel="Ir para Home"
          ctaHref="/"
        />
      )}
    </div>
  );
}
