import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma before imports
vi.mock('@/lib/db/prisma', () => ({
  default: {
    clickout: { findUnique: vi.fn() },
    conversion: { upsert: vi.fn() },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
  },
}))

import {
  parseAmazonPostback,
  parseMercadoLivrePostback,
  parseShopeePostback,
  parseSheinPostback,
  parseGenericPostback,
  parsePostback,
} from '../index'

describe('Conversion Postback Parsers', () => {
  // ── Amazon ──────────────────────────────────────────────────────────────
  describe('parseAmazonPostback', () => {
    it('parses standard Amazon postback', () => {
      const result = parseAmazonPostback({
        sub_id: 'click-123',
        transaction_id: 'tx-456',
        order_value: '199.90',
        commission: '8.00',
        status: 'approved',
        currency: 'BRL',
      })
      expect(result.source).toBe('amazon')
      expect(result.subId).toBe('click-123')
      expect(result.externalTxId).toBe('tx-456')
      expect(result.orderValue).toBe(199.9)
      expect(result.commission).toBe(8)
      expect(result.status).toBe('confirmed')
      expect(result.currency).toBe('BRL')
    })

    it('uses clickref fallback for subId', () => {
      const result = parseAmazonPostback({ clickref: 'ref-789' })
      expect(result.subId).toBe('ref-789')
    })

    it('uses order_id fallback for externalTxId', () => {
      const result = parseAmazonPostback({ order_id: 'ord-111' })
      expect(result.externalTxId).toBe('ord-111')
    })

    it('handles missing values gracefully', () => {
      const result = parseAmazonPostback({})
      expect(result.source).toBe('amazon')
      expect(result.subId).toBeUndefined()
      expect(result.orderValue).toBeUndefined()
      expect(result.status).toBe('pending')
    })
  })

  // ── Mercado Livre ───────────────────────────────────────────────────────
  describe('parseMercadoLivrePostback', () => {
    it('parses standard ML postback', () => {
      const result = parseMercadoLivrePostback({
        sub_id: 'click-ml',
        order_id: 'ord-ml',
        order_amount: '350.00',
        commission: '10.50',
        status: 'confirmed',
      })
      expect(result.source).toBe('mercadolivre')
      expect(result.subId).toBe('click-ml')
      expect(result.externalTxId).toBe('ord-ml')
      expect(result.orderValue).toBe(350)
      expect(result.commission).toBe(10.5)
      expect(result.status).toBe('confirmed')
    })

    it('uses click_id fallback', () => {
      const result = parseMercadoLivrePostback({ click_id: 'cid-99' })
      expect(result.subId).toBe('cid-99')
    })

    it('parses event_type as status', () => {
      const result = parseMercadoLivrePostback({ event_type: 'sale' })
      expect(result.status).toBe('confirmed')
    })
  })

  // ── Shopee ──────────────────────────────────────────────────────────────
  describe('parseShopeePostback', () => {
    it('parses standard Shopee postback', () => {
      const result = parseShopeePostback({
        sub_id: 'click-sh',
        order_sn: 'sn-123',
        purchase_amount: '89.90',
        estimated_commission: '2.25',
        status: 'approved',
      })
      expect(result.source).toBe('shopee')
      expect(result.subId).toBe('click-sh')
      expect(result.externalTxId).toBe('sn-123')
      expect(result.orderValue).toBe(89.9)
      expect(result.commission).toBe(2.25)
      expect(result.status).toBe('confirmed')
    })

    it('uses aff_sub fallback for subId', () => {
      const result = parseShopeePostback({ aff_sub: 'aff-42' })
      expect(result.subId).toBe('aff-42')
    })

    it('uses order_amount fallback for orderValue', () => {
      const result = parseShopeePostback({ order_amount: '150.00' })
      expect(result.orderValue).toBe(150)
    })

    it('uses commission fallback', () => {
      const result = parseShopeePostback({ commission: '5.00' })
      expect(result.commission).toBe(5)
    })
  })

  // ── Shein ───────────────────────────────────────────────────────────────
  describe('parseSheinPostback', () => {
    it('parses standard Shein postback', () => {
      const result = parseSheinPostback({
        sub_id: 'click-shn',
        order_no: 'SHN456',
        order_amount: '120.00',
        commission: '3.60',
        status: 'confirmed',
        currency: 'BRL',
      })
      expect(result.source).toBe('shein')
      expect(result.subId).toBe('click-shn')
      expect(result.externalTxId).toBe('SHN456')
      expect(result.orderValue).toBe(120)
      expect(result.commission).toBe(3.6)
      expect(result.status).toBe('confirmed')
      expect(result.currency).toBe('BRL')
    })
  })

  // ── Generic ─────────────────────────────────────────────────────────────
  describe('parseGenericPostback', () => {
    it('parses unknown source', () => {
      const result = parseGenericPostback('kabum', {
        sub_id: 'click-kb',
        transaction_id: 'tx-kb',
        amount: '999.00',
        payout: '30.00',
        status: 'sale',
      })
      expect(result.source).toBe('kabum')
      expect(result.subId).toBe('click-kb')
      expect(result.externalTxId).toBe('tx-kb')
      expect(result.orderValue).toBe(999)
      expect(result.commission).toBe(30)
      expect(result.status).toBe('confirmed')
    })
  })

  // ── Router ──────────────────────────────────────────────────────────────
  describe('parsePostback (router)', () => {
    it('routes to Amazon parser', () => {
      const result = parsePostback('amazon', { sub_id: 'a' })
      expect(result.source).toBe('amazon')
    })

    it('routes to ML parser', () => {
      const result = parsePostback('mercadolivre', { sub_id: 'b' })
      expect(result.source).toBe('mercadolivre')
    })

    it('routes to Shopee parser', () => {
      const result = parsePostback('shopee', { sub_id: 'c' })
      expect(result.source).toBe('shopee')
    })

    it('routes to Shein parser', () => {
      const result = parsePostback('shein', { sub_id: 'd' })
      expect(result.source).toBe('shein')
    })

    it('falls back to generic for unknown source', () => {
      const result = parsePostback('magalu', { sub_id: 'e' })
      expect(result.source).toBe('magalu')
    })
  })

  // ── Status Normalization ────────────────────────────────────────────────
  describe('status normalization', () => {
    it('normalizes approved → confirmed', () => {
      expect(parseAmazonPostback({ status: 'approved' }).status).toBe('confirmed')
    })

    it('normalizes sale → confirmed', () => {
      expect(parseAmazonPostback({ status: 'sale' }).status).toBe('confirmed')
    })

    it('normalizes rejected → rejected', () => {
      expect(parseAmazonPostback({ status: 'rejected' }).status).toBe('rejected')
    })

    it('normalizes cancelled → rejected', () => {
      expect(parseAmazonPostback({ status: 'cancelled' }).status).toBe('rejected')
    })

    it('normalizes refund → rejected', () => {
      expect(parseAmazonPostback({ status: 'refund' }).status).toBe('rejected')
    })

    it('normalizes unknown → pending', () => {
      expect(parseAmazonPostback({ status: 'processing' }).status).toBe('pending')
    })

    it('normalizes empty → pending', () => {
      expect(parseAmazonPostback({}).status).toBe('pending')
    })
  })
})
