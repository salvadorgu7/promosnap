import prisma from "@/lib/db/prisma";
import type {
  TrustFactors,
  TrustResult,
  ProductTrustEntry,
  TrustReport,
} from "./types";

const SOURCE_QUALITY: Record<string, number> = {
  amazon: 0.95,
  "mercado-livre": 0.85,
  mercadolivre: 0.85,
  ml: 0.85,
  shopee: 0.7,
  shein: 0.6,
};

function getSourceQuality(sourceSlug: string | null | undefined): number {
  if (!sourceSlug) return 0.5;
  const slug = sourceSlug.toLowerCase();
  for (const [key, value] of Object.entries(SOURCE_QUALITY)) {
    if (slug.includes(key)) return value;
  }
  return 0.5;
}

interface TrustInput {
  imageUrl?: string | null;
  brand?: string | null;
  category?: string | null;
  currentPrice?: number | null;
  originalPrice?: number | null;
  affiliateUrl?: string | null;
  sourceSlug?: string | null;
  hasPriceSnapshots?: boolean;
}

export function calculateTrust(input: TrustInput): TrustResult {
  const factors: TrustFactors = {
    image: 0,
    brand: 0,
    category: 0,
    price: 0,
    affiliateUrl: 0,
    sourceQuality: 0,
    history: 0,
  };
  const issues: string[] = [];

  // Image valid (+20pts)
  if (input.imageUrl && input.imageUrl.startsWith("http")) {
    factors.image = 20;
  } else {
    issues.push("Missing or invalid image URL");
  }

  // Brand present (+15pts)
  if (input.brand && input.brand.trim().length > 0) {
    factors.brand = 15;
  } else {
    issues.push("Brand not specified");
  }

  // Category present (+15pts)
  if (input.category && input.category.trim().length > 0) {
    factors.category = 15;
  } else {
    issues.push("Category not assigned");
  }

  // Price coherent (+15pts)
  if (input.currentPrice && input.currentPrice > 0) {
    if (
      input.originalPrice === null ||
      input.originalPrice === undefined ||
      input.originalPrice >= input.currentPrice
    ) {
      factors.price = 15;
    } else {
      issues.push("Original price lower than current price");
      factors.price = 5;
    }
  } else {
    issues.push("No valid current price");
  }

  // Affiliate URL valid (+15pts)
  if (input.affiliateUrl && input.affiliateUrl.startsWith("http")) {
    factors.affiliateUrl = 15;
  } else {
    issues.push("Missing affiliate URL");
  }

  // Source quality (+10pts scaled)
  const sq = getSourceQuality(input.sourceSlug);
  factors.sourceQuality = Math.round(sq * 10);
  if (sq < 0.7) {
    issues.push(`Low source quality (${input.sourceSlug || "unknown"})`);
  }

  // Price history (+10pts)
  if (input.hasPriceSnapshots) {
    factors.history = 10;
  } else {
    issues.push("No price history available");
  }

  const trustScore = Object.values(factors).reduce((a, b) => a + b, 0);

  return { trustScore, factors, issues };
}

export async function getProductTrustReport(): Promise<TrustReport> {
  try {
    const products = await prisma.product.findMany({
      where: { status: "ACTIVE" },
      include: {
        brand: true,
        category: true,
        listings: {
          include: {
            source: true,
            offers: {
              where: { isActive: true },
              include: {
                priceSnapshots: { take: 1 },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });

    const entries: ProductTrustEntry[] = products.map((product) => {
      // Aggregate best data across listings/offers
      const allOffers = product.listings.flatMap((l) => l.offers);
      const bestOffer = allOffers.sort(
        (a, b) => b.offerScore - a.offerScore
      )[0];
      const sourceSlug = product.listings[0]?.source?.slug || null;
      const hasPriceSnapshots = allOffers.some(
        (o) => o.priceSnapshots.length > 0
      );

      const trust = calculateTrust({
        imageUrl: product.imageUrl,
        brand: product.brand?.name,
        category: product.category?.name,
        currentPrice: bestOffer?.currentPrice,
        originalPrice: bestOffer?.originalPrice,
        affiliateUrl: bestOffer?.affiliateUrl,
        sourceSlug,
        hasPriceSnapshots,
      });

      return {
        productId: product.id,
        productName: product.name,
        slug: product.slug,
        imageUrl: product.imageUrl,
        brand: product.brand?.name || null,
        category: product.category?.name || null,
        listingCount: product.listings.length,
        offerCount: allOffers.length,
        trustScore: trust.trustScore,
        factors: trust.factors,
        issues: trust.issues,
      };
    });

    // Sort by trust score ascending (worst first)
    entries.sort((a, b) => a.trustScore - b.trustScore);

    // Calculate distribution
    const distribution = {
      excellent: entries.filter((e) => e.trustScore >= 80).length,
      good: entries.filter((e) => e.trustScore >= 60 && e.trustScore < 80).length,
      fair: entries.filter((e) => e.trustScore >= 40 && e.trustScore < 60).length,
      poor: entries.filter((e) => e.trustScore < 40).length,
    };

    // Top issues
    const issueMap = new Map<string, number>();
    for (const entry of entries) {
      for (const issue of entry.issues) {
        issueMap.set(issue, (issueMap.get(issue) || 0) + 1);
      }
    }
    const topIssues = Array.from(issueMap.entries())
      .map(([issue, count]) => ({ issue, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const averageTrust =
      entries.length > 0
        ? Math.round(
            entries.reduce((sum, e) => sum + e.trustScore, 0) / entries.length
          )
        : 0;

    return {
      timestamp: new Date().toISOString(),
      totalProducts: entries.length,
      averageTrust,
      distribution,
      topIssues,
      products: entries,
    };
  } catch (error) {
    return {
      timestamp: new Date().toISOString(),
      totalProducts: 0,
      averageTrust: 0,
      distribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
      topIssues: [],
      products: [],
    };
  }
}

export async function getLowTrustProducts(
  threshold: number = 50
): Promise<ProductTrustEntry[]> {
  const report = await getProductTrustReport();
  return report.products.filter((p) => p.trustScore < threshold);
}
