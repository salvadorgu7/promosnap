/**
 * AI Product Summary — generates contextual explanations from REAL data only.
 *
 * Uses OpenAI gpt-4o-mini to synthesize a brief product summary
 * from structured signals (price, buy signal, reviews, alternatives).
 * NEVER invents data — all facts come from verified inputs.
 */

import { logger } from "@/lib/logger"

const log = logger.child({ module: "product-summary" })

function getOpenAIKey(): string | undefined {
  return process.env.OPENAI_API_KEY
}

export interface ProductSummaryInput {
  productName: string
  currentPrice: number
  originalPrice?: number
  discount?: number | null
  buySignalLevel?: string // excelente | bom | neutro | aguarde
  buySignalDetail?: string
  avgPrice30d?: number
  allTimeMin?: number
  reviewRating?: number
  reviewConfidence?: string
  totalReviews?: number
  themes?: { theme: string; polarity: string; mentions: number }[]
  alternativeName?: string
  alternativePrice?: number
  categoryName?: string
}

export interface ProductSummary {
  summary: string // 2-3 sentences
  goodFor: string // "Bom para quem..."
  considerIf: string // "Considere se..."
  generatedAt: string
}

const SYSTEM_PROMPT = `Voce e um consultor de compras do PromoSnap. Gere um resumo curto e util sobre um produto com base EXCLUSIVAMENTE nos dados fornecidos.

REGRAS:
- NAO invente specs, reviews ou precos
- Use APENAS os dados que receber
- Maximo 3 frases no resumo
- "Bom para" em 1 frase
- "Considere se" em 1 frase (ressalva honesta)
- Portugues do Brasil, tom direto e confiavel
- Se dados insuficientes, diga isso`

export async function generateProductSummary(
  input: ProductSummaryInput
): Promise<ProductSummary | null> {
  const apiKey = getOpenAIKey()
  if (!apiKey) return null

  const context = buildContext(input)

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: context },
        ],
        temperature: 0.3,
        max_tokens: 300,
        response_format: { type: "json_object" },
      }),
    })

    if (!response.ok) {
      log.error("product-summary.api-failed", { status: response.status })
      return null
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) return null

    const parsed = JSON.parse(content) as { summary?: string; goodFor?: string; considerIf?: string }

    return {
      summary: parsed.summary || "Resumo indisponivel.",
      goodFor: parsed.goodFor || "",
      considerIf: parsed.considerIf || "",
      generatedAt: new Date().toISOString(),
    }
  } catch (err) {
    log.error("product-summary.failed", { error: err })
    return null
  }
}

function buildContext(input: ProductSummaryInput): string {
  const parts: string[] = [
    `Produto: ${input.productName}`,
    `Preco atual: R$ ${input.currentPrice.toFixed(2)}`,
  ]

  if (input.originalPrice) parts.push(`Preco original: R$ ${input.originalPrice.toFixed(2)}`)
  if (input.discount) parts.push(`Desconto: ${input.discount}%`)
  if (input.avgPrice30d) parts.push(`Media 30 dias: R$ ${input.avgPrice30d.toFixed(2)}`)
  if (input.allTimeMin) parts.push(`Menor historico: R$ ${input.allTimeMin.toFixed(2)}`)
  if (input.buySignalLevel) parts.push(`Sinal de compra: ${input.buySignalLevel} — ${input.buySignalDetail || ""}`)
  if (input.reviewRating) parts.push(`Nota: ${input.reviewRating}/5 (${input.totalReviews || 0} reviews, confianca ${input.reviewConfidence || "desconhecida"})`)
  if (input.themes && input.themes.length > 0) {
    parts.push(`Temas de avaliacoes: ${input.themes.map(t => `${t.theme} (${t.polarity}, ${t.mentions}x)`).join(", ")}`)
  }
  if (input.alternativeName) parts.push(`Alternativa: ${input.alternativeName} por R$ ${input.alternativePrice?.toFixed(2) || "?"}`)
  if (input.categoryName) parts.push(`Categoria: ${input.categoryName}`)

  return parts.join("\n") + '\n\nResponda em JSON: { "summary": "...", "goodFor": "...", "considerIf": "..." }'
}
