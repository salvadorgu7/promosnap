// ============================================
// WhatsApp Broadcast — AI Mini Copy Generator
// Gera ganchos curtos e atraentes via GPT para cada produto
// ============================================

import { logger } from "@/lib/logger"
import type { SelectedOffer } from "./types"

const log = logger.child({ module: "wa-broadcast.ai-copy" })

function getOpenAIKey(): string | undefined {
  return process.env.OPENAI_API_KEY
}

// ============================================
// Types
// ============================================

export interface AiMiniCopy {
  hook: string      // Gancho curto (ex: "O fone que dominou a Amazon")
  highlight: string  // Destaque contextual (ex: "Menor preço dos últimos 90 dias")
}

// ============================================
// In-memory cache (per serverless invocation)
// Avoids re-generating for the same offer batch
// ============================================

const copyCache = new Map<string, AiMiniCopy>()

// ============================================
// Fallback — Deterministic copy (no AI needed)
// ============================================

function generateFallbackCopy(offer: SelectedOffer): AiMiniCopy {
  const hooks: string[] = []
  const highlights: string[] = []

  // Hook based on discount tier
  if (offer.discount >= 50) {
    hooks.push("Preço despencou!", "Metade do preço!", "Desconto absurdo!")
  } else if (offer.discount >= 30) {
    hooks.push("Oferta imperdível!", "Preço que não volta!", "Desconto pesado!")
  } else if (offer.discount >= 15) {
    hooks.push("Boa oportunidade!", "Vale conferir!", "Preço atrativo!")
  } else {
    hooks.push("Achado do dia!", "Produto em destaque!", "Seleção PromoSnap!")
  }

  // Highlight based on features
  if (offer.isFreeShipping) {
    highlights.push("Chega na sua casa sem custo de frete")
  }
  if (offer.couponText) {
    highlights.push(`Cupom exclusivo disponível`)
  }
  if (offer.rating && offer.rating >= 4.5) {
    highlights.push(`Avaliação ${offer.rating.toFixed(1)}/5 pelos compradores`)
  }
  if (offer.discount >= 20) {
    highlights.push(`Economia real de ${offer.discount}% no preço`)
  }

  if (highlights.length === 0) {
    highlights.push(`Disponível na ${offer.sourceName} com entrega rápida`)
  }

  // Deterministic pick based on offerId hash
  const hashCode = offer.offerId.split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  const hook = hooks[hashCode % hooks.length]
  const highlight = highlights[hashCode % highlights.length]

  return { hook, highlight }
}

// ============================================
// AI Generation — Batch (multiple offers at once)
// ============================================

/**
 * Gera minicopy para múltiplas ofertas em uma única chamada GPT.
 * Mais eficiente do que chamar 1x por oferta.
 * Máx 10 ofertas por batch (cost control).
 */
