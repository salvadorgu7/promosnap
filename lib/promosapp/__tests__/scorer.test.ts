import { describe, it, expect, vi } from "vitest";
import { scoreItem, decideAction } from "../scorer";
import type { PromosAppNormalizedItem, PromosAppRawEvent } from "../types";

// Mock external dependencies that scorer uses
vi.mock("@/lib/catalog/canonical-match", () => ({
  canonicalMatch: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/db/prisma", () => ({
  default: {
    catalogCandidate: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

function makeItem(overrides: Partial<PromosAppNormalizedItem> = {}): PromosAppNormalizedItem {
  const rawEvent: PromosAppRawEvent = {
    rawText: 'iPhone 15 128GB por R$ 3.999 de R$ 5.499 https://www.amazon.com.br/dp/B0CHX3PBRX',
    capturedAt: new Date().toISOString(),
    sourceChannel: 'whatsapp-promos',
  };

  return {
    externalId: 'B0CHX3PBRX',
    title: 'iPhone 15 128GB',
    currentPrice: 3999,
    originalPrice: 5499,
    productUrl: 'https://www.amazon.com.br/dp/B0CHX3PBRX',
    sourceSlug: 'amazon-br',
    marketplace: 'Amazon Brasil',
    canonicalUrl: 'https://www.amazon.com.br/dp/B0CHX3PBRX',
    dedupeKey: 'amazon-br:B0CHX3PBRX',
    discount: 27,
    isFreeShipping: false,
    rawEvent,
    parseErrors: [],
    ...overrides,
  };
}

describe('scoreItem — basic scoring', () => {
  it('should return score between 0 and 100', async () => {
    const item = makeItem();
    const score = await scoreItem(item);
    expect(score.total).toBeGreaterThanOrEqual(0);
    expect(score.total).toBeLessThanOrEqual(100);
  });

  it('should assign tier based on total', async () => {
    const item = makeItem();
    const score = await scoreItem(item);
    if (score.total >= 70) expect(score.tier).toBe('high');
    else if (score.total >= 40) expect(score.tier).toBe('medium');
    else expect(score.tier).toBe('low');
  });

  it('should have all 11 factors defined', async () => {
    const item = makeItem();
    const score = await scoreItem(item);
    const keys = Object.keys(score.factors);
    expect(keys).toContain('linkValid');
    expect(keys).toContain('catalogMatch');
    expect(keys).toContain('priceConfirmed');
    expect(keys).toContain('realDiscount');
    expect(keys).toContain('sellerTrusted');
    expect(keys).toContain('volumeSold');
    expect(keys).toContain('multiSourceRepetition');
    expect(keys).toContain('noSpamSignals');
    expect(keys).toContain('hasImage');
    expect(keys).toContain('couponConfirmed');
    expect(keys).toContain('available');
  });
});

describe('scoreItem — link validation', () => {
  it('should score higher for https URLs with external ID', async () => {
    const good = makeItem({ productUrl: 'https://amazon.com.br/dp/X', dedupeKey: 'amazon-br:X', parseErrors: [] });
    const bad = makeItem({ productUrl: 'http://x.com', dedupeKey: 'hash:abc', parseErrors: ['error1'] });
    const scoreGood = await scoreItem(good);
    const scoreBad = await scoreItem(bad);
    expect(scoreGood.factors.linkValid).toBeGreaterThan(scoreBad.factors.linkValid);
  });
});

describe('scoreItem — price confirmation', () => {
  it('should score higher when enriched', async () => {
    const item = makeItem({ currentPrice: 3999 });
    const enriched = await scoreItem(item, { wasEnriched: true });
    const notEnriched = await scoreItem(item, { wasEnriched: false });
    expect(enriched.factors.priceConfirmed).toBeGreaterThan(notEnriched.factors.priceConfirmed);
  });

  it('should score 0 for zero price', async () => {
    const item = makeItem({ currentPrice: 0 });
    const score = await scoreItem(item);
    expect(score.factors.priceConfirmed).toBe(0);
  });
});

describe('scoreItem — discount scoring', () => {
  it('should score max for 50%+ discount', async () => {
    const item = makeItem({ discount: 55 });
    const score = await scoreItem(item);
    expect(score.factors.realDiscount).toBe(10);
  });

  it('should score 0 for no discount', async () => {
    const item = makeItem({ discount: 0 });
    const score = await scoreItem(item);
    expect(score.factors.realDiscount).toBe(0);
  });

  it('should score 8 for 30-49% discount', async () => {
    const item = makeItem({ discount: 35 });
    const score = await scoreItem(item);
    expect(score.factors.realDiscount).toBe(8);
  });

  it('should score 5 for 15-29% discount', async () => {
    const item = makeItem({ discount: 20 });
    const score = await scoreItem(item);
    expect(score.factors.realDiscount).toBe(5);
  });
});

describe('scoreItem — spam detection', () => {
  it('should score 10 for clean item', async () => {
    const item = makeItem();
    const score = await scoreItem(item);
    expect(score.factors.noSpamSignals).toBe(10);
  });

  it('should score 0 for spammy item', async () => {
    const item = makeItem({
      rawEvent: {
        rawText: 'ganhe dinheiro fácil trabalhando de casa https://amazon.com.br/dp/X',
        capturedAt: new Date().toISOString(),
        sourceChannel: 'spam-group',
      },
    });
    const score = await scoreItem(item);
    expect(score.factors.noSpamSignals).toBe(0);
  });

  it('should detect "renda extra" spam', async () => {
    const item = makeItem({
      rawEvent: {
        rawText: 'renda extra fácil https://amazon.com.br/dp/X',
        capturedAt: new Date().toISOString(),
      },
    });
    const score = await scoreItem(item);
    expect(score.factors.noSpamSignals).toBe(0);
  });
});

describe('scoreItem — image and coupon', () => {
  it('should score 5 for item with image', async () => {
    const item = makeItem({ imageUrl: 'https://example.com/img.jpg' });
    const score = await scoreItem(item);
    expect(score.factors.hasImage).toBe(5);
  });

  it('should score 0 for item without image', async () => {
    const item = makeItem();
    const score = await scoreItem(item);
    expect(score.factors.hasImage).toBe(0);
  });

  it('should score 5 for valid coupon', async () => {
    const item = makeItem({ couponCode: 'PROMO50' });
    const score = await scoreItem(item);
    expect(score.factors.couponConfirmed).toBe(5);
  });

  it('should score 0 for short coupon', async () => {
    const item = makeItem({ couponCode: 'AB' });
    const score = await scoreItem(item);
    expect(score.factors.couponConfirmed).toBe(0);
  });
});

describe('scoreItem — availability', () => {
  it('should score 7 for item with URL and price', async () => {
    const item = makeItem({ productUrl: 'https://amazon.com.br/dp/X', currentPrice: 100 });
    const score = await scoreItem(item);
    expect(score.factors.available).toBe(7);
  });

  it('should score 0 for item without price', async () => {
    const item = makeItem({ currentPrice: 0 });
    const score = await scoreItem(item);
    expect(score.factors.available).toBe(0);
  });
});

describe('decideAction', () => {
  it('should auto-approve high scores', () => {
    const decision = decideAction(
      { total: 75, tier: 'high', factors: {} as any },
      { autoApproveThreshold: 70, rejectThreshold: 40 }
    );
    expect(decision).toBe('auto_approve');
  });

  it('should reject low scores', () => {
    const decision = decideAction(
      { total: 30, tier: 'low', factors: {} as any },
      { autoApproveThreshold: 70, rejectThreshold: 40 }
    );
    expect(decision).toBe('rejected');
  });

  it('should pending_review medium scores', () => {
    const decision = decideAction(
      { total: 55, tier: 'medium', factors: {} as any },
      { autoApproveThreshold: 70, rejectThreshold: 40 }
    );
    expect(decision).toBe('pending_review');
  });

  it('should respect custom thresholds', () => {
    const decision = decideAction(
      { total: 85, tier: 'high', factors: {} as any },
      { autoApproveThreshold: 90, rejectThreshold: 50 }
    );
    expect(decision).toBe('pending_review');
  });

  it('should auto-approve at exact threshold', () => {
    const decision = decideAction(
      { total: 70, tier: 'high', factors: {} as any },
      { autoApproveThreshold: 70, rejectThreshold: 40 }
    );
    expect(decision).toBe('auto_approve');
  });

  it('should reject at exact threshold boundary', () => {
    const decision = decideAction(
      { total: 39, tier: 'low', factors: {} as any },
      { autoApproveThreshold: 70, rejectThreshold: 40 }
    );
    expect(decision).toBe('rejected');
  });
});
