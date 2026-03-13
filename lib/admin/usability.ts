/**
 * Admin Usability Module
 *
 * Provides quick health summary and smart quick-access links
 * for the admin dashboard based on current system state.
 */

import prisma from "@/lib/db/prisma";
import { getIntegritySummary } from "@/lib/project/integrity";
import { classifyCriticalPending } from "@/lib/project/pending-audit";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AdminHealthSummary {
  totalProducts: number;
  activeOffers: number;
  pendingReviews: number;
  pendingImports: number;
  activeAlerts: number;
  recentExecutions: number;
  systemScore: number;
  systemStatus: string;
  criticalPendingCount: number;
}

export interface QuickAccessItem {
  label: string;
  href: string;
  badge?: string;
  priority: number;
  reason: string;
}

// ─── Health Summary ─────────────────────────────────────────────────────────

/**
 * Quick summary for admin dashboard: total products, active offers,
 * pending reviews, pending imports, active alerts, recent executions,
 * system score.
 */
export async function getAdminHealthSummary(): Promise<AdminHealthSummary> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const [
      totalProducts,
      activeOffers,
      pendingReviews,
      pendingImports,
      activeAlerts,
      recentExecutions,
    ] = await Promise.all([
      prisma.product.count().catch(() => 0),
      prisma.offer.count({ where: { isActive: true } }).catch(() => 0),
      prisma.catalogCandidate
        .count({ where: { status: "PENDING" } })
        .catch(() => 0),
      prisma.importBatch
        .count({ where: { status: "PENDING" } })
        .catch(() => 0),
      prisma.priceAlert
        .count({ where: { isActive: true, triggeredAt: null } })
        .catch(() => 0),
      prisma.jobRun
        .count({ where: { startedAt: { gte: today } } })
        .catch(() => 0),
    ]);

    const integrity = getIntegritySummary();
    const pending = classifyCriticalPending();
    const criticalOpen = pending.critical_for_execution.filter(
      (i) => i.status !== "closed"
    ).length;

    return {
      totalProducts,
      activeOffers,
      pendingReviews,
      pendingImports,
      activeAlerts,
      recentExecutions,
      systemScore: integrity.score,
      systemStatus: integrity.status,
      criticalPendingCount: criticalOpen,
    };
  } catch (error) {
    console.error("[admin-usability] Error getting health summary:", error);
    const integrity = getIntegritySummary();
    const pending = classifyCriticalPending();

    return {
      totalProducts: 0,
      activeOffers: 0,
      pendingReviews: 0,
      pendingImports: 0,
      activeAlerts: 0,
      recentExecutions: 0,
      systemScore: integrity.score,
      systemStatus: integrity.status,
      criticalPendingCount: pending.critical_for_execution.filter(
        (i) => i.status !== "closed"
      ).length,
    };
  }
}

// ─── Quick Access ───────────────────────────────────────────────────────────

/**
 * Returns top 5 most useful admin links based on current state.
 * E.g., if pending imports > 0, show imports link first.
 */
export async function getQuickAccessItems(): Promise<QuickAccessItem[]> {
  const items: QuickAccessItem[] = [];

  try {
    const [pendingCandidates, pendingImports, failedJobs, activeAlerts, weakMatches] =
      await Promise.all([
        prisma.catalogCandidate
          .count({ where: { status: "PENDING" } })
          .catch(() => 0),
        prisma.importBatch
          .count({ where: { status: "PENDING" } })
          .catch(() => 0),
        prisma.jobRun
          .count({
            where: {
              status: "FAILED",
              startedAt: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
              },
            },
          })
          .catch(() => 0),
        prisma.priceAlert
          .count({ where: { isActive: true, triggeredAt: null } })
          .catch(() => 0),
        prisma.catalogCandidate
          .count({ where: { status: "APPROVED" } })
          .catch(() => 0),
      ]);

    if (pendingCandidates > 0) {
      items.push({
        label: "Revisar Candidatos",
        href: "/admin/ingestao",
        badge: `${pendingCandidates}`,
        priority: 100,
        reason: `${pendingCandidates} candidatos aguardando revisao`,
      });
    }

    if (pendingImports > 0) {
      items.push({
        label: "Processar Importacoes",
        href: "/admin/ingestao",
        badge: `${pendingImports}`,
        priority: 95,
        reason: `${pendingImports} batches de importacao pendentes`,
      });
    }

    if (failedJobs > 0) {
      items.push({
        label: "Verificar Jobs",
        href: "/admin/jobs",
        badge: `${failedJobs} falhas`,
        priority: 90,
        reason: `${failedJobs} jobs falharam nas ultimas 24h`,
      });
    }

    if (weakMatches > 0) {
      items.push({
        label: "Governanca de Catalogo",
        href: "/admin/governance",
        badge: `${weakMatches}`,
        priority: 80,
        reason: `${weakMatches} candidatos aprovados para processar`,
      });
    }

    if (activeAlerts > 0) {
      items.push({
        label: "Alertas Ativos",
        href: "/admin/alertas",
        badge: `${activeAlerts}`,
        priority: 70,
        reason: `${activeAlerts} alertas de preco ativos`,
      });
    }

    // Always-available links with lower priority
    items.push({
      label: "Catalogo",
      href: "/admin/catalog-edit",
      priority: 50,
      reason: "Editar produtos e listings",
    });

    items.push({
      label: "Growth Ops",
      href: "/admin/growth-ops",
      priority: 45,
      reason: "Oportunidades de crescimento",
    });

    items.push({
      label: "Distribuicao",
      href: "/admin/distribution",
      priority: 40,
      reason: "Enviar ofertas por Telegram/Email",
    });

    items.push({
      label: "Monitoramento",
      href: "/admin/monitoring",
      priority: 35,
      reason: "Status do sistema e metricas",
    });

    items.push({
      label: "Audit",
      href: "/admin/audit",
      priority: 30,
      reason: "Auditoria do sistema",
    });
  } catch (error) {
    console.error("[admin-usability] Error getting quick access:", error);
    // Fallback static items
    items.push(
      {
        label: "Catalogo",
        href: "/admin/catalog-edit",
        priority: 50,
        reason: "Editar produtos",
      },
      {
        label: "Jobs",
        href: "/admin/jobs",
        priority: 45,
        reason: "Verificar automacao",
      },
      {
        label: "Growth Ops",
        href: "/admin/growth-ops",
        priority: 40,
        reason: "Oportunidades",
      },
      {
        label: "Monitoramento",
        href: "/admin/monitoring",
        priority: 35,
        reason: "Status do sistema",
      },
      {
        label: "Audit",
        href: "/admin/audit",
        priority: 30,
        reason: "Auditoria",
      }
    );
  }

  // Sort by priority descending, return top 5
  return items.sort((a, b) => b.priority - a.priority).slice(0, 5);
}
