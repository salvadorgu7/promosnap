// ============================================
// SOURCING STRATEGY — pipeline orchestration
// ============================================

import prisma from "@/lib/db/prisma";
import { getActiveStrategy, getStrategyInfo } from "@/lib/ingest/strategy";
import type { IngestStrategyInfo } from "@/lib/ingest/types";

// ─── Types ──────────────────────────────────────────────────────────────────

export type SourcingMode =
  | "curated-manual"
  | "import-csv-json"
  | "affiliate-feed"
  | "trends-assisted"
  | "candidate-expansion"
  | "source-adapter";

export interface SourcingPipeline {
  mode: SourcingMode;
  label: string;
  description: string;
  isActive: boolean;
  itemsTotal: number;
  itemsPending: number;
  lastRunAt: Date | null;
}

export interface SourcingStats {
  mode: SourcingMode;
  itemsSourced: number;
  itemsPending: number;
  itemsPublished: number;
}

// ─── Pipeline Definitions ───────────────────────────────────────────────────

const PIPELINE_DEFS: Record<
  SourcingMode,
  { label: string; description: string }
> = {
  "curated-manual": {
    label: "Curadoria Manual",
    description:
      "Adicao manual de produtos por ID ou URL de marketplace. Ideal para controle total.",
  },
  "import-csv-json": {
    label: "Importacao CSV/JSON",
    description:
      "Importacao em lote via arquivos CSV ou JSON com validacao e enriquecimento automatico.",
  },
  "affiliate-feed": {
    label: "Feed de Afiliados",
    description:
      "Ingestao automatica via feeds de redes de afiliados (Lomadee, Awin, etc).",
  },
  "trends-assisted": {
    label: "Tendencias Assistidas",
    description:
      "Descoberta automatica baseada em palavras-chave populares e tendencias de busca.",
  },
  "candidate-expansion": {
    label: "Expansao de Candidatos",
    description:
      "Expansao do catalogo a partir de candidatos existentes e produtos relacionados.",
  },
  "source-adapter": {
    label: "Adapter de Fonte",
    description:
      "Conexao direta com APIs de marketplaces (Mercado Livre, Amazon, etc).",
  },
};

// Map ingest strategies to sourcing modes
const INGEST_TO_SOURCING: Record<string, SourcingMode> = {
  curated: "curated-manual",
  import: "import-csv-json",
  trends: "trends-assisted",
  adapter: "source-adapter",
  seed: "curated-manual",
};

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns all available sourcing pipelines with current status.
 */
export async function getSourcingPipelines(): Promise<SourcingPipeline[]> {
  const activeConfig = getActiveStrategy();
  const activeMode = INGEST_TO_SOURCING[activeConfig.strategy] || "curated-manual";

  // Get counts from DB
  const [
    totalCandidates,
    pendingCandidates,
    importBatches,
    lastJob,
  ] = await Promise.all([
    prisma.catalogCandidate.count(),
    prisma.catalogCandidate.count({ where: { status: "PENDING" } }),
    prisma.importBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: 1,
      select: { createdAt: true },
    }),
    prisma.jobRun.findFirst({
      where: { jobName: { startsWith: "ingest" } },
      orderBy: { startedAt: "desc" },
      select: { startedAt: true },
    }),
  ]);

  const lastImportAt = importBatches[0]?.createdAt ?? null;
  const lastJobAt = lastJob?.startedAt ?? null;

  const pipelines: SourcingPipeline[] = Object.entries(PIPELINE_DEFS).map(
    ([mode, def]) => {
      const sourcingMode = mode as SourcingMode;
      const isActive = sourcingMode === activeMode;

      // Estimate items per pipeline
      let itemsTotal = 0;
      let itemsPending = 0;
      let pipelineLastRun: Date | null = null;

      if (sourcingMode === "import-csv-json") {
        itemsTotal = totalCandidates;
        itemsPending = pendingCandidates;
        pipelineLastRun = lastImportAt;
      } else if (isActive) {
        itemsTotal = totalCandidates;
        itemsPending = pendingCandidates;
        pipelineLastRun = lastJobAt;
      }

      return {
        mode: sourcingMode,
        label: def.label,
        description: def.description,
        isActive,
        itemsTotal,
        itemsPending,
        lastRunAt: pipelineLastRun,
      };
    }
  );

  return pipelines;
}

/**
 * Returns stats per sourcing mode.
 */
export async function getSourcingStats(): Promise<SourcingStats[]> {
  const [pending, approved, imported, rejected] = await Promise.all([
    prisma.catalogCandidate.count({ where: { status: "PENDING" } }),
    prisma.catalogCandidate.count({ where: { status: "APPROVED" } }),
    prisma.catalogCandidate.count({ where: { status: "IMPORTED" } }),
    prisma.catalogCandidate.count({ where: { status: "REJECTED" } }),
  ]);

  const activeConfig = getActiveStrategy();
  const activeMode = INGEST_TO_SOURCING[activeConfig.strategy] || "curated-manual";

  // Distribute stats across active pipeline
  return Object.keys(PIPELINE_DEFS).map((mode) => {
    const sourcingMode = mode as SourcingMode;
    const isActive = sourcingMode === activeMode || sourcingMode === "import-csv-json";

    return {
      mode: sourcingMode,
      itemsSourced: isActive ? pending + approved + imported + rejected : 0,
      itemsPending: isActive ? pending + approved : 0,
      itemsPublished: isActive ? imported : 0,
    };
  });
}

/**
 * Returns which pipelines are currently active.
 */
export async function getActivePipelines(): Promise<SourcingPipeline[]> {
  const all = await getSourcingPipelines();
  return all.filter((p) => p.isActive);
}

/**
 * Returns the active ingest strategy info for display.
 */
export function getActiveStrategyInfo(): IngestStrategyInfo {
  const config = getActiveStrategy();
  const info = getStrategyInfo(config.strategy);
  return Array.isArray(info) ? info[0] : info;
}
