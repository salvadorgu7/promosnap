// Image CDN & Optimization Types

export type ImageType = 'product' | 'brand' | 'category' | 'article'

export interface ImageOptions {
  /** Desired width in pixels */
  width?: number
  /** Desired height in pixels */
  height?: number
  /** Image quality 1-100 (default: 80) */
  quality?: number
  /** Output format */
  format?: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto'
  /** Fit mode for resizing */
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
}

export interface ImageAuditEntry {
  id: string
  type: ImageType
  name: string
  slug: string
  imageUrl: string | null
  status: 'ok' | 'missing' | 'broken'
  error?: string
}

export interface ImageAuditResult {
  total: number
  missing: number
  broken: number
  report: ImageAuditEntry[]
}
