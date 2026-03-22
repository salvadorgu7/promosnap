/**
 * Response Composer — builds human, commercial, and contextual assistant responses.
 *
 * The assistant should NOT sound like a catalog dump or a generic LLM.
 * It should sound like a knowledgeable friend helping you decide.
 *
 * Structure: Opening → Shortlist → Comparison → Alternatives → CTA
 */

import { type ClassifiedIntent, type IntentType, getIntentTone } from './intent-classifier'

// ============================================
// TYPES
// ============================================

export interface ComposerProduct {
  name: string
  price: number
  originalPrice?: number
  discount?: number
  source: string
  isFromCatalog: boolean
  offerScore?: number
  rationale?: string // why this product was selected
  label?: 'melhor_camera' | 'melhor_custo_beneficio' | 'mais_barato' | 'mais_vendido' | 'boa_alternativa' | 'premium'
}

export interface ComposedResponse {
  opening: string
  mainSection: string
  alternativesSection?: string
  closingCta: string
  suggestAlert: boolean
  suggestExternalSearch: boolean
}

// ============================================
// OPENING LIBRARY
// ============================================

const OPENINGS: Record<IntentType, string[]> = {
  best_under_budget: [
    'Para o seu orçamento, separei as opções que fazem mais sentido:',
    'Dentro dessa faixa de preço, esses aqui se destacam:',
    'Olhando o que temos até esse valor, eu iria por estes:',
  ],
  cheapest: [
    'Se o foco é economizar ao máximo, essas são as melhores opções:',
    'Pelo menor preço com qualidade mínima garantida:',
    'Para gastar o mínimo possível sem arriscar demais:',
  ],
  best_cost_benefit: [
    'Em custo-benefício, esses aqui se destacam bastante:',
    'Se a ideia é ter o melhor pelo que vai pagar:',
    'Olhando preço versus qualidade, esses fazem mais sentido:',
  ],
  best_for_use: [
    'Para esse uso específico, separei por perfil:',
    'Pensando no que você precisa, esses fazem mais sentido:',
    'Para não te jogar coisa aleatória, filtrei pelo seu objetivo:',
  ],
  compare_models: [
    'Vamos comparar direto ao ponto:',
    'Aqui está a comparação que você pediu:',
    'Olhando os dois lado a lado:',
  ],
  alternative_to: [
    'Como alternativa, esses aqui valem a pena considerar:',
    'Se você quer algo parecido mas talvez melhor ou mais barato:',
    'Separei opções que competem diretamente:',
  ],
  worth_it: [
    'Vou te dar os dados para decidir com segurança:',
    'Olhando preço, histórico e qualidade:',
    'Aqui está o que precisa saber para decidir:',
  ],
  has_promo: [
    'Achei algumas promoções interessantes:',
    'Separei as melhores ofertas que encontrei:',
    'Olha o que está com desconto real agora:',
  ],
  similar_to: [
    'Produtos parecidos que valem considerar:',
    'Se quiser algo nessa linha:',
    'Opções similares disponíveis agora:',
  ],
  discovery: [
    'Para te ajudar a escolher, separei os destaques:',
    'Olha o que encontrei de mais interessante:',
    'Esses aqui estão se destacando nessa categoria:',
  ],
  specific_product: [
    'Encontrei esse produto — aqui está o panorama:',
    'Aqui estão as ofertas disponíveis:',
    'Olha o que temos para esse modelo:',
  ],
  general_question: [
    'Aqui está o que posso te ajudar:',
    'Vou te dar as informações que tenho:',
    '',
  ],
}

// ============================================
// TRANSITION LIBRARY
// ============================================

const ALTERNATIVE_TRANSITIONS = [
  'Se quiser considerar outras opções:',
  'Outras boas alternativas:',
  'Se nenhuma dessas convenceu, olha estas:',
  'Para ampliar a busca:',
]

