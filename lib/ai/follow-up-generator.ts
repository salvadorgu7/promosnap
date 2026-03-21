/**
 * Follow-Up Generator — contextual suggestions after each assistant response.
 *
 * Generates smart chips like "Ver mais baratos", "Comparar com X",
 * "Criar alerta de preço", based on intent + results.
 */

import type { ClassifiedIntent } from './intent-classifier'
import type { EnrichedProduct, FollowUpSuggestion, AlertSuggestionBlock } from './structured-response'

// ── Follow-Up Suggestions ──────────────────────────────────────────────────

export function generateFollowUps(
  intent: ClassifiedIntent,
  products: EnrichedProduct[],
  userQuery: string
): FollowUpSuggestion[] {
  const suggestions: FollowUpSuggestion[] = []
  const category = intent.categories?.[0]
  const budget = intent.budget?.max

  // Category-specific exploration
  if (category && products.length > 0) {
    if (budget) {
      suggestions.push({
        label: `Mais opções até R$ ${budget}`,
        query: `mais ${category} até ${budget}`,
        icon: 'search',
      })
      // Suggest slightly higher budget
      const higherBudget = Math.round(budget * 1.3 / 100) * 100
      suggestions.push({
        label: `Até R$ ${higherBudget} vale a pena?`,
        query: `melhor ${category} até ${higherBudget}`,
        icon: 'filter',
      })
    }

    suggestions.push({
      label: `Melhor custo-benefício em ${category}`,
      query: `melhor custo-benefício ${category}`,
      icon: 'search',
    })
  }

  // Comparison suggestion when multiple products found
  if (products.length >= 2) {
    const top2 = products.slice(0, 2)
    suggestions.push({
      label: `Comparar ${shortenName(top2[0].name)} vs ${shortenName(top2[1].name)}`,
      query: `comparar ${shortenName(top2[0].name)} e ${shortenName(top2[1].name)}`,
      icon: 'compare',
    })
  }

  // Alert suggestion when best deal is not at historical low
  const bestDeal = products.find(p => p.buySignal?.level === 'aguarde' || p.buySignal?.level === 'neutro')
  if (bestDeal && bestDeal.slug) {
    suggestions.push({
      label: `Alerta de preço para ${shortenName(bestDeal.name)}`,
      query: `alerta de preço ${shortenName(bestDeal.name)}`,
      icon: 'alert',
    })
  }

  // Brand-specific suggestion
  if (intent.brands && intent.brands.length > 0) {
    const brand = intent.brands[0]
    suggestions.push({
      label: `Alternativas ao ${brand}`,
      query: `alternativa ao ${brand} ${category || ''}`.trim(),
      icon: 'search',
    })
  }

  // Cross-category suggestions
  if (category === 'celulares') {
    suggestions.push({ label: 'Fones compatíveis', query: 'melhor fone bluetooth', icon: 'category' })
    suggestions.push({ label: 'Capinhas e películas', query: 'capinha celular', icon: 'category' })
  } else if (category === 'notebooks') {
    suggestions.push({ label: 'Mouse e teclado', query: 'mouse e teclado para notebook', icon: 'category' })
  } else if (category === 'smart-tvs') {
    suggestions.push({ label: 'Soundbars', query: 'melhor soundbar', icon: 'category' })
  }

  // Limit to 4 suggestions
  return suggestions.slice(0, 4)
}

// ── Alert Suggestions ──────────────────────────────────────────────────────

export function generateAlertSuggestions(products: EnrichedProduct[]): AlertSuggestionBlock[] {
  const alerts: AlertSuggestionBlock[] = []

  for (const p of products) {
    if (!p.slug || !p.price || !p.priceContext) continue

    // Suggest alert when price is NOT at historical low
    if (!p.priceContext.isHistoricalLow && p.priceContext.position > 30) {
      // Target: 10% below current or near all-time min (whichever is higher)
      const targetFromCurrent = Math.round(p.price * 0.9)
      const targetFromMin = Math.round(p.priceContext.allTimeMin * 1.05)
      const target = Math.max(targetFromCurrent, targetFromMin)

      if (target < p.price) {
        alerts.push({
          type: 'alert_suggestion',
          productName: p.name,
          currentPrice: p.price,
          suggestedTargetPrice: target,
          slug: p.slug,
        })
      }
    }
  }

  return alerts.slice(0, 2) // Max 2 alert suggestions
}

// ── Helpers ────────────────────────────────────────────────────────────────

function shortenName(name: string): string {
  // Take first 3-4 meaningful words
  const words = name.split(/\s+/).filter(w => w.length > 1)
  if (words.length <= 4) return name
  return words.slice(0, 4).join(' ')
}
