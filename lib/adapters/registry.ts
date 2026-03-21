// Adapter Registry — manages all source adapters

import type { SourceAdapter, AdapterStatus } from './types'
import { AmazonSourceAdapter } from './amazon'
import { MercadoLivreSourceAdapter } from './mercadolivre'
import { ShopeeSourceAdapter } from './shopee'
import { SheinSourceAdapter } from './shein'
import { MagaluSourceAdapter } from './magalu'

// ---------------------------------------------------------------------------
// Singleton Registry
// ---------------------------------------------------------------------------

class AdapterRegistry {
  private adapters: Map<string, SourceAdapter> = new Map()

  constructor() {
    this.register(new AmazonSourceAdapter())
    this.register(new MercadoLivreSourceAdapter())
    this.register(new ShopeeSourceAdapter())
    this.register(new SheinSourceAdapter())
    this.register(new MagaluSourceAdapter())
  }

  /** Register a new adapter */
  register(adapter: SourceAdapter): void {
    this.adapters.set(adapter.slug, adapter)
  }

  /** Get adapter by slug */
  get(slug: string): SourceAdapter | undefined {
    return this.adapters.get(slug)
  }

  /** Get all registered adapters */
  getAll(): SourceAdapter[] {
    return Array.from(this.adapters.values())
  }

  /** Get only adapters that have all required env vars configured */
  getConfigured(): SourceAdapter[] {
    return this.getAll().filter((a) => a.isConfigured())
  }

  /** Get status for all adapters */
  getAllStatuses(): AdapterStatus[] {
    return this.getAll().map((a) => a.getStatus())
  }

  /** Get status summary for admin dashboard */
  getSummary(): {
    total: number
    configured: number
    unconfigured: number
    adapters: AdapterStatus[]
  } {
    const statuses = this.getAllStatuses()
    const configured = statuses.filter((s) => s.configured).length

    return {
      total: statuses.length,
      configured,
      unconfigured: statuses.length - configured,
      adapters: statuses,
    }
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

const globalForRegistry = globalThis as unknown as { adapterRegistry: AdapterRegistry | undefined }

export const adapterRegistry = globalForRegistry.adapterRegistry ?? new AdapterRegistry()

if (process.env.NODE_ENV !== 'production') {
  globalForRegistry.adapterRegistry = adapterRegistry
}
