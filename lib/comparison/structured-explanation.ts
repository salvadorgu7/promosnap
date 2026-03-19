/**
 * Structured explanations for product comparisons.
 *
 * Generates human-readable text from structured data — WITHOUT LLM.
 * Designed to be consumed by:
 *   1. Comparison pages (immediate use)
 *   2. OpenAI function calling (future use — AI can format/expand these)
 *
 * All explanations are auditable: based on real attribute extraction + scoring.
 */

import { extractAttributes, getCategoryConfig, type ExtractedAttribute } from './category-specs'
import { formatPrice } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────

export interface ComparisonExplanation {
  /** One-line verdict: "Galaxy S24 é melhor para fotografia, iPhone 15 é melhor custo-benefício" */
  headline: string
  /** Per-product strengths/weaknesses */
  products: ProductExplanation[]
  /** Recommendation by scenario */
  scenarios: ScenarioRecommendation[]
  /** Best buy today (price + value) */
  bestBuy: { productName: string; reason: string } | null
}

export interface ProductExplanation {
  name: string
  strengths: string[]
  weaknesses: string[]
}

export interface ScenarioRecommendation {
  scenario: string
  winner: string
  reason: string
}

// ── Core Function ──────────────────────────────────────────────────────────

/**
 * Generate structured comparison explanation between two products.
 * Returns text segments that can be rendered directly or consumed by AI.
 */
export function generateComparisonExplanation(
  productA: { name: string; title: string; price: number; discount?: number; isFreeShipping?: boolean },
  productB: { name: string; title: string; price: number; discount?: number; isFreeShipping?: boolean },
  categorySlug: string
): ComparisonExplanation | null {
  const config = getCategoryConfig(categorySlug)
  if (!config) return null

  const attrsA = extractAttributes(productA.title, null, categorySlug)
  const attrsB = extractAttributes(productB.title, null, categorySlug)

  // Compare each attribute
  const winsA: string[] = []
  const winsB: string[] = []
  const ties: string[] = []

  for (const attrConfig of config.attributes) {
    const valA = attrsA.find(a => a.key === attrConfig.key)
    const valB = attrsB.find(a => a.key === attrConfig.key)

    if (!valA && !valB) continue
    if (!valA) { winsB.push(attrConfig.label); continue }
    if (!valB) { winsA.push(attrConfig.label); continue }

    if (typeof valA.value === 'number' && typeof valB.value === 'number') {
      const diff = attrConfig.higherIsBetter
        ? valA.value - valB.value
        : valB.value - valA.value

      if (diff > 0) {
        winsA.push(`${attrConfig.label} (${valA.value}${attrConfig.unit || ''} vs ${valB.value}${attrConfig.unit || ''})`)
      } else if (diff < 0) {
        winsB.push(`${attrConfig.label} (${valB.value}${attrConfig.unit || ''} vs ${valA.value}${attrConfig.unit || ''})`)
      } else {
        ties.push(attrConfig.label)
      }
    }
  }

  // Build strengths/weaknesses
  const productExplanations: ProductExplanation[] = [
    {
      name: productA.name,
      strengths: winsA.length > 0 ? winsA : ['Preço competitivo'],
      weaknesses: winsB.length > 0
        ? winsB.map(w => w.split(' (')[0]) // Remove detail for weakness
        : [],
    },
    {
      name: productB.name,
      strengths: winsB.length > 0 ? winsB : ['Preço competitivo'],
      weaknesses: winsA.length > 0
        ? winsA.map(w => w.split(' (')[0])
        : [],
    },
  ]

  // Price comparison
  const cheaperName = productA.price < productB.price ? productA.name : productB.name
  const priceDiff = Math.abs(productA.price - productB.price)
  const pricePctDiff = Math.round((priceDiff / Math.max(productA.price, productB.price)) * 100)

  // Build headline
  let headline = ''
  if (winsA.length > winsB.length) {
    headline = `${productA.name} vence em ${winsA.length} critério${winsA.length > 1 ? 's' : ''}`
    if (productA.price > productB.price) headline += `, mas ${productB.name} é mais barato`
  } else if (winsB.length > winsA.length) {
    headline = `${productB.name} vence em ${winsB.length} critério${winsB.length > 1 ? 's' : ''}`
    if (productB.price > productA.price) headline += `, mas ${productA.name} é mais barato`
  } else {
    headline = `Empate técnico — a decisão depende do seu uso`
  }

  // Build scenarios
  const scenarios: ScenarioRecommendation[] = []

  for (const useCase of config.useCases) {
    // Simplified: check which product has more attributes matching the use case's top weights
    const topAttrs = Object.entries(useCase.weights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([key]) => key)

    let scoreA = 0, scoreB = 0
    for (const key of topAttrs) {
      const aVal = attrsA.find(a => a.key === key)
      const bVal = attrsB.find(a => a.key === key)
      if (aVal && typeof aVal.value === 'number' && bVal && typeof bVal.value === 'number') {
        const attrCfg = config.attributes.find(a => a.key === key)
        if (attrCfg?.higherIsBetter) {
          if (aVal.value > bVal.value) scoreA++
          else if (bVal.value > aVal.value) scoreB++
        } else {
          if (aVal.value < bVal.value) scoreA++
          else if (bVal.value < aVal.value) scoreB++
        }
      }
    }

    const winner = scoreA > scoreB ? productA.name : scoreB > scoreA ? productB.name : cheaperName
    const reason = scoreA > scoreB
      ? `Melhor nos critérios mais importantes para ${useCase.label.toLowerCase()}`
      : scoreB > scoreA
        ? `Melhor nos critérios mais importantes para ${useCase.label.toLowerCase()}`
        : `Empate técnico — ${cheaperName} leva vantagem no preço`

    scenarios.push({ scenario: useCase.label, winner, reason })
  }

  // Best buy
  let bestBuy: ComparisonExplanation['bestBuy'] = null
  if (pricePctDiff >= 10) {
    bestBuy = {
      productName: cheaperName,
      reason: `${pricePctDiff}% mais barato (economia de ${formatPrice(priceDiff)})`,
    }
  } else if (productA.isFreeShipping && !productB.isFreeShipping) {
    bestBuy = { productName: productA.name, reason: 'Frete grátis incluso' }
  } else if (productB.isFreeShipping && !productA.isFreeShipping) {
    bestBuy = { productName: productB.name, reason: 'Frete grátis incluso' }
  }

  return {
    headline,
    products: productExplanations,
    scenarios,
    bestBuy,
  }
}

