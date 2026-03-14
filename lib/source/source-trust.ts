import { SOURCE_PROFILES } from './routing'

export interface SourceTrustScore {
  slug: string
  name: string
  overallTrust: number // 0-100
  factors: {
    quality: number     // 0-100 from SOURCE_QUALITY
    delivery: number    // 0-100 based on avgDeliveryDays
    returns: number     // 0-100 based on returnPolicy
    dataFreshness: number // 0-100 placeholder for future
  }
  trustLevel: 'high' | 'medium' | 'low'
  badges: string[]
}

export function computeSourceTrust(slug: string): SourceTrustScore {
  const profile = SOURCE_PROFILES[slug]
  if (!profile) {
    return {
      slug, name: slug, overallTrust: 50,
      factors: { quality: 50, delivery: 50, returns: 50, dataFreshness: 50 },
      trustLevel: 'medium', badges: [],
    }
  }

  const quality = Math.round(profile.quality * 100)
  const delivery = profile.avgDeliveryDays
    ? Math.round(Math.max(0, 100 - (profile.avgDeliveryDays - 1) * 8))
    : 50
  const returns = profile.returnPolicy === 'easy' ? 90
    : profile.returnPolicy === 'standard' ? 60
    : 30
  const dataFreshness = 70 // placeholder — will be computed from actual sync data

  const overallTrust = Math.round(quality * 0.4 + delivery * 0.2 + returns * 0.2 + dataFreshness * 0.2)

  const badges: string[] = []
  if (quality >= 90) badges.push('Fonte Premium')
  if (delivery >= 80) badges.push('Entrega Rápida')
  if (returns >= 80) badges.push('Devolução Fácil')
  if (overallTrust >= 80) badges.push('Alta Confiança')

  return {
    slug, name: profile.name, overallTrust,
    factors: { quality, delivery, returns, dataFreshness },
    trustLevel: overallTrust >= 75 ? 'high' : overallTrust >= 50 ? 'medium' : 'low',
    badges,
  }
}

export function getAllSourceTrust(): SourceTrustScore[] {
  return Object.keys(SOURCE_PROFILES).map(computeSourceTrust)
}
