import type { ValidationIssue } from "./types";

interface ValidatableOffer {
  currentPrice?: number | null;
  originalPrice?: number | null;
  rating?: number | null;
  reviewsCount?: number | null;
}

interface ValidatableListing {
  imageUrl?: string | null;
  rawTitle?: string | null;
  rawCategory?: string | null;
  rawBrand?: string | null;
  rating?: number | null;
  reviewsCount?: number | null;
}

export function validateOffer(offer: ValidatableOffer): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // originalPrice < currentPrice without reason
  if (
    offer.originalPrice != null &&
    offer.currentPrice != null &&
    offer.originalPrice < offer.currentPrice
  ) {
    issues.push({
      field: "originalPrice",
      issue: "Original price is lower than current price",
      severity: "warning",
      value: offer.originalPrice,
    });
  }

  // Discount > 90% suspicious
  if (
    offer.originalPrice != null &&
    offer.currentPrice != null &&
    offer.originalPrice > 0 &&
    offer.currentPrice > 0
  ) {
    const discount =
      ((offer.originalPrice - offer.currentPrice) / offer.originalPrice) * 100;
    if (discount > 90) {
      issues.push({
        field: "discount",
        issue: `Discount of ${discount.toFixed(1)}% is suspiciously high`,
        severity: "warning",
        value: discount,
      });
    }
  }

  // Rating > 5 or < 0
  if (offer.rating != null && (offer.rating > 5 || offer.rating < 0)) {
    issues.push({
      field: "rating",
      issue: `Rating ${offer.rating} is out of valid range (0-5)`,
      severity: "critical",
      value: offer.rating,
    });
  }

  // Reviews count negative
  if (offer.reviewsCount != null && offer.reviewsCount < 0) {
    issues.push({
      field: "reviewsCount",
      issue: "Reviews count is negative",
      severity: "critical",
      value: offer.reviewsCount,
    });
  }

  return issues;
}

export function validateListing(listing: ValidatableListing): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Image URL missing
  if (!listing.imageUrl || !listing.imageUrl.startsWith("http")) {
    issues.push({
      field: "imageUrl",
      issue: "Image URL is missing or invalid",
      severity: "warning",
      value: listing.imageUrl,
    });
  }

  // Title too short
  if (!listing.rawTitle || listing.rawTitle.length < 10) {
    issues.push({
      field: "rawTitle",
      issue: `Title too short (${listing.rawTitle?.length ?? 0} chars, min 10)`,
      severity: "warning",
      value: listing.rawTitle,
    });
  }

  // Category empty
  if (!listing.rawCategory || listing.rawCategory.trim().length === 0) {
    issues.push({
      field: "rawCategory",
      issue: "Category is empty",
      severity: "warning",
    });
  }

  // Brand empty
  if (!listing.rawBrand || listing.rawBrand.trim().length === 0) {
    issues.push({
      field: "rawBrand",
      issue: "Brand is empty",
      severity: "warning",
    });
  }

  // Rating out of range
  if (listing.rating != null && (listing.rating > 5 || listing.rating < 0)) {
    issues.push({
      field: "rating",
      issue: `Rating ${listing.rating} is out of valid range (0-5)`,
      severity: "critical",
      value: listing.rating,
    });
  }

  // Reviews count negative
  if (listing.reviewsCount != null && listing.reviewsCount < 0) {
    issues.push({
      field: "reviewsCount",
      issue: "Reviews count is negative",
      severity: "critical",
      value: listing.reviewsCount,
    });
  }

  return issues;
}

export function validateProduct(product: {
  name?: string | null;
  imageUrl?: string | null;
  brandName?: string | null;
  categoryName?: string | null;
}): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!product.imageUrl || !product.imageUrl.startsWith("http")) {
    issues.push({
      field: "imageUrl",
      issue: "Product image URL missing or invalid",
      severity: "warning",
      value: product.imageUrl,
    });
  }

  if (!product.name || product.name.length < 10) {
    issues.push({
      field: "name",
      issue: `Product name too short (${product.name?.length ?? 0} chars, min 10)`,
      severity: "warning",
      value: product.name,
    });
  }

  if (!product.brandName || product.brandName.trim().length === 0) {
    issues.push({
      field: "brand",
      issue: "Brand not assigned to product",
      severity: "warning",
    });
  }

  if (!product.categoryName || product.categoryName.trim().length === 0) {
    issues.push({
      field: "category",
      issue: "Category not assigned to product",
      severity: "warning",
    });
  }

  return issues;
}