/**
 * Generate a simple "wins in X, loses in Y" summary for a single product.
 */
export function generateProductSummary(
  productName: string,
  title: string,
  categorySlug: string,
  otherProducts: { name: string; title: string }[]
): string[] {
  const config = getCategoryConfig(categorySlug)
  if (!config) return []

  const myAttrs = extractAttributes(title, null, categorySlug)
  const summaries: string[] = []

  for (const other of otherProducts) {
    const otherAttrs = extractAttributes(other.title, null, categorySlug)
    const wins: string[] = []
    const losses: string[] = []

    for (const attrConfig of config.attributes) {
      const myVal = myAttrs.find(a => a.key === attrConfig.key)
      const otherVal = otherAttrs.find(a => a.key === attrConfig.key)
      if (!myVal || !otherVal) continue
      if (typeof myVal.value !== 'number' || typeof otherVal.value !== 'number') continue

      const better = attrConfig.higherIsBetter
        ? myVal.value > otherVal.value
        : myVal.value < otherVal.value

      if (better) wins.push(attrConfig.label)
      else if (myVal.value !== otherVal.value) losses.push(attrConfig.label)
    }

    if (wins.length > 0) {
      summaries.push(`Vence ${other.name} em ${wins.join(', ')}`)
    }
    if (losses.length > 0) {
      summaries.push(`Perde para ${other.name} em ${losses.join(', ')}`)
    }
  }

  return summaries
}
