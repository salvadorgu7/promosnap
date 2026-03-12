// ============================================
// CATALOG RECOMMENDATIONS — actionable fixes
// ============================================

import prisma from "@/lib/db/prisma";
import type { GovernanceRecommendation } from "./governance-types";

// ============================================
// Generate recommendations for all catalog issues
// ============================================

export async function generateCatalogRecommendations(): Promise<
  GovernanceRecommendation[]
> {
  const recommendations: GovernanceRecommendation[] = [];

  // Missing image — high priority for popular products
  try {
    const noImage = await prisma.product.findMany({
      where: { status: "ACTIVE", imageUrl: null },
      select: { id: true, name: true, popularityScore: true },
      take: 30,
      orderBy: { popularityScore: "desc" },
    });

    for (const p of noImage) {
      recommendations.push({
        productId: p.id,
        productName: p.name,
        issue: "Sem imagem",
        action: "Adicionar imagem do produto ou definir fallback da listagem",
        priority: p.popularityScore > 50 ? "high" : "medium",
      });
    }
  } catch (e) {
    console.error("[recommendations] noImage error:", e);
  }

  // Missing brand
  try {
    const noBrand = await prisma.product.findMany({
      where: { status: "ACTIVE", brandId: null },
      select: { id: true, name: true, popularityScore: true },
      take: 30,
      orderBy: { popularityScore: "desc" },
    });

    for (const p of noBrand) {
      recommendations.push({
        productId: p.id,
        productName: p.name,
        issue: "Sem marca",
        action: "Revisar e atribuir marca correta ao produto",
        priority: p.popularityScore > 50 ? "high" : "medium",
      });
    }
  } catch (e) {
    console.error("[recommendations] noBrand error:", e);
  }

  // Missing category
  try {
    const noCategory = await prisma.product.findMany({
      where: { status: "ACTIVE", categoryId: null },
      select: { id: true, name: true, popularityScore: true },
      take: 30,
      orderBy: { popularityScore: "desc" },
    });

    for (const p of noCategory) {
      recommendations.push({
        productId: p.id,
        productName: p.name,
        issue: "Sem categoria",
        action: "Classificar produto na categoria apropriada",
        priority: p.popularityScore > 50 ? "high" : "low",
      });
    }
  } catch (e) {
    console.error("[recommendations] noCategory error:", e);
  }

  // Orphan listings
  try {
    const orphans = await prisma.listing.findMany({
      where: { productId: null },
      select: { id: true, rawTitle: true },
      take: 30,
      orderBy: { createdAt: "desc" },
    });

    for (const l of orphans) {
      recommendations.push({
        productId: null,
        productName: l.rawTitle,
        issue: "Listing orfao",
        action: "Revisar agrupamento canonico e vincular a produto existente",
        priority: "medium",
      });
    }
  } catch (e) {
    console.error("[recommendations] orphans error:", e);
  }

  // Weak canonicals — single source
  try {
    const weak: { productId: string; productName: string }[] =
      await prisma.$queryRaw`
        SELECT
          p.id AS "productId",
          p.name AS "productName"
        FROM products p
        JOIN listings l ON l."productId" = p.id AND l.status = 'ACTIVE'
        WHERE p.status = 'ACTIVE'
        GROUP BY p.id, p.name
        HAVING COUNT(DISTINCT l."sourceId") = 1
        ORDER BY p."popularityScore" DESC
        LIMIT 30
      `;

    for (const w of weak) {
      recommendations.push({
        productId: w.productId,
        productName: w.productName,
        issue: "Canonico fraco",
        action: "Expandir cobertura para mais fontes/marketplaces",
        priority: "low",
      });
    }
  } catch (e) {
    console.error("[recommendations] weak error:", e);
  }

  // Stale offers — 30+ days without update
  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const stale: { productId: string; productName: string }[] =
      await prisma.$queryRaw`
        SELECT DISTINCT
          p.id AS "productId",
          p.name AS "productName"
        FROM offers o
        JOIN listings l ON o."listingId" = l.id
        JOIN products p ON l."productId" = p.id
        WHERE o."isActive" = true
        AND o."updatedAt" < ${cutoff}
        AND p.status = 'ACTIVE'
        ORDER BY p.name
        LIMIT 30
      `;

    for (const s of stale) {
      recommendations.push({
        productId: s.productId,
        productName: s.productName,
        issue: "Oferta desatualizada",
        action: "Reprocessar/atualizar dados da fonte original",
        priority: "high",
      });
    }
  } catch (e) {
    console.error("[recommendations] stale error:", e);
  }

  // Sort by priority: high > medium > low
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  recommendations.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );

  return recommendations;
}
