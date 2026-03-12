import { getProductTrustReport } from "@/lib/data-trust";
import type { TrustReport, ProductTrustEntry } from "@/lib/data-trust/types";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingDown,
  BarChart3,
  Package,
  Info,
} from "lucide-react";
import {
  severityGradient,
  severitySolid,
} from "@/lib/admin/severity";
import type { Severity } from "@/lib/admin/severity";

export const dynamic = "force-dynamic";

function trustToSeverity(score: number): Severity {
  if (score >= 80) return "ok";
  if (score >= 60) return "info";
  if (score >= 40) return "warning";
  return "critical";
}

function trustColor(score: number): string {
  if (score >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (score >= 60) return "text-blue-600 bg-blue-50 border-blue-200";
  if (score >= 40) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-red-600 bg-red-50 border-red-200";
}

function trustLabel(score: number): string {
  if (score >= 80) return "Excelente";
  if (score >= 60) return "Bom";
  if (score >= 40) return "Regular";
  return "Baixo";
}

function TrustScoreBar({ score }: { score: number }) {
  const sev = trustToSeverity(score);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-surface-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-blue-500" : score >= 40 ? "bg-amber-500" : "bg-red-500"}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <span className="text-xs font-bold w-8 text-right">{score}</span>
    </div>
  );
}

function ProductRow({ entry }: { entry: ProductTrustEntry }) {
  const sev = trustToSeverity(entry.trustScore);
  return (
    <div className={`rounded-xl border p-4 ${trustColor(entry.trustScore)} transition-shadow hover:shadow-md`}>
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-lg bg-white/80 flex items-center justify-center overflow-hidden shadow-sm flex-shrink-0">
          {entry.imageUrl ? (
            <img
              src={entry.imageUrl}
              alt=""
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <Package className="h-5 w-5 opacity-40" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-sm truncate">{entry.productName}</h3>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider flex-shrink-0 ${severitySolid(sev)}`}
            >
              {trustLabel(entry.trustScore)} ({entry.trustScore})
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-[11px] opacity-70">
            {entry.brand && <span>Marca: {entry.brand}</span>}
            {entry.category && <span>Cat: {entry.category}</span>}
            <span>{entry.listingCount} listings</span>
            <span>{entry.offerCount} ofertas</span>
          </div>
          <div className="mt-2">
            <TrustScoreBar score={entry.trustScore} />
          </div>
          {entry.issues.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {entry.issues.map((issue, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-white/60 border border-current/10 px-2 py-0.5 text-[10px]"
                >
                  <AlertTriangle className="h-2.5 w-2.5" /> {issue}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default async function DataTrustPage() {
  const report: TrustReport = await getProductTrustReport();

  const overallSev = trustToSeverity(report.averageTrust);
  const lowTrustProducts = report.products.filter((p) => p.trustScore < 50);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary">
            Data Trust
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Scores de qualidade de dados e analise de confiabilidade dos produtos
          </p>
        </div>
        <div className="text-xs text-text-muted">
          {report.totalProducts} produtos analisados
        </div>
      </div>

      {/* Overall Banner */}
      <div
        className={`rounded-2xl bg-gradient-to-r ${severityGradient(overallSev)} p-6 text-white shadow-lg`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-white/20 p-3">
              <Shield className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-medium opacity-90">Trust Score Medio</p>
              <p className="text-3xl font-bold font-display">
                {report.averageTrust}/100
              </p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{report.distribution.excellent}</p>
              <p className="text-xs opacity-80">Excelente</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{report.distribution.good}</p>
              <p className="text-xs opacity-80">Bom</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{report.distribution.fair}</p>
              <p className="text-xs opacity-80">Regular</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{report.distribution.poor}</p>
              <p className="text-xs opacity-80">Baixo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Guidance for low trust */}
      {report.averageTrust < 60 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Trust score medio abaixo do ideal</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Produtos com trust score baixo geralmente precisam de: imagens de melhor qualidade,
              descricoes mais completas, precos consistentes entre fontes, ou categorias corretamente atribuidas.
              Verifique os problemas mais comuns abaixo.
            </p>
          </div>
        </div>
      )}

      {/* Distribution Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Trust Distribution */}
        <div className="rounded-xl border border-surface-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4" /> Distribuicao de Trust Score
          </h2>
          <div className="space-y-3">
            {[
              { label: "Excelente (80-100)", count: report.distribution.excellent, color: "bg-emerald-500" },
              { label: "Bom (60-79)", count: report.distribution.good, color: "bg-blue-500" },
              { label: "Regular (40-59)", count: report.distribution.fair, color: "bg-amber-500" },
              { label: "Baixo (0-39)", count: report.distribution.poor, color: "bg-red-500" },
            ].map((band) => (
              <div key={band.label} className="flex items-center gap-3">
                <span className="text-xs w-32 text-text-muted">{band.label}</span>
                <div className="flex-1 h-4 bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${band.color}`}
                    style={{
                      width: `${report.totalProducts > 0 ? (band.count / report.totalProducts) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-bold w-8 text-right">{band.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Issues */}
        <div className="rounded-xl border border-surface-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-4">
            <TrendingDown className="h-4 w-4" /> Problemas Mais Comuns
          </h2>
          {report.topIssues.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600 py-4">
              <CheckCircle2 className="h-4 w-4" /> Nenhum problema detectado
            </div>
          ) : (
            <div className="space-y-2">
              {report.topIssues.map((item) => (
                <div
                  key={item.issue}
                  className="flex items-center justify-between gap-2 py-1.5 border-b border-surface-100 last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                    <span className="text-xs text-text-secondary truncate">
                      {item.issue}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex-shrink-0">
                    {item.count}x
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Low Trust Products */}
      {lowTrustProducts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wider flex items-center gap-2">
            <XCircle className="h-4 w-4" /> Produtos com Trust Baixo ({lowTrustProducts.length})
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {lowTrustProducts.slice(0, 20).map((entry) => (
              <ProductRow key={entry.productId} entry={entry} />
            ))}
            {lowTrustProducts.length > 20 && (
              <p className="text-xs text-text-muted text-center py-2">
                +{lowTrustProducts.length - 20} produtos adicionais abaixo do limite
              </p>
            )}
          </div>
        </div>
      )}

      {/* All Products */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
          Todos os Produtos ({report.totalProducts})
        </h2>
        {report.products.length === 0 ? (
          <div className="rounded-xl border border-surface-200 bg-white p-8 text-center">
            <Package className="h-8 w-8 mx-auto mb-2 text-text-muted opacity-30" />
            <p className="text-sm text-text-muted">
              Nenhum produto no banco. Execute a ingestao de dados em /admin/ingestao para comecar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {report.products.slice(0, 50).map((entry) => (
              <ProductRow key={entry.productId} entry={entry} />
            ))}
            {report.products.length > 50 && (
              <p className="text-xs text-text-muted text-center py-2">
                Mostrando top 50 de {report.products.length} produtos (ordenado por trust score)
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
