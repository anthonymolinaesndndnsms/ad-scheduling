'use client'

import { Clock } from 'lucide-react'

export function DashboardHeader({ businessName }: { businessName: string }) {
  const now = new Date()
  const timeString = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  const dayString = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-blue-500" />
        <span className="text-sm text-zinc-400">{timeString}</span>
      </div>
      <h1 className="text-4xl font-bold text-white">{businessName}</h1>
      <p className="text-zinc-400">{dayString}</p>
    </div>
  )
}
