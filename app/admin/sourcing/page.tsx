import {
  Package,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
} from "lucide-react";
import prisma from "@/lib/db/prisma";
import { getActiveStrategyInfo } from "@/lib/sourcing/strategy";
import SourcingActions from "./sourcing-actions";

export const dynamic = "force-dynamic";

export default async function SourcingPage() {
  // Fetch stats server-side for initial render
  const [
    pendingCount,
    approvedCount,
    rejectedCount,
    importedCount,
    totalBatches,
    totalProducts,
  ] = await Promise.all([
    prisma.catalogCandidate.count({ where: { status: "PENDING" } }),
    prisma.catalogCandidate.count({ where: { status: "APPROVED" } }),
    prisma.catalogCandidate.count({ where: { status: "REJECTED" } }),
    prisma.catalogCandidate.count({ where: { status: "IMPORTED" } }),
    prisma.importBatch.count(),
    prisma.product.count({ where: { status: "ACTIVE" } }),
  ]);

  const strategyInfo = getActiveStrategyInfo();
  const totalCandidates = pendingCount + approvedCount + rejectedCount + importedCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
          <Package className="h-6 w-6 text-accent-blue" />
          Sourcing de Catalogo
        </h1>
        <p className="text-sm text-text-muted">
          Pipelines de aquisicao, importacao e publicacao de produtos
        </p>
      </div>

      {/* Active strategy banner */}
      <div className="card p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider mb-0.5">
              Estrategia Ativa
            </p>
            <p className="text-lg font-bold font-display text-text-primary">
              {strategyInfo.label}
            </p>
            <p className="text-xs text-text-muted">{strategyInfo.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                strategyInfo.isAutomatic
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {strategyInfo.isAutomatic ? "Automatico" : "Manual"}
            </span>
          </div>
        </div>
      </div>

      {/* Stats summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatCard
          label="Total Candidatos"
          value={totalCandidates}
          icon={<TrendingUp className="h-4 w-4 text-accent-blue" />}
          color="text-text-primary"
        />
        <StatCard
          label="Pendentes"
          value={pendingCount}
          icon={<Clock className="h-4 w-4 text-amber-500" />}
          color="text-amber-600"
        />
        <StatCard
          label="Aprovados"
          value={approvedCount}
          icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
          color="text-green-600"
        />
        <StatCard
          label="Rejeitados"
          value={rejectedCount}
          icon={<XCircle className="h-4 w-4 text-red-400" />}
          color="text-red-500"
        />
        <StatCard
          label="Publicados"
          value={importedCount}
          icon={<Send className="h-4 w-4 text-indigo-500" />}
          color="text-indigo-600"
        />
        <StatCard
          label="Produtos Ativos"
          value={totalProducts}
          icon={<Package className="h-4 w-4 text-brand-500" />}
          color="text-brand-500"
        />
      </div>

      {/* Batch count */}
      <div className="text-xs text-text-muted">
        {totalBatches} lotes de importacao registrados
      </div>

      {/* Interactive client component */}
      <SourcingActions />
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="card p-3 flex items-center gap-3">
      <div className="flex-shrink-0">{icon}</div>
      <div>
        <p className={`text-lg font-bold font-display ${color}`}>{value}</p>
        <p className="text-[10px] text-text-muted">{label}</p>
      </div>
    </div>
  );
}
