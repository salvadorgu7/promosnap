// ============================================
// FEED SYNC JOBS — V22
// Sync jobs that can run from cron or admin UI
// ============================================

import prisma from "@/lib/db/prisma";
import { getFeedSyncConfigs } from "@/lib/sourcing/feed-sync";
import {
  runFullSyncPipeline,
  markStaleItems,
  getFeedSyncStats,
} from "./engine";
import { logger } from "@/lib/logger";
import type { FeedItem, FeedBatchResult, FeedSyncJob, SyncJobStatus } from "./types";

// ---------------------------------------------------------------------------
// In-memory job registry
// ---------------------------------------------------------------------------

const jobRegistry: Map<string, { description: string; handler: () => Promise<unknown> }> = new Map();
const jobHistory: FeedSyncJob[] = [];
const MAX_JOB_HISTORY = 100;
let jobCounter = 0;

function recordJob(job: FeedSyncJob): void {
  jobHistory.unshift(job);
  if (jobHistory.length > MAX_JOB_HISTORY) {
    jobHistory.length = MAX_JOB_HISTORY;
  }
}

export function getJobHistory(limit = 50): FeedSyncJob[] {
  return jobHistory.slice(0, limit);
}

export function getRegisteredJobs(): { name: string; description: string }[] {
  return Array.from(jobRegistry.entries()).map(([name, info]) => ({
    name,
    description: info.description,
  }));
}

// ---------------------------------------------------------------------------
// sourceSyncJob — full sync for a single source
// ---------------------------------------------------------------------------

export async function sourceSyncJob(
  sourceId: string
): Promise<FeedSyncJob> {
  const jobId = `fsj_${++jobCounter}_${Date.now()}`;
  const job: FeedSyncJob = {
    id: jobId,
    sourceId,
    status: "running",
    startedAt: new Date(),
  };

  try {
    // Try to find feed config for this source
    const configs = getFeedSyncConfigs();
    const config = configs.find((c) => c.sourceId === sourceId);

    if (!config) {
      // No config found — create empty result
      job.status = "failed";
      job.error = `Nenhuma configuracao de feed encontrada para source "${sourceId}"`;
      job.completedAt = new Date();
      job.result = {
        total: 0,
        valid: 0,
        invalid: 0,
        enriched: 0,
        published: 0,
        stale: 0,
        errors: [job.error],
        logs: [`[ERROR] ${job.error}`],
      };
      recordJob(job);
      return job;
    }

    if (!config.enabled) {
      job.status = "failed";
      job.error = `Feed sync para "${sourceId}" esta desabilitado`;
      job.completedAt = new Date();
      job.result = {
        total: 0,
        valid: 0,
        invalid: 0,
        enriched: 0,
        published: 0,
        stale: 0,
        errors: [job.error],
        logs: [`[ERROR] ${job.error}`],
      };
      recordJob(job);
      return job;
    }

    // In a real system, we'd fetch feed data from config.url
    // For now, attempt to get items from existing catalog candidates as a passthrough
    const existingCandidates = await prisma.catalogCandidate.findMany({
      where: {
        sourceSlug: sourceId,
        status: "PENDING",
      },
      take: 100,
      orderBy: { createdAt: "desc" },
    });

    if (existingCandidates.length === 0) {
      job.status = "success";
      job.completedAt = new Date();
      job.result = {
        total: 0,
        valid: 0,
        invalid: 0,
        enriched: 0,
        published: 0,
        stale: 0,
        errors: [],
        logs: [
          `[INFO] Nenhum item pendente encontrado para source "${sourceId}"`,
          `[INFO] Feed URL: ${config.url || "(nao configurada)"}`,
          "[INFO] Integracao de fetch real pendente — usando candidatos existentes",
        ],
      };
      recordJob(job);
      return job;
    }

    // Convert candidates to FeedItems
    const feedItems: FeedItem[] = existingCandidates
      .filter((c) => c.price != null && c.price > 0)
      .map((c) => ({
        title: c.title,
        price: c.price!,
        originalPrice: c.originalPrice ?? undefined,
        url: c.affiliateUrl || `https://www.promosnap.com.br/p/${c.id}`,
        imageUrl: c.imageUrl ?? undefined,
        brand: c.brand ?? undefined,
        category: c.category ?? undefined,
        source: sourceId,
      }));

    if (feedItems.length === 0) {
      job.status = "success";
      job.completedAt = new Date();
      job.result = {
        total: existingCandidates.length,
        valid: 0,
        invalid: existingCandidates.length,
        enriched: 0,
        published: 0,
        stale: 0,
        errors: ["Nenhum candidato com preco valido encontrado"],
        logs: [
          `[INFO] ${existingCandidates.length} candidatos encontrados, mas nenhum com preco valido`,
        ],
      };
      recordJob(job);
      return job;
    }

    // Run full pipeline
    const { result } = await runFullSyncPipeline(feedItems, sourceId);

    job.status = result.errors.length === 0 ? "success" : "partial";
    job.completedAt = new Date();
    job.result = result;
    recordJob(job);
    return job;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    job.status = "failed";
    job.error = msg;
    job.completedAt = new Date();
    job.result = {
      total: 0,
      valid: 0,
      invalid: 0,
      enriched: 0,
      published: 0,
      stale: 0,
      errors: [msg],
      logs: [`[ERROR] ${msg}`],
    };
    recordJob(job);
    return job;
  }
}

