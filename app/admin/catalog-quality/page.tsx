import {
  Gauge,
  Package,
  Tag,
  ShieldCheck,
  Heart,
  Layers,
  Users,
  BarChart3,
} from "lucide-react";
import prisma from "@/lib/db/prisma";
import {
  catalogOverallScore,
  categoryMaturity,
} from "@/lib/catalog/quality";

export const dynamic = "force-dynamic";

async function getCategoryMaturityAll() {
  const categories = await prisma.category.findMany({
    where: {
      products: { some: { status: "ACTIVE" } },
    },
    select: { id: true },
    take: 50,
  });

  const results = await Promise.all(
    categories.map((c) => categoryMaturity(c.id))
  );

  return results.sort((a, b) => b.score - a.score);
}

export default async function CatalogQualityPage() {
  const [overall, categories] = await Promise.all([
    catalogOverallScore(),
    getCategoryMaturityAll(),
  ]);

  const scoreColor =
    overall.score >= 70
      ? "text-emerald-600"
      : overall.score >= 40
        ? "text-amber-600"
        : "text-red-600";

  const scoreBg =
    overall.score >= 70
      ? "bg-emerald-50 border-emerald-200"
      : overall.score >= 40
        ? "bg-amber-50 border-amber-200"
        : "bg-red-50 border-red-200";

  // Identify top issues
  const lowMaturityCategories = categories.filter((c) => c.score < 40);
  const lowCompletenessFlag = overall.avgCompleteness < 60;
  const lowOfferHealthFlag = overall.avgOfferHealth < 60;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
          <Gauge className="h-6 w-6 text-accent-blue" />
          Qualidade do Catalogo
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Score geral de qualidade, completude de produtos, saude das ofertas e maturidade por categoria
        </p>
      </div>

      {/* Overall Score Hero */}
      <div className={`rounded-xl border p-6 ${scoreBg} flex items-center gap-6`}>
        <div className="flex-shrink-0 text-center">
          <p className={`text-5xl font-bold font-display ${scoreColor}`}>{overall.score}</p>
          <p className="text-xs text-text-muted mt-1">/ 100</p>
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-text-primary mb-2">Score Geral do Catalogo</h2>
          <p className="text-sm text-text-muted">
            Calculado com base em completude de produtos (35%), saude das ofertas (35%),
            diversidade de categorias (15%) e taxa de produtos ativos (15%).
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          icon={Package}
          label="Total Produtos"
          value={overall.totalProducts}
        />
        <MetricCard
          icon={ShieldCheck}
          label="Ativos"
          value={overall.activeProducts}
          sub={overall.totalProducts > 0
            ? `${Math.round((overall.activeProducts / overall.totalProducts) * 100)}%`
            : undefined}
        />
        <MetricCard
          icon={BarChart3}
          label="Completude Media"
          value={overall.avgCompleteness}
          sub="/100"
          valueColor={overall.avgCompleteness >= 60 ? "text-emerald-600" : "text-amber-600"}
        />
        <MetricCard
          icon={Heart}
          label="Saude Ofertas"
          value={overall.avgOfferHealth}
          sub="/100"
          valueColor={overall.avgOfferHealth >= 60 ? "text-emerald-600" : "text-amber-600"}
        />
        <MetricCard
          icon={Layers}
          label="Categorias"
          value={overall.categoriesWithProducts}
        />
        <MetricCard
          icon={Users}
          label="Marcas"
          value={overall.brandsWithProducts}
        />
      </div>

      {/* Top Issues */}
      {(lowCompletenessFlag || lowOfferHealthFlag || lowMaturityCategories.length > 0) && (
        <section className="bg-white rounded-xl border border-surface-200 p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Tag className="h-5 w-5 text-orange-500" />
            Principais Problemas
          </h2>
          <div className="space-y-2">
            {lowCompletenessFlag && (
              <div className="flex items-center gap-3 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                <BarChart3 className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">Completude media abaixo de 60</p>
                  <p className="text-xs text-text-muted">
                    Score atual: {overall.avgCompleteness}/100. Produtos precisam de mais atributos preenchidos (imagem, descricao, marca, categoria, preco).
                  </p>
                </div>
              </div>
            )}
            {lowOfferHealthFlag && (
              <div className="flex items-center gap-3 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                <Heart className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">Saude das ofertas abaixo de 60</p>
                  <p className="text-xs text-text-muted">
                    Score atual: {overall.avgOfferHealth}/100. Ofertas precisam de preco original, affiliate URL e atualizacao recente.
                  </p>
                </div>
              </div>
            )}
            {lowMaturityCategories.length > 0 && (
              <div className="flex items-center gap-3 px-3 py-2.5 bg-orange-50 border border-orange-200 rounded-lg">
                <Layers className="h-4 w-4 text-orange-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">
                    {lowMaturityCategories.length} categoria(s) com maturidade baixa (&lt;40)
                  </p>
                  <p className="text-xs text-text-muted">
                    {lowMaturityCategories.slice(0, 3).map((c) => c.categoryName).join(", ")}
                    {lowMaturityCategories.length > 3 ? ` e mais ${lowMaturityCategories.length - 3}` : ""}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Category Maturity Table */}
      <section className="bg-white rounded-xl border border-surface-200 p-5">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Layers className="h-5 w-5 text-accent-blue" />
          Maturidade por Categoria
        </h2>
        {categories.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">Nenhuma categoria com produtos ativos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 text-text-muted">
                  <th className="text-left py-2 pr-4">Categoria</th>
                  <th className="text-right py-2 px-4">Produtos</th>
                  <th className="text-right py-2 px-4">Import %</th>
                  <th className="text-right py-2 px-4">Brand Cov.</th>
                  <th className="text-right py-2 px-4">Faixa de Preco</th>
                  <th className="text-right py-2 pl-4">Score</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => {
                  const catScoreColor =
                    cat.score >= 70
                      ? "text-emerald-700 bg-emerald-50"
                      : cat.score >= 40
                        ? "text-amber-700 bg-amber-50"
                        : "text-red-700 bg-red-50";
                  return (
                    <tr key={cat.categoryId} className="border-b border-surface-100 hover:bg-surface-50">
                      <td className="py-2 pr-4 font-medium">{cat.categoryName}</td>
                      <td className="py-2 px-4 text-right">{cat.productCount}</td>
                      <td className="py-2 px-4 text-right text-text-muted">
                        {Math.round(cat.importedRatio * 100)}%
                      </td>
                      <td className="py-2 px-4 text-right text-text-muted">
                        {Math.round(cat.brandCoverage * 100)}%
                      </td>
                      <td className="py-2 px-4 text-right text-text-muted">
                        {cat.priceRange
                          ? `R$ ${cat.priceRange.min.toFixed(0)} - ${cat.priceRange.max.toFixed(0)}`
                          : "-"}
                      </td>
                      <td className="py-2 pl-4 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${catScoreColor}`}>
                          {cat.score}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ── Sub-components ──

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  valueColor,
}: {
  icon: typeof Package;
  label: string;
  value: number;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-text-muted" />
        <span className="text-xs text-text-muted uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-end gap-1">
        <p className={`text-2xl font-bold font-display ${valueColor || "text-text-primary"}`}>
          {value.toLocaleString("pt-BR")}
        </p>
        {sub && <span className="text-xs text-text-muted mb-0.5">{sub}</span>}
      </div>
    </div>
  );
}
