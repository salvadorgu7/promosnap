/**
 * Price Prediction — simple trend-based forecast.
 *
 * Uses 90-day price history to predict if price will drop, rise, or stay stable.
 * NOT ML-based — uses linear regression on snapshots for honest, explainable predictions.
 */

import { computePriceStats, computeTrend } from '@/lib/price/analytics'
import type { PriceSnapshot } from '@/lib/price/analytics'

export type PredictionVerdict = 'vai_cair' | 'vai_subir' | 'estavel' | 'incerto'

export interface PricePrediction {
  verdict: PredictionVerdict
  confidence: 'alta' | 'media' | 'baixa'
  headline: string
  detail: string
  /** Estimated price in 7 days (rough) */
  estimatedPrice7d?: number
  /** Estimated savings if user waits */
  potentialSavings?: number
  /** Key supporting factors */
  factors: string[]
}

export function predictPrice(
  currentPrice: number,
  snapshots: PriceSnapshot[]
): PricePrediction {
  if (snapshots.length < 5) {
    return {
      verdict: 'incerto',
      confidence: 'baixa',
      headline: 'Dados insuficientes',
      detail: 'Precisamos de mais histórico de preço para fazer uma previsão confiável.',
      factors: ['Menos de 5 registros de preço disponíveis'],
    }
  }

  const stats = computePriceStats(snapshots, currentPrice)
  const trend7d = computeTrend(snapshots, currentPrice, 7)
  const trend30d = computeTrend(snapshots, currentPrice, 30)

  const factors: string[] = []
  let score = 0 // Negative = likely to drop, Positive = likely to rise

  // Factor 1: 7-day trend
  if (trend7d.direction === 'down') {
    score -= 2
    factors.push(`Queda de ${Math.abs(trend7d.changePct).toFixed(1)}% nos últimos 7 dias`)
  } else if (trend7d.direction === 'up') {
    score += 2
    factors.push(`Alta de ${trend7d.changePct.toFixed(1)}% nos últimos 7 dias`)
  }

  // Factor 2: 30-day trend
  if (trend30d.direction === 'down') {
    score -= 1
    factors.push(`Tendência de queda no último mês`)
  } else if (trend30d.direction === 'up') {
    score += 1
    factors.push(`Tendência de alta no último mês`)
  }

  // Factor 3: Position relative to average
  const pctFromAvg = stats.avg30d > 0 ? ((currentPrice - stats.avg30d) / stats.avg30d) * 100 : 0
  if (pctFromAvg > 10) {
    score -= 1
    factors.push(`Preço ${Math.round(pctFromAvg)}% acima da média — tende a corrigir`)
  } else if (pctFromAvg < -10) {
    score += 1
    factors.push(`Preço ${Math.round(Math.abs(pctFromAvg))}% abaixo da média — pode subir`)
  }

  // Factor 4: Distance from all-time min
  const pctAboveMin = stats.allTimeMin > 0
    ? ((currentPrice - stats.allTimeMin) / stats.allTimeMin) * 100
    : 0
  if (pctAboveMin < 5) {
    factors.push('Próximo do menor preço histórico')
    score += 1 // Near floor, likely to rise
  } else if (pctAboveMin > 30) {
    factors.push(`${Math.round(pctAboveMin)}% acima do menor preço já registrado`)
    score -= 1 // Room to drop
  }

  // Factor 5: Volatility (via price range)
  const range90 = stats.max90d - stats.min90d
  const volatilityPct = stats.avg90d > 0 ? (range90 / stats.avg90d) * 100 : 0
  if (volatilityPct > 25) {
    factors.push('Preço oscila bastante — aguardar pode compensar')
  }

  // Estimate 7d price
  const estimatedChange = trend7d.changePct / 100 * 0.5 // Half the recent trend
  const estimatedPrice7d = Math.round(currentPrice * (1 + estimatedChange))
  const potentialSavings = estimatedPrice7d < currentPrice
    ? currentPrice - estimatedPrice7d
    : undefined

  // Build verdict
  let verdict: PredictionVerdict
  let headline: string
  let detail: string
  let confidence: 'alta' | 'media' | 'baixa'

  if (score <= -3) {
    verdict = 'vai_cair'
    confidence = 'alta'
    headline = 'Preço deve cair'
    detail = 'Tendência forte de queda. Considere esperar ou criar um alerta de preço.'
  } else if (score <= -1) {
    verdict = 'vai_cair'
    confidence = 'media'
    headline = 'Preço pode cair'
    detail = 'Há sinais de queda. Um alerta de preço pode garantir a melhor oferta.'
  } else if (score >= 3) {
    verdict = 'vai_subir'
    confidence = 'alta'
    headline = 'Preço deve subir'
    detail = 'Tendência forte de alta. Se precisa, compre agora antes que suba mais.'
  } else if (score >= 1) {
    verdict = 'vai_subir'
    confidence = 'media'
    headline = 'Preço pode subir'
    detail = 'Sinais indicam possível alta. Pode ser bom momento para comprar.'
  } else {
    verdict = 'estavel'
    confidence = 'media'
    headline = 'Preço estável'
    detail = 'Sem tendência clara de alta ou queda no momento.'
  }

  return {
    verdict,
    confidence,
    headline,
    detail,
    estimatedPrice7d: estimatedPrice7d !== currentPrice ? estimatedPrice7d : undefined,
    potentialSavings,
    factors,
  }
}
