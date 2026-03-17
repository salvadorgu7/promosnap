import { describe, it, expect } from "vitest";
import { parseRawEvent, parseRawEvents, computeMessageHash } from "../parser";
import type { PromosAppRawEvent } from "../types";

function makeEvent(overrides: Partial<PromosAppRawEvent> = {}): PromosAppRawEvent {
  return {
    rawText: '🔥 iPhone 15 128GB por R$ 3.999,00 de R$ 5.499,00 https://www.amazon.com.br/dp/B0CHX3PBRX frete grátis',
    capturedAt: new Date().toISOString(),
    sourceChannel: 'whatsapp-promos',
    ...overrides,
  };
}

describe('computeMessageHash', () => {
  it('should produce consistent hash for same text', () => {
    const h1 = computeMessageHash('hello world');
    const h2 = computeMessageHash('hello world');
    expect(h1).toBe(h2);
  });

  it('should normalize whitespace', () => {
    const h1 = computeMessageHash('hello   world');
    const h2 = computeMessageHash('hello world');
    expect(h1).toBe(h2);
  });

  it('should be case insensitive', () => {
    const h1 = computeMessageHash('Hello World');
    const h2 = computeMessageHash('hello world');
    expect(h1).toBe(h2);
  });

  it('should return 32 char hex string', () => {
    const h = computeMessageHash('test');
    expect(h).toHaveLength(32);
  });
});

describe('parseRawEvent — marketplace detection', () => {
  it('should detect Amazon from URL', () => {
    const item = parseRawEvent(makeEvent());
    expect(item).toBeTruthy();
    expect(item!.sourceSlug).toBe('amazon-br');
    expect(item!.externalId).toBe('B0CHX3PBRX');
  });

  it('should detect Mercado Livre from URL', () => {
    const item = parseRawEvent(makeEvent({
      rawText: 'TV 55" por R$ 2.199 https://produto.mercadolivre.com.br/MLB-12345678-tv-p',
    }));
    expect(item).toBeTruthy();
    expect(item!.sourceSlug).toBe('mercadolivre');
    expect(item!.externalId).toBe('MLB12345678');
  });

  it('should detect Shopee from URL', () => {
    const item = parseRawEvent(makeEvent({
      rawText: 'Fone BT R$ 29,90 https://shopee.com.br/product-i.123456.789012',
    }));
    expect(item).toBeTruthy();
    expect(item!.sourceSlug).toBe('shopee');
  });

  it('should detect KaBuM from URL', () => {
    const item = parseRawEvent(makeEvent({
      rawText: 'SSD 1TB R$ 349 https://www.kabum.com.br/produto/123456',
    }));
    expect(item).toBeTruthy();
    expect(item!.sourceSlug).toBe('kabum');
    expect(item!.externalId).toBe('123456');
  });

  it('should fallback to unknown for unrecognized URLs', () => {
    const item = parseRawEvent(makeEvent({
      rawText: 'Oferta boa R$ 99 https://www.lojaxyz.com.br/produto/1',
    }));
    expect(item).toBeTruthy();
    expect(item!.sourceSlug).toBe('unknown');
  });
});

describe('parseRawEvent — price extraction', () => {
  it('should extract R$ formatted price', () => {
    const item = parseRawEvent(makeEvent());
    expect(item).toBeTruthy();
    expect(item!.currentPrice).toBe(3999);
  });

  it('should extract original price (de/por pattern)', () => {
    const item = parseRawEvent(makeEvent());
    expect(item).toBeTruthy();
    expect(item!.originalPrice).toBe(5499);
  });

  it('should handle prices from rawPrice field', () => {
    const item = parseRawEvent(makeEvent({
      rawText: 'Produto legal https://www.amazon.com.br/dp/B0CHX3PBRX',
      rawPrice: 'R$ 199,90',
    }));
    expect(item).toBeTruthy();
    expect(item!.currentPrice).toBe(199.9);
  });

  it('should handle cents correctly', () => {
    const item = parseRawEvent(makeEvent({
      rawText: 'Item por R$ 1.299,99 https://www.amazon.com.br/dp/B0CHX3PBRX',
    }));
    expect(item).toBeTruthy();
    expect(item!.currentPrice).toBe(1299.99);
  });
});

