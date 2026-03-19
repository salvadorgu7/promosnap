import { describe, it, expect, vi } from 'vitest'

// Mock the price analytics module
vi.mock('@/lib/price/analytics', () => ({
  isHistoricalLow: (current: number, allTimeMin: number) => {
    if (allTimeMin <= 0 || current <= 0) return false
    return current <= allTimeMin * 1.05
  },
  computeTrend: vi.fn(),
}))

const { generateBuySignal } = await import('../buy-signal')

function makeStats(overrides: Partial<{
  current: number; avg30d: number; allTimeMin: number; trend: 'up' | 'down' | 'stable'
  min30d: number; max30d: number; min90d: number; max90d: number; avg90d: number
}>) {
  return {
    current: 100,
    min30d: 90,
    max30d: 120,
    avg30d: 105,
    min90d: 85,
    max90d: 130,
    avg90d: 110,
    allTimeMin: 80,
    trend: 'stable' as const,
    ...overrides,
  }
}

describe('generateBuySignal', () => {
  it('returns "excelente" when price is at historical low', () => {
    const stats = makeStats({ current: 82, allTimeMin: 80 })
    const signal = generateBuySignal(82, stats)
    expect(signal.level).toBe('excelente')
    expect(signal.color).toBe('green')
    expect(signal.confidence).toBe('high')
  })

  it('returns "bom" when price below avg with falling trend', () => {
    const stats = makeStats({ avg30d: 100, trend: 'down' })
    const signal = generateBuySignal(90, stats)
    expect(signal.level).toBe('bom')
    expect(signal.color).toBe('blue')
    expect(signal.confidence).toBe('high')
  })

  it('returns "bom" when price below avg (stable trend)', () => {
    const stats = makeStats({ avg30d: 100, trend: 'stable' })
    const signal = generateBuySignal(95, stats)
    expect(signal.level).toBe('bom')
    expect(signal.color).toBe('blue')
  })

  it('returns "aguarde" when trend falling but above average', () => {
    const stats = makeStats({ avg30d: 90, trend: 'down' })
    const signal = generateBuySignal(95, stats)
    expect(signal.level).toBe('aguarde')
    expect(signal.color).toBe('orange')
  })

  it('returns "neutro" when trend is up', () => {
    const stats = makeStats({ avg30d: 90, trend: 'up' })
    const signal = generateBuySignal(95, stats)
    expect(signal.level).toBe('neutro')
    expect(signal.color).toBe('gray')
  })

  it('returns "neutro" when price is stable at average', () => {
    const stats = makeStats({ avg30d: 100, trend: 'stable' })
    const signal = generateBuySignal(100, stats)
    expect(signal.level).toBe('neutro')
    expect(signal.color).toBe('gray')
  })

  it('includes discount factor when discount >= 20', () => {
    const stats = makeStats({ avg30d: 100, trend: 'stable' })
    const signal = generateBuySignal(95, stats, { discount: 25 })
    expect(signal.factors.some(f => f.label.includes('25%') && f.positive)).toBe(true)
  })

  it('includes free shipping factor', () => {
    const stats = makeStats({ avg30d: 100, trend: 'stable' })
    const signal = generateBuySignal(95, stats, { isFreeShipping: true })
    expect(signal.factors.some(f => f.label.includes('Frete gratis') && f.positive)).toBe(true)
  })
})
