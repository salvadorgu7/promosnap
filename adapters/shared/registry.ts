import type { MarketplaceAdapter } from '@/types'
import { AmazonAdapter } from '../amazon'
import { MercadoLivreAdapter } from '../mercadolivre'
import { ShopeeAdapter } from '../shopee'
import { SheinAdapter } from '../shein'

const allAdapters: MarketplaceAdapter[] = [
  new AmazonAdapter(),
  new MercadoLivreAdapter(),
  new ShopeeAdapter(),
  new SheinAdapter(),
]

export function getEnabledAdapters(): MarketplaceAdapter[] {
  return allAdapters.filter((a) => a.isEnabled)
}

export function getAdapter(slug: string): MarketplaceAdapter | undefined {
  return allAdapters.find((a) => a.slug === slug)
}

export function getAllAdapters(): MarketplaceAdapter[] {
  return allAdapters
}
