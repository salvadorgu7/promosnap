import prisma from "@/lib/db/prisma";
import type { IngestStrategy, IngestConfig, IngestStats, IngestStrategyInfo } from "./types";

// ─── Strategy Definitions ────────────────────────────────────────────────────

const STRATEGY_INFO: Record<IngestStrategy, IngestStrategyInfo> = {
  curated: {
    strategy: "curated",
    label: "Curadoria Manual",
    description: "Produtos adicionados manualmente pela equipe via IDs ou URLs do marketplace.",
    isAutomatic: false,
    requiresApiKey: true,
  },
  seed: {
    strategy: "seed",
    label: "Seed Inicial",
    description: "Catalogo inicial via seed do banco de dados ou API de busca.",
    isAutomatic: false,
    requiresApiKey: true,
  },
  trends: {
    strategy: "trends",
    label: "Tendencias",
    description: "Ingestao automatica baseada em palavras-chave populares e tendencias de busca.",
    isAutomatic: true,
    requiresApiKey: true,
  },
  adapter: {
    strategy: "adapter",
    label: "Adapter Direto",
    description: "Ingestao via adaptadores de marketplace (Mercado Livre, Amazon, etc).",
    isAutomatic: true,
    requiresApiKey: true,
  },
  import: {
    strategy: "import",
    label: "Importacao CSV/JSON",
    description: "Importacao em lote via arquivos CSV ou JSON. Nao requer chave de API.",
    isAutomatic: false,
    requiresApiKey: false,
  },
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns the currently active ingest strategy based on env/config.
 * Falls back to "curated" if nothing is configured.
 */
export function getActiveStrategy(): IngestConfig {
  const envStrategy = (process.env.INGEST_STRATEGY || "curated") as IngestStrategy;
  const strategy = Object.keys(STRATEGY_INFO).includes(envStrategy) ? envStrategy : "curated";

  return {
    strategy,
    autoIngest: strategy === "trends" || strategy === "adapter",
    batchSize: parseInt(process.env.INGEST_BATCH_SIZE || "50", 10),
    intervalMinutes: parseInt(process.env.INGEST_INTERVAL_MINUTES || "60", 10),
    enabledSources: (process.env.INGEST_SOURCES || "mercadolivre").split(",").map((s) => s.trim()),
  };
}

/**
 * Returns human-readable info about a given strategy (or all strategies).
 */
export function getStrategyInfo(strategy?: IngestStrategy): IngestStrategyInfo | IngestStrategyInfo[] {
  if (strategy) {
    return STRATEGY_INFO[strategy] || STRATEGY_INFO.curated;
  }
  return Object.values(STRATEGY_INFO);
}

/**
 * Returns real-time stats about ingestion activity from the database.
 */
export async function getIngestStats(): Promise<IngestStats> {
  const config = getActiveStrategy();

  const [sourceCount, lastJob, pendingCandidates] = await Promise.all([
    prisma.source.count({ where: { status: "ACTIVE" } }),
    prisma.jobRun.findFirst({
      where: { jobName: { startsWith: "ingest" } },
      orderBy: { startedAt: "desc" },
    }),
    prisma.catalogCandidate.count({ where: { status: "PENDING" } }),
  ]);

  // Get totals from recent job runs
  const recentJobs = await prisma.jobRun.findMany({
    where: { jobName: { startsWith: "ingest" } },
    orderBy: { startedAt: "desc" },
    take: 20,
  });

  let totalIngested = 0;
  let totalFailed = 0;
  let lastBatchSize = 0;

  for (const job of recentJobs) {
    const meta = job.metadata as Record<string, number> | null;
    totalIngested += meta?.upserted ?? job.itemsDone ?? 0;
    totalFailed += meta?.failed ?? 0;
  }

  if (recentJobs[0]) {
    const meta = recentJobs[0].metadata as Record<string, number> | null;
    lastBatchSize = meta?.upserted ?? recentJobs[0].itemsDone ?? 0;
  }

  return {
    strategy: config.strategy,
    totalIngested,
    totalFailed,
    lastIngestAt: lastJob?.startedAt ?? null,
    lastBatchSize,
    activeSources: sourceCount,
    pendingCandidates,
  };
}
