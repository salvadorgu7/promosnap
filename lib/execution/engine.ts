// ============================================
// EXECUTION ENGINE — runs actions and tracks results
// ============================================

import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import type {
  ExecutionType,
  ExecutionStatus,
  ExecutionOrigin,
  ExecutionRecord,
  ExecutionSummary,
} from "./types";

// ─── In-memory store (FIFO, max 1000) ──────────────────────────────────────

const executionStore: ExecutionRecord[] = [];
const MAX_STORE_SIZE = 1000;
let executionCounter = 0;

function addRecord(record: ExecutionRecord): void {
  executionStore.unshift(record);
  if (executionStore.length > MAX_STORE_SIZE) {
    executionStore.length = MAX_STORE_SIZE;
  }
}

// ─── Execute ────────────────────────────────────────────────────────────────

export async function execute(
  type: ExecutionType,
  payload: Record<string, unknown>,
  origin: ExecutionOrigin = "manual",
  linkedOpportunityId?: string
): Promise<ExecutionRecord> {
  const id = `exec_${++executionCounter}_${Date.now()}`;
  const record: ExecutionRecord = {
    id,
    type,
    status: "running",
    origin,
    payload,
    result: null,
    error: null,
    retries: 0,
    createdAt: new Date(),
    completedAt: null,
    linkedOpportunityId,
  };

  addRecord(record);

  try {
    const result = await runExecution(type, payload);
    record.status = "success";
    record.result = result;
    record.completedAt = new Date();
  } catch (err) {
    record.status = "failed";
    record.error = err instanceof Error ? err.message : String(err);
    record.completedAt = new Date();
  }

  return record;
}

// ─── Type-specific handlers ─────────────────────────────────────────────────

async function runExecution(
  type: ExecutionType,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  switch (type) {
    case "create_banner":
      return handleCreateBanner(payload);
    case "feature_product":
      return handleFeatureProduct(payload);
    case "publish_distribution":
      return handlePublishDistribution(payload);
    case "trigger_job":
      return handleTriggerJob(payload);
    case "create_review_task":
      return handleCreateReviewTask(payload);
    case "create_import_batch":
      return handleCreateImportBatch(payload);
    case "trigger_email":
      return handleTriggerEmail(payload);
    case "trigger_webhook":
      return handleTriggerWebhook(payload);
    case "create_campaign":
      return handleCreateCampaign(payload);
    default:
      throw new Error(`Unknown execution type: ${type}`);
  }
}

async function handleCreateBanner(
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const banner = await prisma.banner.create({
    data: {
      title: (payload.title as string) || "Banner automatico",
      subtitle: (payload.subtitle as string) || null,
      imageUrl: (payload.imageUrl as string) || null,
      ctaText: (payload.ctaText as string) || "Ver oferta",
      ctaUrl: (payload.ctaUrl as string) || "/ofertas",
      bannerType: "HERO",
      priority: (payload.priority as number) || 0,
      isActive: true,
      autoMode: (payload.autoMode as string) || null,
    },
  });
  return { bannerId: banner.id, title: banner.title };
}

async function handleFeatureProduct(
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const productId = payload.productId as string;
  if (!productId) throw new Error("productId is required");

  const product = await prisma.product.update({
    where: { id: productId },
    data: { featured: true },
    select: { id: true, name: true, slug: true },
  });
  return { productId: product.id, name: product.name, slug: product.slug };
}

async function handlePublishDistribution(
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  // Import distribution engine dynamically to avoid circular deps
  const { distributeToSegment } = await import("@/lib/distribution/engine");
  const segment = (payload.segment as string) || "geral";
  const channel = (payload.channel as string) || "homepage";
  const limit = (payload.limit as number) || 5;

  const result = await distributeToSegment(
    segment as Parameters<typeof distributeToSegment>[0],
    channel as Parameters<typeof distributeToSegment>[1],
    limit
  );
  return {
    postId: result.post.id,
    offersDistributed: result.offers.length,
    segment: result.segment,
    channel: result.channel,
  };
}

async function handleTriggerJob(
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const jobName = payload.jobName as string;
  if (!jobName) throw new Error("jobName is required");

  // Record intent — actual job invocation varies by job type
  // We log the intent and mark success since the job runner will pick it up
  const jobRun = await prisma.jobRun.create({
    data: {
      jobName,
      status: "RUNNING",
      startedAt: new Date(),
    },
  });
  return { jobRunId: jobRun.id, jobName, status: "triggered" };
}

