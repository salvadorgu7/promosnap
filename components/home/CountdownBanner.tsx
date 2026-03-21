"use client"

import { useState, useEffect } from "react"
import { Clock, Zap } from "lucide-react"
import Link from "next/link"

interface Campaign {
  name: string
  endDate: string // ISO date
  slug: string
  color: string // Tailwind bg class
  description: string
}

/** Upcoming promotional campaigns */
const CAMPAIGNS: Campaign[] = [
  { name: "Dia das Mães", endDate: "2026-05-10T23:59:59", slug: "dia-das-maes", color: "from-pink-500 to-rose-600", description: "Presentes com até 50% OFF" },
  { name: "Dia dos Namorados", endDate: "2026-06-12T23:59:59", slug: "dia-dos-namorados", color: "from-red-500 to-pink-600", description: "Ofertas especiais para casais" },
  { name: "Black Friday", endDate: "2026-11-27T23:59:59", slug: "black-friday", color: "from-gray-900 to-gray-700", description: "Os maiores descontos do ano" },
  { name: "Prime Day", endDate: "2026-07-15T23:59:59", slug: "prime-day", color: "from-blue-600 to-indigo-700", description: "Ofertas exclusivas Amazon" },
]

function getNextCampaign(): Campaign | null {
  const now = new Date()
  // Show campaign if it's within 30 days
  const upcoming = CAMPAIGNS
    .filter(c => {
      const end = new Date(c.endDate)
      const diff = end.getTime() - now.getTime()
      return diff > 0 && diff < 30 * 86_400_000
    })
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())

  return upcoming[0] || null
}

function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, new Date(targetDate).getTime() - Date.now())
      setTimeLeft({
        days: Math.floor(diff / 86_400_000),
        hours: Math.floor((diff % 86_400_000) / 3_600_000),
        minutes: Math.floor((diff % 3_600_000) / 60_000),
        seconds: Math.floor((diff % 60_000) / 1000),
      })
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  return timeLeft
}

export default function CountdownBanner() {
  const campaign = getNextCampaign()
  if (!campaign) return null

  return <CountdownContent campaign={campaign} />
}

function CountdownContent({ campaign }: { campaign: Campaign }) {
  const { days, hours, minutes, seconds } = useCountdown(campaign.endDate)

  if (days <= 0 && hours <= 0 && minutes <= 0) return null

  return (
    <div className={`rounded-2xl bg-gradient-to-r ${campaign.color} text-white p-4 md:p-6 relative overflow-hidden`}>
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white" />
        <div className="absolute -left-5 -bottom-5 w-24 h-24 rounded-full bg-white" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1 text-center md:text-left">
          <div className="flex items-center gap-2 justify-center md:justify-start mb-1">
            <Zap className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider opacity-90">
              {campaign.name}
            </span>
          </div>
          <p className="text-lg md:text-xl font-bold">{campaign.description}</p>
        </div>

        {/* Countdown */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 opacity-70" />
          <div className="flex gap-1.5">
            {[
              { value: days, label: "d" },
              { value: hours, label: "h" },
              { value: minutes, label: "m" },
              { value: seconds, label: "s" },
            ].map(({ value, label }) => (
              <div key={label} className="bg-white/20 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-center min-w-[40px]">
                <span className="text-lg font-bold tabular-nums">{String(value).padStart(2, "0")}</span>
                <span className="text-[9px] uppercase opacity-70 ml-0.5">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <Link
          href={`/ofertas?campaign=${campaign.slug}`}
          className="px-5 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm font-semibold text-sm transition-colors whitespace-nowrap"
        >
          Ver ofertas
        </Link>
      </div>
    </div>
  )
}