describe('parseRawEvent — extras', () => {
  it('should detect free shipping', () => {
    const item = parseRawEvent(makeEvent());
    expect(item).toBeTruthy();
    expect(item!.isFreeShipping).toBe(true);
  });

  it('should detect no free shipping', () => {
    const item = parseRawEvent(makeEvent({
      rawText: 'iPhone R$ 3.999 https://www.amazon.com.br/dp/B0CHX3PBRX',
    }));
    expect(item).toBeTruthy();
    expect(item!.isFreeShipping).toBe(false);
  });

  it('should extract coupon from text', () => {
    const item = parseRawEvent(makeEvent({
      rawText: 'iPhone R$ 3.999 cupom: PROMO50 https://www.amazon.com.br/dp/B0CHX3PBRX',
    }));
    expect(item).toBeTruthy();
    expect(item!.couponCode).toBe('PROMO50');
  });

  it('should prefer rawCoupon field over text extraction', () => {
    const item = parseRawEvent(makeEvent({
      rawText: 'iPhone R$ 3.999 cupom: FROMTEXT https://www.amazon.com.br/dp/B0CHX3PBRX',
      rawCoupon: 'FROMFIELD',
    }));
    expect(item).toBeTruthy();
    expect(item!.couponCode).toBe('FROMFIELD');
  });

  it('should calculate discount from prices', () => {
    const item = parseRawEvent(makeEvent());
    expect(item).toBeTruthy();
    expect(item!.discount).toBeGreaterThan(0);
    expect(item!.discount).toBeLessThan(100);
  });
});

describe('parseRawEvent — dedup key', () => {
  it('should generate marketplace:externalId dedupeKey', () => {
    const item = parseRawEvent(makeEvent());
    expect(item).toBeTruthy();
    expect(item!.dedupeKey).toBe('amazon-br:B0CHX3PBRX');
  });

  it('should generate hash-based dedupeKey for unknown marketplaces', () => {
    const item = parseRawEvent(makeEvent({
      rawText: 'Oferta R$ 99 https://www.lojadesconhecida.com.br/produto/1',
    }));
    expect(item).toBeTruthy();
    expect(item!.dedupeKey).toMatch(/^hash:/);
  });
});

describe('parseRawEvent — edge cases', () => {
  it('should return null for empty event', () => {
    const item = parseRawEvent({ rawText: '', capturedAt: new Date().toISOString() });
    expect(item).toBeNull();
  });

  it('should return null for event without URL', () => {
    const item = parseRawEvent({
      rawText: 'iPhone 15 por R$ 3.999',
      capturedAt: new Date().toISOString(),
    });
    expect(item).toBeNull();
  });

  it('should use rawUrl field if present', () => {
    const item = parseRawEvent({
      rawUrl: 'https://www.amazon.com.br/dp/B0CHX3PBRX',
      rawText: 'iPhone 15 R$ 3.999',
      capturedAt: new Date().toISOString(),
    });
    expect(item).toBeTruthy();
    expect(item!.sourceSlug).toBe('amazon-br');
  });

  it('should preserve messageHash from event if provided', () => {
    const item = parseRawEvent(makeEvent({ messageHash: 'custom-hash-123' }));
    expect(item).toBeTruthy();
    expect(item!.rawEvent.messageHash).toBe('custom-hash-123');
  });
});

describe('parseRawEvents — batch', () => {
  it('should parse batch and count unparseable', () => {
    const events: PromosAppRawEvent[] = [
      makeEvent(),
      { rawText: '', capturedAt: new Date().toISOString() },
      makeEvent({ rawText: 'Outro R$ 199 https://shopee.com.br/product-i.1.2' }),
    ];
    const result = parseRawEvents(events);
    expect(result.items).toHaveLength(2);
    expect(result.unparseable).toBe(1);
  });
});
