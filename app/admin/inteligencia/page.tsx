import {
  Lightbulb,
  AlertTriangle,
  TrendingUp,
  FolderOpen,
  BarChart3,
  Package,
  MousePointerClick,
  Eye,
} from "lucide-react";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminInteligenciaPage() {
  // Products with 0 clickouts (wasted catalog)
  let wastedProducts: { id: string; name: string; slug: string; popularityScore: number }[] = [];
  try {
    wastedProducts = await prisma.$queryRaw`
      SELECT p.id, p.name, p.slug, p."popularityScore"
      FROM products p
      JOIN listings l ON l."productId" = p.id
      JOIN offers o ON o."listingId" = l.id AND o."isActive" = true
      LEFT JOIN clickouts c ON c."offerId" = o.id
      WHERE p.status = 'ACTIVE'
      GROUP BY p.id, p.name, p.slug, p."popularityScore"
      HAVING COUNT(c.id) = 0
      ORDER BY p."popularityScore" DESC
      LIMIT 20
    `;
  } catch {}

  // Products with high popularity but low clickouts (opportunity)
  let opportunityProducts: {
    id: string;
    name: string;
    slug: string;
    popularityScore: number;
    clickout_count: number;
  }[] = [];
  try {
    opportunityProducts = await prisma.$queryRaw`
      SELECT p.id, p.name, p.slug, p."popularityScore",
             COUNT(c.id)::int AS clickout_count
      FROM products p
      JOIN listings l ON l."productId" = p.id
      JOIN offers o ON o."listingId" = l.id AND o."isActive" = true
      LEFT JOIN clickouts c ON c."offerId" = o.id
      WHERE p.status = 'ACTIVE' AND p."popularityScore" > 5
      GROUP BY p.id, p.name, p.slug, p."popularityScore"
      HAVING COUNT(c.id) < 3
      ORDER BY p."popularityScore" DESC
      LIMIT 20
    `;
  } catch {}

  // Categories with few products (gaps)
  let categoryGaps: { id: string; name: string; slug: string; product_count: number }[] = [];
  try {
    categoryGaps = await prisma.$queryRaw`
      SELECT c.id, c.name, c.slug,
             COUNT(p.id)::int AS product_count
      FROM categories c
      LEFT JOIN products p ON p."categoryId" = c.id AND p.status = 'ACTIVE'
      GROUP BY c.id, c.name, c.slug
      ORDER BY COUNT(p.id) ASC
      LIMIT 15
    `;
  } catch {}

  // Average offer score by category
  let avgScoreByCategory: { name: string; slug: string; avg_score: number; offer_count: number }[] =
    [];
  try {
    avgScoreByCategory = await prisma.$queryRaw`
      SELECT c.name, c.slug,
             ROUND(AVG(o."offerScore")::numeric, 2)::float AS avg_score,
             COUNT(o.id)::int AS offer_count
      FROM categories c
      JOIN products p ON p."categoryId" = c.id AND p.status = 'ACTIVE'
      JOIN listings l ON l."productId" = p.id
      JOIN offers o ON o."listingId" = l.id AND o."isActive" = true
      GROUP BY c.id, c.name, c.slug
      HAVING COUNT(o.id) >= 1
      ORDER BY AVG(o."offerScore") DESC
      LIMIT 15
    `;
  } catch {}

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-accent-orange" />
          Inteligencia
        </h1>
        <p className="text-sm text-text-muted">
          Insights sobre catalogo, oportunidades e gaps
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-accent-red" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Catalogo Ocioso</span>
          </div>
          <p className="text-3xl font-bold font-display text-text-primary">
            {wastedProducts.length}
          </p>
          <p className="text-xs text-text-muted mt-1">produtos sem cliques</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-accent-blue" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Oportunidades</span>
          </div>
          <p className="text-3xl font-bold font-display text-text-primary">
            {opportunityProducts.length}
          </p>
          <p className="text-xs text-text-muted mt-1">populares sem conversao</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen className="h-4 w-4 text-accent-orange" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Categorias Gap</span>
          </div>
          <p className="text-3xl font-bold font-display text-text-primary">
            {categoryGaps.filter((c) => c.product_count < 3).length}
          </p>
          <p className="text-xs text-text-muted mt-1">com menos de 3 produtos</p>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-accent-green" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Categorias Avaliadas</span>
          </div>
          <p className="text-3xl font-bold font-display text-text-primary">
            {avgScoreByCategory.length}
          </p>
          <p className="text-xs text-text-muted mt-1">com ofertas ativas</p>
        </div>
      </div>

      {/* Wasted catalog */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold font-display text-text-primary mb-1 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-accent-red" />
          Catalogo Ocioso
        </h2>
        <p className="text-xs text-text-muted mb-4">
          Produtos com ofertas ativas mas zero clickouts — oportunidade de destaque
        </p>
        {wastedProducts.length > 0 ? (
          <div className="space-y-2">
            {wastedProducts.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-50">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary truncate">{p.name}</p>
                  <p className="text-xs text-text-muted">/produto/{p.slug}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-text-muted">Popularidade</p>
                    <p className="text-sm font-semibold text-text-primary">
                      {p.popularityScore.toFixed(1)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-accent-red">
                    <MousePointerClick className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">0</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-accent-green text-center py-4">
            Todos os produtos com ofertas tem clickouts.
          </p>
        )}
      </div>

      {/* Opportunity products */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold font-display text-text-primary mb-1 flex items-center gap-2">
          <Eye className="h-4 w-4 text-accent-blue" />
          Oportunidades
        </h2>
        <p className="text-xs text-text-muted mb-4">
          Produtos com alta popularidade mas poucos clickouts — possivel problema de posicionamento
        </p>
        {opportunityProducts.length > 0 ? (
          <div className="space-y-2">
            {opportunityProducts.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-50">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary truncate">{p.name}</p>
                  <p className="text-xs text-text-muted">/produto/{p.slug}</p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-xs text-text-muted">Popularidade</p>
                    <p className="text-sm font-bold text-accent-blue">
                      {p.popularityScore.toFixed(1)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-muted">Cliques</p>
                    <p className="text-sm font-semibold text-accent-orange">
                      {p.clickout_count}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted text-center py-4">
            Nenhuma oportunidade identificada.
          </p>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Category gaps */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold font-display text-text-primary mb-1 flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-accent-orange" />
            Categorias com Poucos Produtos
          </h2>
          <p className="text-xs text-text-muted mb-4">Gaps no catalogo para preencher</p>
          {categoryGaps.length > 0 ? (
            <div className="space-y-2">
              {categoryGaps.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-50">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{c.name}</p>
                    <p className="text-xs text-text-muted">/categoria/{c.slug}</p>
                  </div>
                  <span
                    className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${
                      c.product_count === 0
                        ? "bg-red-50 text-red-500"
                        : c.product_count < 3
                        ? "bg-orange-50 text-accent-orange"
                        : "bg-green-50 text-accent-green"
                    }`}
                  >
                    {c.product_count} {c.product_count === 1 ? "produto" : "produtos"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted text-center py-4">Nenhuma categoria encontrada.</p>
          )}
        </div>

        {/* Avg score by category */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold font-display text-text-primary mb-1 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-accent-green" />
            Score Medio por Categoria
          </h2>
          <p className="text-xs text-text-muted mb-4">Qualidade media das ofertas</p>
          {avgScoreByCategory.length > 0 ? (
            <div className="space-y-2">
              {avgScoreByCategory.map((c) => (
                <div key={c.slug} className="flex items-center justify-between p-3 rounded-lg bg-surface-50">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{c.name}</p>
                    <p className="text-xs text-text-muted">{c.offer_count} ofertas</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-surface-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-green"
                        style={{ width: `${Math.min(100, (c.avg_score / 10) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-text-primary w-10 text-right">
                      {c.avg_score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted text-center py-4">
              Nenhuma categoria com ofertas ativas.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
