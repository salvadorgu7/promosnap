import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  default: {
    crmMessage: {
      count: vi.fn().mockResolvedValue(0),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    subscriber: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
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

import { runQualityGates, type QualityGateInput } from '../quality-gates'
import prisma from '@/lib/db/prisma'

function makeInput(overrides: Partial<QualityGateInput> = {}): QualityGateInput {
  return {
    subscriberId: 'sub-1',
    email: 'test@test.com',
    channel: 'EMAIL',
    messageType: 'alert_triggered',
    productId: 'prod-1',
    offerId: 'offer-1',
    price: 100,
    originalPrice: 200,
    affiliateUrl: 'https://amazon.com.br/dp/X?tag=promosnap-20',
    sourceSlug: 'amazon-br',
    body: 'Oferta incrível para você!',
    ...overrides,
  }
}

describe('CRM Quality Gates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(prisma.crmMessage.count as any).mockResolvedValue(0)
    ;(prisma.crmMessage.findUnique as any).mockResolvedValue(null)
    ;(prisma.subscriber.findUnique as any).mockResolvedValue(null)
  })

  it('passes with valid input', async () => {
    const result = await runQualityGates(makeInput())
    expect(result.pass).toBe(true)
    expect(result.blocked).toHaveLength(0)
    expect(result.valueScore).toBeGreaterThan(0)
  })

  // ── Gate 1: Affiliate validation ──
  it('blocks message without affiliate URL', async () => {
    const result = await runQualityGates(makeInput({ affiliateUrl: '#' }))
    expect(result.pass).toBe(false)
    expect(result.blocked).toContain('no_affiliate')
  })

  it('blocks message with empty affiliate URL', async () => {
    const result = await runQualityGates(makeInput({ affiliateUrl: '' }))
    expect(result.pass).toBe(false)
    expect(result.blocked).toContain('no_affiliate')
  })

  it('allows ONSITE without affiliate URL', async () => {
    const result = await runQualityGates(makeInput({
      channel: 'ONSITE',
      affiliateUrl: undefined,
    }))
    expect(result.blocked).not.toContain('no_affiliate')
  })

  // ── Gate 2: Price sanity ──
  it('blocks suspiciously low price', async () => {
    const result = await runQualityGates(makeInput({ price: 3 }))
    expect(result.blocked).toContain('price_too_low')
  })

  it('blocks implausible discount (>85%)', async () => {
    const result = await runQualityGates(makeInput({
      price: 10,
      originalPrice: 100,
    }))
    expect(result.blocked).toContain('discount_implausible')
  })

  it('allows normal discount', async () => {
    const result = await runQualityGates(makeInput({
      price: 150,
      originalPrice: 200,
    }))
    expect(result.blocked).not.toContain('discount_implausible')
  })

  // ── Gate 3: Frequency control ──
  it('blocks when frequency limit exceeded', async () => {
    ;(prisma.crmMessage.count as any).mockResolvedValue(3)
    const result = await runQualityGates(makeInput())
    expect(result.blocked).toContain('frequency_exceeded')
    expect(result.spamRiskScore).toBeGreaterThanOrEqual(40)
  })

  it('allows within frequency limit', async () => {
    ;(prisma.crmMessage.count as any).mockResolvedValue(1)
    const result = await runQualityGates(makeInput())
    expect(result.blocked).not.toContain('frequency_exceeded')
  })

  // ── Gate 4: Deduplication ──
  it('blocks duplicate message', async () => {
    ;(prisma.crmMessage.findUnique as any).mockResolvedValue({ id: 'msg-1' })
    const result = await runQualityGates(makeInput())
    expect(result.blocked).toContain('duplicate')
    expect(result.spamRiskScore).toBeGreaterThanOrEqual(30)
  })

  // ── Gate 5: Quiet hours ──
  it('blocks during quiet hours', async () => {
    const now = new Date()
    const brtHour = (now.getUTCHours() - 3 + 24) % 24
    ;(prisma.subscriber.findUnique as any).mockResolvedValue({
      quietStart: brtHour,
      quietEnd: (brtHour + 2) % 24,
    })
    const result = await runQualityGates(makeInput())
    expect(result.blocked).toContain('quiet_hours')
  })

  it('allows ONSITE during quiet hours', async () => {
    const now = new Date()
    const brtHour = (now.getUTCHours() - 3 + 24) % 24
    ;(prisma.subscriber.findUnique as any).mockResolvedValue({
      quietStart: brtHour,
      quietEnd: (brtHour + 2) % 24,
    })
    const result = await runQualityGates(makeInput({ channel: 'ONSITE' }))
    expect(result.blocked).not.toContain('quiet_hours')
  })

  // ── Gate 6: Spam risk ──
  it('blocks high spam risk', async () => {
    ;(prisma.crmMessage.count as any).mockResolvedValue(3) // at limit → +40 freq + 20 near-limit
    ;(prisma.crmMessage.findUnique as any).mockResolvedValue({ id: 'dup' }) // +30 dup
    const result = await runQualityGates(makeInput({ body: 'x' })) // +15 short body
    expect(result.spamRiskScore).toBeGreaterThanOrEqual(70)
    expect(result.blocked).toContain('spam_risk_high')
  })

  // ── Gate 7: Value scoring ──
  it('gives high value score for alert_triggered', async () => {
    const result = await runQualityGates(makeInput({ messageType: 'alert_triggered' }))
    expect(result.valueScore).toBeGreaterThanOrEqual(80)
  })

  it('gives high value score for welcome', async () => {
    const result = await runQualityGates(makeInput({
      messageType: 'welcome',
      productId: undefined,
    }))
    expect(result.valueScore).toBeGreaterThanOrEqual(70)
  })

  it('gives higher value for bigger discount', async () => {
    const r1 = await runQualityGates(makeInput({ price: 180, originalPrice: 200 }))
    const r2 = await runQualityGates(makeInput({ price: 100, originalPrice: 200 }))
    expect(r2.valueScore).toBeGreaterThan(r1.valueScore)
  })

  // ── Dedup key ──
  it('generates dedup key with subscriberId, messageType, productId', async () => {
    const result = await runQualityGates(makeInput())
    expect(result.dedupKey).toContain('sub-1')
    expect(result.dedupKey).toContain('alert_triggered')
    expect(result.dedupKey).toContain('prod-1')
  })
})
