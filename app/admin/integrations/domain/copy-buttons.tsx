'use client'

import { useState } from 'react'
import { Copy, CheckCircle2 } from 'lucide-react'

interface UrlEntry {
  label: string
  url: string
}

export function CopyButtons({ urls }: { urls: UrlEntry[] }) {
  const [copied, setCopied] = useState<string | null>(null)

  async function handleCopy(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(url)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      // Fallback for non-secure contexts
      const textarea = document.createElement('textarea')
      textarea.value = url
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(url)
      setTimeout(() => setCopied(null), 2000)
    }
  }

  return (
    <div className="space-y-1">
      {urls.map((entry) => (
        <div
          key={entry.url}
          className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 group"
        >
          <div className="min-w-0 flex-1">
            <span className="text-xs text-text-muted block">{entry.label}</span>
            <span className="text-xs font-mono text-text-primary truncate block">
              {entry.url}
            </span>
          </div>
          <button
            onClick={() => handleCopy(entry.url)}
            className="ml-2 flex-shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title={`Copiar ${entry.label}`}
          >
            {copied === entry.url ? (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-600">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copiar</span>
              </>
            )}
          </button>
        </div>
      ))}
    </div>
  )
}