async function handleCreateReviewTask(
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const productId = payload.productId as string;
  if (!productId) throw new Error("productId is required");

  const product = await prisma.product.update({
    where: { id: productId },
    data: { needsReview: true },
    select: { id: true, name: true },
  });
  return { productId: product.id, name: product.name, markedForReview: true };
}

async function handleCreateImportBatch(
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const batch = await prisma.importBatch.create({
    data: {
      fileName: (payload.fileName as string) || null,
      format: (payload.format as string) || "json",
      status: "PENDING",
      totalItems: (payload.totalItems as number) || 0,
    },
  });
  return { batchId: batch.id, status: batch.status };
}

async function handleTriggerEmail(
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const to = payload.to as string;
  const subject = payload.subject as string;
  const body = payload.body as string;

  // If Resend is configured, attempt real send via dynamic require
  if (process.env.RESEND_API_KEY) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const resendModule = require("resend") as { Resend: new (key: string) => { emails: { send: (opts: Record<string, string>) => Promise<{ data?: { id?: string } }> } } };
      const resend = new resendModule.Resend(process.env.RESEND_API_KEY);
      const result = await resend.emails.send({
        from: process.env.RESEND_FROM || "PromoSnap <noreply@promosnap.com.br>",
        to: to || "admin@promosnap.com.br",
        subject: subject || "PromoSnap - Notificacao",
        html: body || "<p>Notificacao do PromoSnap</p>",
      });
      return { emailId: result.data?.id, sent: true };
    } catch (err) {
      // Fall through to logging — resend may not be installed
      logger.warn("execution.email-send-failed", { error: err });
    }
  }

  // Log email intent
  logger.debug("execution.email-intent", { to, subject });
  return { logged: true, to, subject, note: "RESEND_API_KEY not configured — email intent logged" };
}

async function handleTriggerWebhook(
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const url = payload.url as string;
  if (!url) throw new Error("url is required");

  const webhookPayload = payload.data || payload;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    return {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText,
    };
  } catch (err) {
    clearTimeout(timeout);
    throw new Error(
      `Webhook failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

async function handleCreateCampaign(
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const banner = await prisma.banner.create({
    data: {
      title: (payload.title as string) || "Campanha automatica",
      subtitle: (payload.subtitle as string) || null,
      imageUrl: (payload.imageUrl as string) || null,
      ctaText: (payload.ctaText as string) || "Ver campanha",
      ctaUrl: (payload.ctaUrl as string) || "/ofertas",
      bannerType: "CAROUSEL",
      priority: (payload.priority as number) || 10,
      isActive: true,
      autoMode: "campaign",
    },
  });
  return { bannerId: banner.id, title: banner.title, type: "campaign" };
}

// ─── Query executions ───────────────────────────────────────────────────────

export interface ExecutionFilters {
  type?: ExecutionType;
  status?: ExecutionStatus;
  limit?: number;
}

export function getExecutions(filters?: ExecutionFilters): ExecutionRecord[] {
  let results = [...executionStore];

  if (filters?.type) {
    results = results.filter((r) => r.type === filters.type);
  }
  if (filters?.status) {
    results = results.filter((r) => r.status === filters.status);
  }

  const limit = filters?.limit ?? 50;
  return results.slice(0, limit);
}

export function getExecutionSummary(): ExecutionSummary {
  const byStatus: Record<ExecutionStatus, number> = {
    pending: 0,
    running: 0,
    success: 0,
    failed: 0,
    skipped: 0,
  };

  const byType: Record<ExecutionType, number> = {
    create_banner: 0,
    publish_distribution: 0,
    feature_product: 0,
    create_campaign: 0,
    create_import_batch: 0,
    create_review_task: 0,
    trigger_job: 0,
    trigger_email: 0,
    trigger_webhook: 0,
  };

  for (const rec of executionStore) {
    byStatus[rec.status]++;
    byType[rec.type]++;
  }

  const recentFailures = executionStore
    .filter((r) => r.status === "failed")
    .slice(0, 10);

  return {
    total: executionStore.length,
    byStatus,
    byType,
    recentFailures,
  };
}

// ─── Retry a failed execution ───────────────────────────────────────────────

export async function retryExecution(id: string): Promise<ExecutionRecord | null> {
  const original = executionStore.find((r) => r.id === id);
  if (!original) return null;
  if (original.status !== "failed") return original;

  original.status = "running";
  original.error = null;
  original.retries++;
  original.completedAt = null;

  try {
    const result = await runExecution(original.type, original.payload);
    original.status = "success";
    original.result = result;
    original.completedAt = new Date();
  } catch (err) {
    original.status = "failed";
    original.error = err instanceof Error ? err.message : String(err);
    original.completedAt = new Date();
  }

  return original;
}