export async function generateBatchMiniCopy(
  offers: SelectedOffer[],
): Promise<Map<string, AiMiniCopy>> {
  const result = new Map<string, AiMiniCopy>()

  // Check cache first
  const uncached: SelectedOffer[] = []
  for (const offer of offers) {
    const cached = copyCache.get(offer.offerId)
    if (cached) {
      result.set(offer.offerId, cached)
    } else {
      uncached.push(offer)
    }
  }

  // If all cached, return immediately
  if (uncached.length === 0) return result

  // Check API key
  const apiKey = getOpenAIKey()
  if (!apiKey) {
    // Fallback: generate deterministic copy
    for (const offer of uncached) {
      const fallback = generateFallbackCopy(offer)
      result.set(offer.offerId, fallback)
      copyCache.set(offer.offerId, fallback)
    }
    return result
  }

  // Build batch prompt (max 10 offers)
  const batch = uncached.slice(0, 10)

  const offerDescriptions = batch.map((o, i) => {
    const parts = [
      `[${i + 1}] "${o.productName}"`,
      `Preço: R$ ${o.currentPrice.toFixed(2)}`,
    ]
    if (o.originalPrice && o.discount > 0) {
      parts.push(`De: R$ ${o.originalPrice.toFixed(2)} | Desconto: ${o.discount}%`)
    }
    parts.push(`Loja: ${o.sourceName}`)
    if (o.isFreeShipping) parts.push("Frete grátis: sim")
    if (o.couponText) parts.push(`Cupom: ${o.couponText}`)
    if (o.rating) parts.push(`Nota: ${o.rating.toFixed(1)}/5`)
    return parts.join(" | ")
  }).join("\n")

  const prompt = `Você é um copywriter de ofertas para WhatsApp. Gere minicopy CURTA e ATRAENTE para cada produto abaixo.

Para CADA produto, gere:
- "hook": frase de impacto (máx 40 chars) — tipo manchete que chama atenção. Ex: "O fone que dominou a Amazon", "Menor preço em 3 meses", "Favorito dos gamers"
- "highlight": destaque contextual (máx 60 chars) — informação útil que gera interesse. Ex: "Entrega em 2 dias com Prime", "3.200 avaliações positivas", "Voltou ao menor preço histórico"

REGRAS:
- Português BR natural e informal
- NÃO repetir "imperdível" ou "incrível" em hooks diferentes
- NÃO inventar dados (rating, prazo, etc.) — use apenas o que foi fornecido
- Variar estilo entre os produtos (urgência, curiosidade, social proof, economia)
- Máximo 40 chars no hook e 60 chars no highlight

Produtos:
${offerDescriptions}

Responda APENAS com JSON válido no formato:
{
  "copies": [
    { "index": 1, "hook": "...", "highlight": "..." },
    { "index": 2, "hook": "...", "highlight": "..." }
  ]
}`

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Você é um copywriter brasileiro especialista em ofertas e promoções. Escreva copy curta, magnética e honesta para WhatsApp. Responda APENAS com JSON válido.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.6,
        max_tokens: 600,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(12000),
    })

    if (!res.ok) {
      log.error("ai-copy.gpt-failed", { status: res.status })
      // Fallback
      for (const offer of batch) {
        const fallback = generateFallbackCopy(offer)
        result.set(offer.offerId, fallback)
        copyCache.set(offer.offerId, fallback)
      }
      return result
    }

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      log.warn("ai-copy.empty-response")
      for (const offer of batch) {
        const fallback = generateFallbackCopy(offer)
        result.set(offer.offerId, fallback)
        copyCache.set(offer.offerId, fallback)
      }
      return result
    }

    // Parse JSON response
    const parsed = JSON.parse(content) as {
      copies: Array<{ index: number; hook: string; highlight: string }>
    }

    for (const copy of parsed.copies) {
      const offer = batch[copy.index - 1]
      if (offer) {
        // Truncate safety
        const miniCopy: AiMiniCopy = {
          hook: copy.hook?.slice(0, 50) || generateFallbackCopy(offer).hook,
          highlight: copy.highlight?.slice(0, 70) || generateFallbackCopy(offer).highlight,
        }
        result.set(offer.offerId, miniCopy)
        copyCache.set(offer.offerId, miniCopy)
      }
    }

    // Fill any missing
    for (const offer of batch) {
      if (!result.has(offer.offerId)) {
        const fallback = generateFallbackCopy(offer)
        result.set(offer.offerId, fallback)
        copyCache.set(offer.offerId, fallback)
      }
    }

    log.info("ai-copy.generated", {
      total: batch.length,
      aiGenerated: parsed.copies.length,
    })
  } catch (err) {
    log.error("ai-copy.error", { error: String(err) })

    // Fallback for all
    for (const offer of batch) {
      if (!result.has(offer.offerId)) {
        const fallback = generateFallbackCopy(offer)
        result.set(offer.offerId, fallback)
        copyCache.set(offer.offerId, fallback)
      }
    }
  }

  return result
}

/**
 * Gera minicopy para uma oferta individual.
 * Usa batch de 1 internamente.
 */
export async function generateMiniCopy(offer: SelectedOffer): Promise<AiMiniCopy> {
  const cached = copyCache.get(offer.offerId)
  if (cached) return cached

  const results = await generateBatchMiniCopy([offer])
  return results.get(offer.offerId) || generateFallbackCopy(offer)
}

/**
 * Gera fallback sem IA (para quando OPENAI_API_KEY não está configurada).
 */
export { generateFallbackCopy }