// ---------------------------------------------------------------------------
// staleCleanupJob — mark stale offers across all sources
// ---------------------------------------------------------------------------

export async function staleCleanupJob(
  maxAgeDays = 14
): Promise<FeedSyncJob> {
  const jobId = `fsj_stale_${++jobCounter}_${Date.now()}`;
  const job: FeedSyncJob = {
    id: jobId,
    sourceId: "all",
    status: "running",
    startedAt: new Date(),
  };

  try {
    const sources = await prisma.source.findMany({ take: 50 });
    let totalStale = 0;
    const errors: string[] = [];
    const logs: string[] = [`[INFO] Verificando stale items em ${sources.length} fontes (maxAgeDays=${maxAgeDays})`];

    for (const source of sources) {
      try {
        const { staleCount } = await markStaleItems(source.slug, maxAgeDays);
        if (staleCount > 0) {
          logs.push(`[INFO] ${source.name}: ${staleCount} ofertas marcadas como stale`);
          totalStale += staleCount;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Erro ao verificar ${source.name}: ${msg}`);
        logs.push(`[ERROR] ${source.name}: ${msg}`);
      }
    }

    logs.push(`[INFO] Total stale: ${totalStale} ofertas marcadas como inativas`);

    job.status = errors.length === 0 ? "success" : "partial";
    job.completedAt = new Date();
    job.result = {
      total: sources.length,
      valid: 0,
      invalid: 0,
      enriched: 0,
      published: 0,
      stale: totalStale,
      errors,
      logs,
    };
    recordJob(job);
    return job;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    job.status = "failed";
    job.error = msg;
    job.completedAt = new Date();
    job.result = {
      total: 0,
      valid: 0,
      invalid: 0,
      enriched: 0,
      published: 0,
      stale: 0,
      errors: [msg],
      logs: [`[ERROR] ${msg}`],
    };
    recordJob(job);
    return job;
  }
}

// ---------------------------------------------------------------------------
// refreshOfferJob — refresh a single offer's price/status
// ---------------------------------------------------------------------------

export async function refreshOfferJob(
  offerId: string
): Promise<FeedSyncJob> {
  const jobId = `fsj_refresh_${++jobCounter}_${Date.now()}`;
  const job: FeedSyncJob = {
    id: jobId,
    sourceId: offerId,
    status: "running",
    startedAt: new Date(),
  };

  try {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        listing: {
          include: { source: true },
        },
      },
    });

    if (!offer) {
      job.status = "failed";
      job.error = `Oferta "${offerId}" nao encontrada`;
      job.completedAt = new Date();
      job.result = {
        total: 0,
        valid: 0,
        invalid: 0,
        enriched: 0,
        published: 0,
        stale: 0,
        errors: [job.error],
        logs: [`[ERROR] ${job.error}`],
      };
      recordJob(job);
      return job;
    }

    // Touch lastSeenAt to keep it fresh
    await prisma.offer.update({
      where: { id: offerId },
      data: { lastSeenAt: new Date() },
    });

    job.status = "success";
    job.completedAt = new Date();
    job.result = {
      total: 1,
      valid: 1,
      invalid: 0,
      enriched: 0,
      published: 0,
      stale: 0,
      errors: [],
      logs: [
        `[INFO] Oferta "${offerId}" atualizada — lastSeenAt renovado`,
        `[INFO] Preco atual: R$ ${offer.currentPrice.toFixed(2)}`,
        `[INFO] Source: ${offer.listing?.source?.name || "desconhecida"}`,
        "[INFO] Integracao de refresh real de preco pendente",
      ],
    };
    recordJob(job);
    return job;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    job.status = "failed";
    job.error = msg;
    job.completedAt = new Date();
    job.result = {
      total: 0,
      valid: 0,
      invalid: 0,
      enriched: 0,
      published: 0,
      stale: 0,
      errors: [msg],
      logs: [`[ERROR] ${msg}`],
    };
    recordJob(job);
    return job;
  }
}

// ---------------------------------------------------------------------------
// registerSyncJobs — register all sync jobs in the system
// ---------------------------------------------------------------------------

export function registerSyncJobs(): void {
  jobRegistry.set("feed-sync:source", {
    description: "Sync completo de uma fonte de feed (validate, normalize, enrich, publish)",
    handler: async () => {
      // When called without params, sync all configured sources
      const configs = getFeedSyncConfigs();
      const results: FeedSyncJob[] = [];
      for (const config of configs) {
        if (config.enabled) {
          const result = await sourceSyncJob(config.sourceId);
          results.push(result);
        }
      }
      return results;
    },
  });

  jobRegistry.set("feed-sync:stale-cleanup", {
    description: "Marca ofertas stale (> 14 dias sem atualizacao) como inativas",
    handler: () => staleCleanupJob(14),
  });

  jobRegistry.set("feed-sync:refresh-offer", {
    description: "Atualiza preco/status de uma oferta individual",
    handler: async () => {
      // When called without params, this is a no-op
      return { message: "refreshOfferJob requer offerId como parametro" };
    },
  });

  logger.info("feed-sync.jobs-registered", { count: jobRegistry.size });
}

// Auto-register on module load
registerSyncJobs();
