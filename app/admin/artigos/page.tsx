import Link from "next/link";
import { FileText, Plus, ExternalLink } from "lucide-react";
import prisma from "@/lib/db/prisma";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  DRAFT: {
    label: "Rascunho",
    classes: "text-yellow-700 bg-yellow-50",
  },
  PUBLISHED: {
    label: "Publicado",
    classes: "text-accent-green bg-green-50",
  },
  ARCHIVED: {
    label: "Arquivado",
    classes: "text-text-muted bg-surface-100",
  },
};

export default async function AdminArtigosPage() {
  const articles = await prisma.article.findMany({
    orderBy: { updatedAt: "desc" },
  });

  const published = articles.filter((a) => a.status === "PUBLISHED").length;
  const draft = articles.filter((a) => a.status === "DRAFT").length;
  const archived = articles.filter((a) => a.status === "ARCHIVED").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary">
            Artigos
          </h1>
          <p className="text-sm text-text-muted">
            {published} publicado{published !== 1 ? "s" : ""} &middot;{" "}
            {draft} rascunho{draft !== 1 ? "s" : ""} &middot; {archived}{" "}
            arquivado{archived !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/artigos/novo"
          className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" /> Novo artigo
        </Link>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50">
                <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">
                  Titulo
                </th>
                <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">
                  Categoria
                </th>
                <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">
                  Publicado
                </th>
                <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">
                  Atualizado
                </th>
                <th className="text-center py-3 px-4 text-xs text-text-muted font-medium">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => {
                const badge = STATUS_BADGE[article.status] || STATUS_BADGE.DRAFT;

                return (
                  <tr
                    key={article.id}
                    className="border-b border-surface-100 hover:bg-surface-50/50"
                  >
                    <td className="py-2 px-4 max-w-[300px]">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-text-muted flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-text-primary font-medium truncate">
                            {article.title}
                          </div>
                          <div className="text-xs text-text-muted truncate">
                            /guias/{article.slug}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-4 text-text-secondary text-xs">
                      {article.category || "—"}
                    </td>
                    <td className="py-2 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.classes}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-text-muted text-xs">
                      {article.publishedAt
                        ? timeAgo(new Date(article.publishedAt))
                        : "—"}
                    </td>
                    <td className="py-2 px-4 text-text-muted text-xs">
                      {timeAgo(new Date(article.updatedAt))}
                    </td>
                    <td className="py-2 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {article.status === "PUBLISHED" && (
                          <Link
                            href={`/guias/${article.slug}`}
                            target="_blank"
                            className="p-1 rounded hover:bg-surface-100 text-text-muted hover:text-accent-blue"
                            title="Ver artigo"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {articles.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-text-muted"
                  >
                    Nenhum artigo encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
