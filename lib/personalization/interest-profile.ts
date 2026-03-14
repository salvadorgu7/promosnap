// ============================================
// SERVER-SIDE INTEREST PROFILE — Block 1 Personalization OS
// ============================================

import { inferSegment, type UserSignals, type UserSegment } from './segmentation'

export interface InterestProfile {
  segment: UserSegment
  topCategories: string[]
  topBrands: string[]
  engagementLevel: "new" | "casual" | "engaged" | "power"
  hasEnoughSignal: boolean
}

export function buildInterestProfile(signals: UserSignals): InterestProfile {
  const segment = inferSegment(signals)
  const totalSignals =
    signals.favorites.length +
    signals.searches.length +
    signals.recentCategories.length

  let engagementLevel: InterestProfile["engagementLevel"] = "new"
  if (totalSignals >= 20) engagementLevel = "power"
  else if (totalSignals >= 10) engagementLevel = "engaged"
  else if (totalSignals >= 3) engagementLevel = "casual"

  return {
    segment,
    topCategories: signals.recentCategories.slice(0, 5),
    topBrands: signals.recentBrands.slice(0, 5),
    engagementLevel,
    hasEnoughSignal: totalSignals >= 3,
  }
}
