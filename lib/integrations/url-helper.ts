// ============================================
// INTEGRATIONS — URL Helper
// ============================================
// Returns all important integration URLs for the application.
// Used by admin pages to display and allow copying of endpoints.

import { getBaseUrl } from '@/lib/seo/url'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IntegrationUrl {
  key: string
  label: string
  url: string
  copyable: boolean
}

// ---------------------------------------------------------------------------
// URL builder
// ---------------------------------------------------------------------------

export function getIntegrationUrls(): IntegrationUrl[] {
  const base = getBaseUrl().replace(/\/+$/, '')

  return [
    {
      key: 'mlCallback',
      label: 'ML OAuth Callback',
      url: `${base}/api/auth/ml/callback`,
      copyable: true,
    },
    {
      key: 'cronEndpoint',
      label: 'Cron Endpoint',
      url: `${base}/api/cron`,
      copyable: true,
    },
    {
      key: 'sitemapUrl',
      label: 'Sitemap',
      url: `${base}/sitemap.xml`,
      copyable: true,
    },
    {
      key: 'robotsUrl',
      label: 'Robots.txt',
      url: `${base}/robots.txt`,
      copyable: true,
    },
    {
      key: 'healthUrl',
      label: 'Health Check',
      url: `${base}/api/health`,
      copyable: true,
    },
    {
      key: 'webhookBase',
      label: 'Webhooks Base',
      url: `${base}/api/webhooks`,
      copyable: true,
    },
  ]
}
