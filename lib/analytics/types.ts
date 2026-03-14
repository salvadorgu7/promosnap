// Conversion analytics types — foundation for funnel tracking.

export interface ConversionEvent {
  type: 'view' | 'click' | 'clickout' | 'alert_created'
  productId: string
  offerId?: string
  timestamp: Date
  sessionId?: string
}

export interface ConversionFunnel {
  views: number
  clicks: number
  clickouts: number
  conversionRate: number
}

export type FunnelBySource = Record<string, ConversionFunnel>