const EXTERNAL_SEARCH_TRANSITIONS = [
  'Ampliei a busca para encontrar mais opções:',
  'Além do catálogo, encontrei essas ofertas externas:',
  'Para não limitar sua escolha, trouxe mais resultados:',
]

// ============================================
// CTA LIBRARY
// ============================================

const CLOSING_CTAS: Record<string, string[]> = {
  objective: [
    'Quer que eu compare algum desses em mais detalhe?',
    'Posso buscar alternativas em outra faixa de preço.',
  ],
  consultive: [
    'Me diz o que é mais importante pra você e eu refino a busca.',
    'Quer que eu aprofunde em algum desses?',
  ],
  enthusiastic: [
    'Se eu fosse comprar agora, iria no primeiro — mas depende do seu perfil!',
    'Algum chamou atenção? Posso detalhar.',
  ],
  comparative: [
    'Quer que eu detalhe algum ponto específico da comparação?',
    'Se tiver mais critérios, me conta e eu refino.',
  ],
  urgent: [
    'Esse é o melhor momento para aproveitar.',
    'Preço pode mudar a qualquer momento — vale garantir.',
  ],
}

// ============================================
// COMPOSER
// ============================================

export function composeResponse(
  intent: ClassifiedIntent,
  mainProducts: ComposerProduct[],
  alternativeProducts: ComposerProduct[],
  externalProducts: ComposerProduct[],
): ComposedResponse {
  const tone = getIntentTone(intent)

  // Opening
  const openings = OPENINGS[intent.type] || OPENINGS.discovery
  const opening = openings[Math.floor(Math.random() * openings.length)]

  // Main section — build product descriptions with rationale
  const mainLines = mainProducts.slice(0, tone.maxItems).map((p, i) => {
    const label = p.label ? ` *${formatLabel(p.label)}*` : ''
    const discount = p.discount && p.discount > 0 ? ` (-${p.discount}%)` : ''
    const from = p.isFromCatalog ? '✓' : '🔍'
    const rationale = p.rationale ? ` — ${p.rationale}` : ''
    return `${from} **${p.name}** — R$ ${p.price.toLocaleString('pt-BR')}${discount} na ${p.source}${label}${rationale}`
  })

  const mainSection = mainLines.join('\n')

  // Alternatives section
  let alternativesSection: string | undefined
  if (tone.showAlternatives && (alternativeProducts.length > 0 || externalProducts.length > 0)) {
    const parts: string[] = []

    if (alternativeProducts.length > 0) {
      const transition = ALTERNATIVE_TRANSITIONS[Math.floor(Math.random() * ALTERNATIVE_TRANSITIONS.length)]
      const altLines = alternativeProducts.slice(0, 3).map(p => {
        const discount = p.discount && p.discount > 0 ? ` (-${p.discount}%)` : ''
        return `• ${p.name} — R$ ${p.price.toLocaleString('pt-BR')}${discount} na ${p.source}`
      })
      parts.push(`${transition}\n${altLines.join('\n')}`)
    }

    if (externalProducts.length > 0) {
      const transition = EXTERNAL_SEARCH_TRANSITIONS[Math.floor(Math.random() * EXTERNAL_SEARCH_TRANSITIONS.length)]
      const extLines = externalProducts.slice(0, 3).map(p => {
        const discount = p.discount && p.discount > 0 ? ` (-${p.discount}%)` : ''
        return `🔍 ${p.name} — R$ ${p.price.toLocaleString('pt-BR')}${discount} na ${p.source}`
      })
      parts.push(`${transition}\n${extLines.join('\n')}`)
    }

    alternativesSection = parts.join('\n\n')
  }

  // Closing CTA
  const ctaOptions = CLOSING_CTAS[tone.style] || CLOSING_CTAS.consultive
  const closingCta = ctaOptions[Math.floor(Math.random() * ctaOptions.length)]

  return {
    opening,
    mainSection,
    alternativesSection,
    closingCta,
    suggestAlert: tone.suggestAlert && mainProducts.length > 0,
    suggestExternalSearch: tone.suggestExternalSearch && mainProducts.length < 3,
  }
}

