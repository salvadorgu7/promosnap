"use client"

import { Search, ArrowLeftRight, Bell, Filter, LayoutGrid } from "lucide-react"

interface FollowUpSuggestion {
  label: string
  query: string
  icon?: "search" | "compare" | "alert" | "filter" | "category"
}

const ICONS = {
  search: Search,
  compare: ArrowLeftRight,
  alert: Bell,
  filter: Filter,
  category: LayoutGrid,
}

export default function FollowUpChips({
  suggestions,
  onSelect,
}: {
  suggestions: FollowUpSuggestion[]
  onSelect: (query: string) => void
}) {
  if (!suggestions || suggestions.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {suggestions.map((s, i) => {
        const Icon = ICONS[s.icon || "search"]
        return (
          <button
            key={i}
            onClick={() => onSelect(s.query)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-brand-200 bg-brand-50/50 text-brand-600 text-xs font-medium hover:bg-brand-100 hover:border-brand-300 transition-colors"
          >
            <Icon className="w-3 h-3" />
            {s.label}
          </button>
        )
      })}
    </div>
  )
}
