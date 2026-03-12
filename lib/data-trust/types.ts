export interface TrustFactors {
  image: number;
  brand: number;
  category: number;
  price: number;
  affiliateUrl: number;
  sourceQuality: number;
  history: number;
}

export interface TrustResult {
  trustScore: number;
  factors: TrustFactors;
  issues: string[];
}

export interface ProductTrustEntry {
  productId: string;
  productName: string;
  slug: string;
  imageUrl: string | null;
  brand: string | null;
  category: string | null;
  listingCount: number;
  offerCount: number;
  trustScore: number;
  factors: TrustFactors;
  issues: string[];
}

export interface TrustReport {
  timestamp: string;
  totalProducts: number;
  averageTrust: number;
  distribution: {
    excellent: number;  // 80-100
    good: number;       // 60-79
    fair: number;       // 40-59
    poor: number;       // 0-39
  };
  topIssues: { issue: string; count: number }[];
  products: ProductTrustEntry[];
}

export interface ValidationIssue {
  field: string;
  issue: string;
  severity: "warning" | "critical";
  value?: string | number | null;
}
