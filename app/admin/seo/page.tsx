import { Search, FileText, Image, Tag, AlertTriangle, CheckCircle, XCircle, Layers } from "lucide-react";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSEOPage() {
  // Count pages by type
  const [productsCount, categoriesCount, brandsCount] = await Promise.all([
    prisma.product.count({ where: { status: "ACTIVE" } }).catch(() => 0),
    prisma.category.count().catch(() => 0),
    prisma.brand.count().catch(() => 0),
  ]);

  // Static pages estimate (home, melhores, ofertas, about, etc.)
  const staticPages = 5;
  const totalIndexable = productsCount + categoriesCount + brandsCount + staticPages;

  // Products without images
  const productsNoImage = await prisma.product.count({
    where: { status: "ACTIVE", imageUrl: null },
  }).catch(() => 0);

  // Brands without products
  let brandsNoProducts = 0;
  try {
    const result: any[] = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM brands b
      LEFT JOIN products p ON p."brandId" = b.id AND p.status = 'ACTIVE'
      WHERE p.id IS NULL
    `;
    brandsNoProducts = result[0]?.count ?? 0;
  } catch {}

  // Empty categories (no active products)
  let emptyCategories = 0;
  try {
    const result: any[] = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS count
      FROM categories c
      LEFT JOIN products p ON p."categoryId" = c.id AND p.status = 'ACTIVE'
      WHERE p.id IS NULL
    `;
    emptyCategories = result[0]?.count ?? 0;
  } catch {}

  // Products without description
  const productsNoDesc = await prisma.product.count({
    where: { status: "ACTIVE", OR: [{ description: null }, { description: "" }] },
  }).catch(() => 0);

  // Calculate SEO health score (100 - penalties)
  let score = 100;
  if (productsCount > 0) {
    const noImagePct = (productsNoImage / productsCount) * 100;
    if (noImagePct > 50) score -= 30;
    else if (noImagePct > 20) score -= 15;
    else if (noImagePct > 5) score -= 5;

    const noDescPct = (productsNoDesc / productsCount) * 100;
    if (noDescPct > 50) score -= 20;
    else if (noDescPct > 20) score -= 10;
    else if (noDescPct > 5) score -= 5;
  }
  if (categoriesCount > 0) {
    const emptyCatPct = (emptyCategories / categoriesCount) * 100;
    if (emptyCatPct > 50) score -= 20;
    else if (emptyCatPct > 20) score -= 10;
    else if (emptyCatPct > 5) score -= 5;
  }
  if (brandsCount > 0) {
    const emptyBrandPct = (brandsNoProducts / brandsCount) * 100;
    if (emptyBrandPct > 50) score -= 15;
    else if (emptyBrandPct > 20) score -= 8;
    else if (emptyBrandPct > 5) score -= 3;
  }
  score = Math.max(0, Math.min(100, score));

  const scoreColor = score >= 80 ? "text-accent-green" : score >= 50 ? "text-accent-orange" : "text-red-500";
  const scoreBg = score >= 80 ? "bg-green-50" : score >= 50 ? "bg-orange-50" : "bg-red-50";
  const scoreLabel = score >= 80 ? "Bom" : score >= 50 ? "Atenção" : "Crítico";

  // Page breakdown
  const pageTypes = [
    { label: "Produtos", count: productsCount, icon: Tag, color: "text-accent-blue" },
    { label: "Categorias", count: categoriesCount, icon: Layers, color: "text-accent-green" },
    { label: "Marcas", count: brandsCount, icon: FileText, color: "text-accent-purple" },
    { label: "Paginas Estaticas", count: staticPages, icon: FileText, color: "text-text-muted" },
  ];

  // Issues list
  const issues: { label: string; value: number; total: number; severity: "good" | "warning" | "bad" }[] = [
    {
      label: "Produtos sem imagem",
      value: productsNoImage,
      total: productsCount,
      severity: productsCount === 0 ? "good" : (productsNoImage / productsCount) > 0.2 ? "bad" : (productsNoImage / productsCount) > 0.05 ? "warning" : "good",
    },
    {
      label: "Produtos sem descricao",
      value: productsNoDesc,
      total: productsCount,
      severity: productsCount === 0 ? "good" : (productsNoDesc / productsCount) > 0.2 ? "bad" : (productsNoDesc / productsCount) > 0.05 ? "warning" : "good",
    },
    {
      label: "Marcas sem produtos",
      value: brandsNoProducts,
      total: brandsCount,
      severity: brandsCount === 0 ? "good" : (brandsNoProducts / brandsCount) > 0.2 ? "bad" : (brandsNoProducts / brandsCount) > 0.05 ? "warning" : "good",
    },
    {
      label: "Categorias vazias",
      value: emptyCategories,
      total: categoriesCount,
      severity: categoriesCount === 0 ? "good" : (emptyCategories / categoriesCount) > 0.2 ? "bad" : (emptyCategories / categoriesCount) > 0.05 ? "warning" : "good",
    },
  ];

  const severityConfig = {
    good: { icon: CheckCircle, color: "text-accent-green", bg: "bg-green-50" },
    warning: { icon: AlertTriangle, color: "text-accent-orange", bg: "bg-orange-50" },
    bad: { icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary">SEO</h1>
        <p className="text-sm text-text-muted">Saude do conteudo e paginas indexaveis</p>
      </div>

      {/* Score + Total indexable */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className={`card p-5 ${scoreBg}`}>
          <div className="flex items-center gap-2 mb-2">
            <Search className={`h-4 w-4 ${scoreColor}`} />
            <span className="text-xs text-text-muted uppercase tracking-wider">Score SEO</span>
          </div>
          <p className={`text-3xl font-bold font-display ${scoreColor}`}>{score}</p>
          <p className={`text-xs font-medium ${scoreColor} mt-1`}>{scoreLabel}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-accent-blue" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Paginas Indexaveis</span>
          </div>
          <p className="text-3xl font-bold font-display text-text-primary">{totalIndexable.toLocaleString("pt-BR")}</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Image className="h-4 w-4 text-accent-orange" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Sem Imagem</span>
          </div>
          <p className="text-3xl font-bold font-display text-text-primary">{productsNoImage}</p>
          <p className="text-xs text-text-muted mt-1">de {productsCount} produtos</p>
        </div>
      </div>

      {/* Pages by type */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold font-display text-text-primary mb-4">Paginas por Tipo</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {pageTypes.map((pt) => (
            <div key={pt.label} className="text-center p-3 bg-surface-50 rounded-lg">
              <pt.icon className={`h-5 w-5 mx-auto mb-2 ${pt.color}`} />
              <p className="text-xl font-bold font-display text-text-primary">{pt.count.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-text-muted">{pt.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Issues */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold font-display text-text-primary mb-4">Problemas Detectados</h2>
        <div className="space-y-3">
          {issues.map((issue) => {
            const sc = severityConfig[issue.severity];
            const Icon = sc.icon;
            const pct = issue.total > 0 ? ((issue.value / issue.total) * 100).toFixed(0) : "0";

            return (
              <div key={issue.label} className="flex items-center justify-between p-3 rounded-lg bg-surface-50">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${sc.bg}`}>
                    <Icon className={`h-4 w-4 ${sc.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{issue.label}</p>
                    <p className="text-xs text-text-muted">{issue.value} de {issue.total} ({pct}%)</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sc.color} ${sc.bg}`}>
                  {issue.severity === "good" ? "OK" : issue.severity === "warning" ? "Atenção" : "Crítico"}
                </span>
              </div>
            );
          })}

          {issues.every((i) => i.severity === "good") && (
            <p className="text-sm text-accent-green text-center py-2">Nenhum problema critico encontrado.</p>
          )}
        </div>
      </div>
    </div>
  );
}