// ============================================
// RATIONALE GENERATOR
// ============================================

export function generateRationale(product: ComposerProduct, intent: ClassifiedIntent): string {
  const reasons: string[] = []

  if (product.label === 'mais_barato') reasons.push('menor preço encontrado')
  if (product.label === 'melhor_custo_beneficio') reasons.push('melhor equilíbrio preço-qualidade')
  if (product.label === 'mais_vendido') reasons.push('mais vendido na categoria')
  if (product.label === 'premium') reasons.push('opção premium')
  if (product.label === 'boa_alternativa') reasons.push('boa alternativa')

  if (product.discount && product.discount >= 20) reasons.push(`${product.discount}% de desconto real`)
  if (product.offerScore && product.offerScore >= 80) reasons.push('oferta de alta qualidade')
  if (product.isFromCatalog) reasons.push('preço verificado')

  if (intent.budget?.max && product.price <= intent.budget.max * 0.8) {
    reasons.push('bem dentro do orçamento')
  }

  return reasons.slice(0, 2).join(', ')
}

// ============================================
// HELPERS
// ============================================

function formatLabel(label: string): string {
  const map: Record<string, string> = {
    melhor_camera: 'Melhor câmera',
    melhor_custo_beneficio: 'Melhor custo-benefício',
    mais_barato: 'Mais barato',
    mais_vendido: 'Mais vendido',
    boa_alternativa: 'Boa alternativa',
    premium: 'Premium',
  }
  return map[label] || label
}

/**
 * Build the full system prompt enhancement for GPT based on intent classification.
 */
export function buildIntentPromptSection(intent: ClassifiedIntent): string {
  const parts: string[] = []

  parts.push(`\n## Intenção detectada: ${intent.type} (${intent.mode})`)

  if (intent.budget) {
    if (intent.budget.min && intent.budget.max) {
      parts.push(`Orçamento: R$ ${intent.budget.min} a R$ ${intent.budget.max}`)
    } else if (intent.budget.max) {
      parts.push(`Orçamento: até R$ ${intent.budget.max}`)
    }
    parts.push('RESPEITE o orçamento — não mostre produtos fora da faixa.')
  }

  if (intent.useCase) {
    parts.push(`Caso de uso: ${intent.useCase}`)
    parts.push('PRIORIZE produtos que atendam esse caso de uso.')
  }

  if (intent.brands && intent.brands.length > 0) {
    parts.push(`Marcas de interesse: ${intent.brands.join(', ')}`)
  }

  const tone = getIntentTone(intent)
  parts.push(`\nTom da resposta: ${tone.style}`)
  parts.push(`Máximo de itens: ${tone.maxItems}`)

  if (tone.style === 'objective') {
    parts.push('Seja direto. Não enrole. Vá ao ponto.')
  } else if (tone.style === 'consultive') {
    parts.push('Seja acolhedor. Explique por que cada opção faz sentido.')
  } else if (tone.style === 'comparative') {
    parts.push('Foque em diferenças claras. Use contrastes diretos.')
  } else if (tone.style === 'urgent') {
    parts.push('Seja rápido. Destaque a melhor opção primeiro. CTA forte.')
  }

  if (tone.style === 'enthusiastic') {
    parts.push('Mostre entusiasmo genuíno pelas boas ofertas. Destaque os deals reais.')
  }

  parts.push('\nLEMBRETE FINAL:')
  parts.push('- Tenha opinião — diga qual é o melhor e porquê')
  parts.push('- Use **negrito** para destacar nomes de produtos e preços importantes')
  parts.push('- Máximo 3-5 produtos — qualidade > quantidade')
  parts.push('- Os cards de produto aparecem automaticamente — foque no texto consultivo')
  parts.push('- Se o preço está em mínimo histórico, destaque isso como oportunidade')
  parts.push('- Se o preço está subindo, seja honesto e sugira esperar ou criar alerta')

  return parts.join('\n')
}
